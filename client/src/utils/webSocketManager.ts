import { MessageType } from "../types/enums";

type Message = {
  type: string;
  [key: string]: any;
};

type Listener = (data: any) => void;

export const createWebSocketManager = (roomId: string, player: string) => {
  const listeners: { [key: string]: Listener[] } = {};
  let connectionListeners: Listener[] = [];
  let socket: WebSocket | null = null;
  let isConnected = false;
  const maxRetries = 5;
  let retryCount = 0;
  const maxDelay = 5000;

  const onConnectionChange = (callback: Listener) => {
    connectionListeners.push(callback);
  };

  const emitConnectionChange = () => {
    connectionListeners.forEach((callback) => callback(isConnected));
  };

  const connect = () => {
    if (socket) {
      socket.close();
    }

    socket = new WebSocket(
      `ws://localhost:8000/v1/ws/rooms/${roomId}/ws?player=${player}`
    );

    socket.onopen = () => {
      isConnected = true;
      retryCount = 0;
      send({ type: "REJOIN", player, roomId });
      emitConnectionChange();
    };

    socket.onclose = (event) => {
      isConnected = false;
      console.warn("WebSocket connection closed:", event.reason);
      emitConnectionChange();
      if (retryCount < maxRetries) {
        retryCount++;
        const delay = Math.min(1000 * retryCount, maxDelay);
        console.log(
          `Retrying connection (${retryCount}/${maxRetries}) in ${
            delay / 1000
          }s...`
        );
        setTimeout(connect, delay);
      } else {
        console.error(
          "Max retries reached. Could not establish WebSocket connection."
        );
      }
    };

    socket.onerror = (error) => {
      console.error("WebSocket error:", error);
    };

    socket.onmessage = (event) => {
      console.log("Received message:", event.data);
      const message: Message = JSON.parse(event.data);
      if (listeners[message.type]) {
        console.log("Message type:", message.type);
        listeners[message.type].forEach((callback) => callback(message));
      }

      if (message.type === MessageType.ALL_MEALS_SUBMITTED.valueOf()) {
        console.log("All meals submitted. Closing WebSocket connection.");
        socket?.close();
        isConnected = false;
        emitConnectionChange();
      }
    };
  };

  const send = (message: Message) => {
    if (isConnected && socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify(message));
    } else {
      console.error("WebSocket is closed or not open.");
    }
  };

  connect();

  return {
    send,
    on: (type: string, callback: Listener) => {
      if (!listeners[type]) {
        listeners[type] = [];
      }
      listeners[type].push(callback);
    },
    off: (type: string, callback: Listener) => {
      if (!listeners[type]) return;
      listeners[type] = listeners[type].filter(
        (listener) => listener !== callback
      );
    },
    close: () => {
      if (socket) {
        socket.close();
        isConnected = false;
        emitConnectionChange();
      }
    },
    isConnected: () => isConnected,
    onConnectionChange,
  };
};
