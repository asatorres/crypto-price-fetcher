import WebSocket from "ws";
import { RECONNECT_INTERVAL, WEBSOCKET_URL } from "../constants";
import { getCachedPairs, updatePrice } from "./tradingPairs";

let ws: WebSocket | null = null;
let currentSubscriptions = new Set<string>();
let reconnectAttempts = 0;
let heartbeatTimeout: NodeJS.Timeout;
const HEARTBEAT_INTERVAL = 60000; // 1 minute

/**
 * Initializes and manages a WebSocket connection.
 * Connects to the WebSocket URL and subscribes to trading pairs for updates.
 */
export const initWebSocket = () => {
  /**
   * Establishes a WebSocket connection and sets up event listeners.
   */
  function connect() {
    // Initialize WebSocket connection
    ws = new WebSocket(WEBSOCKET_URL);

    // Event listener for successful WebSocket connection
    ws.on("open", onOpen);

    // Event listener for incoming WebSocket messages
    ws.on("message", onMessage);

    // Event listener for WebSocket errors
    ws.on("error", onError);

    // Event listener for WebSocket connection closure
    ws.on("close", onClose);
  }

  function onOpen() {
    console.log("WebSocket connection opened.");
    reconnectAttempts = 0;
    currentSubscriptions.clear();
    const tradingPairs = getCachedPairs();
    tradingPairs.forEach((pair) => {
      const pairKey = `${pair.from_pair}~${pair.to_pair}`;
      ws?.send(
        JSON.stringify({
          action: "SubAdd",
          subs: [`5~CCCAGG~${pairKey}T`],
        })
      );
      currentSubscriptions.add(pairKey);
    });
    console.log("Initial WebSocket subscriptions set.");

    // Start the heartbeat mechanism
    startHeartbeat();
  }

  function onMessage(data: WebSocket.Data) {
    const message = JSON.parse(data.toString());
    if (message.TYPE === "999") {
      // Heartbeat message
      console.log("HEARTBEAT RECEIVED!");
      resetHeartbeat();
    } else {
      updatePrice(data);
    }
  }

  function onError(error: Error) {
    console.error("WebSocket error:", error);
    if (ws) {
      ws.close();
    }
  }

  function onClose() {
    console.log("WebSocket connection closed. Attempting to reconnect...");
    clearTimeout(heartbeatTimeout); // Stop heartbeat
    const timeout = Math.min(
      RECONNECT_INTERVAL * Math.pow(2, reconnectAttempts),
      30000
    ); // Exponential backoff with a maximum wait time of 30 seconds
    reconnectAttempts++;
    setTimeout(connect, timeout);
  }

  function startHeartbeat() {
    heartbeatTimeout = setTimeout(() => {
      console.log("No heartbeat received, reconnecting...");
      if (ws) {
        ws.close();
      }
    }, HEARTBEAT_INTERVAL + 10000); // 10 seconds grace period
  }

  function resetHeartbeat() {
    clearTimeout(heartbeatTimeout);
    startHeartbeat();
  }

  // Initiate the WebSocket connection
  connect();
};

/**
 * Function to update WebSocket subscriptions
 */
export const updateWebSocketSubscriptions = async () => {
  if (!ws || ws.readyState !== WebSocket.OPEN) {
    console.log("WebSocket is not open. Cannot update subscriptions.");
    return;
  }

  const newPairs = getCachedPairs();
  const newSubs = new Set(newPairs.map((p) => `${p.from_pair}~${p.to_pair}`));

  // Unsubscribe from pairs no longer active
  currentSubscriptions.forEach((sub) => {
    if (!newSubs.has(sub)) {
      ws?.send(
        JSON.stringify({
          action: "SubRemove",
          subs: [`5~CCCAGG~${sub}`],
        })
      );
    }
  });

  // Subscribe to new pairs
  newPairs.forEach((pair) => {
    const pairKey = `${pair.from_pair}~${pair.to_pair}`;
    if (!currentSubscriptions.has(pairKey)) {
      ws?.send(
        JSON.stringify({
          action: "SubAdd",
          subs: [`5~CCCAGG~${pairKey}`],
        })
      );
    }
  });

  // Update the current subscriptions set
  currentSubscriptions = newSubs;
  console.log("WebSocket subscriptions updated.");
};
