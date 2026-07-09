import { WebSocketServer, WebSocket } from "ws";
import type { IncomingMessage } from "http";
import type { Desk } from "@workspace/db";

let wss: WebSocketServer | null = null;

export function initWebSocketServer(wssInstance: WebSocketServer): void {
  wss = wssInstance;

  wss.on("connection", (ws: WebSocket, req: IncomingMessage) => {
    const url = req.url ?? "";
    if (!url.startsWith("/api/ws")) {
      ws.close();
      return;
    }

    ws.on("error", () => {
      // ignore client errors
    });

    // Send current desks on connect
    ws.send(JSON.stringify({ type: "connected", message: "WebSocket connected" }));
  });
}

export function broadcastDeskUpdate(desk: Desk): void {
  if (!wss) return;
  const message = JSON.stringify({ type: "desk_updated", desk });
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
}

export function broadcastDesksReset(desks: Desk[]): void {
  if (!wss) return;
  const message = JSON.stringify({ type: "desks_reset", desks });
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
}
