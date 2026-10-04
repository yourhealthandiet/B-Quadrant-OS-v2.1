import express from "express";
import { createServer as createViteServer } from "vite";
import { Server } from "socket.io";
import http from "http";
import path from "path";

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" }
});
const PORT = 3000;

app.use(express.json());

// In-memory store for rooms
const rooms: Record<string, any> = {};

io.on("connection", (socket) => {
  let currentRoom: string | null = null;

  const updateRoomCount = (roomId: string) => {
    const clients = io.sockets.adapter.rooms.get(roomId);
    const count = clients ? clients.size : 0;
    io.to(roomId).emit("room_status", { roomId, peerCount: count });
  };

  socket.on("join_room", (roomId: string) => {
    if (!roomId) return;
    if (currentRoom && currentRoom !== roomId) {
      socket.leave(currentRoom);
      updateRoomCount(currentRoom);
    }
    currentRoom = roomId;
    socket.join(roomId);
    console.log(`User ${socket.id} joined room ${roomId}`);
    updateRoomCount(roomId);

    // If server already has snapshot for this room, emit immediately to the new joiner
    if (rooms[roomId]) {
      socket.emit("sync_data", { data: rooms[roomId], timestamp: Date.now(), fromServerCache: true });
    } else {
      // Ask other peers in the room to share their state if they have it
      socket.to(roomId).emit("request_peer_data", { requestedBy: socket.id });
    }
  });

  socket.on("request_room_data", (roomId: string) => {
    if (!roomId) return;
    if (rooms[roomId]) {
      socket.emit("sync_data", { data: rooms[roomId], timestamp: Date.now(), fromServerCache: true });
    } else {
      socket.to(roomId).emit("request_peer_data", { requestedBy: socket.id });
    }
  });

  socket.on("update_data", ({ roomId, data, sourceId }: { roomId: string, data: any, sourceId?: string }) => {
    if (!roomId || !data) return;
    const cleanRoom = roomId.trim();
    rooms[cleanRoom] = { data, updatedAt: Date.now() };
    // Broadcast to everyone else in the room
    socket.to(cleanRoom).emit("sync_data", { data, timestamp: Date.now(), sourceId });
    socket.emit("sync_ack", { success: true, timestamp: Date.now(), peerCount: io.sockets.adapter.rooms.get(cleanRoom)?.size || 1 });
  });

  socket.on("disconnecting", () => {
    for (const room of socket.rooms) {
      if (room !== socket.id) {
        setTimeout(() => updateRoomCount(room), 100);
      }
    }
  });

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
  });
});

async function startServer() {
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Dedicated HTTP sync fallback endpoints for cross-device sharing
  app.get("/api/sync/:roomId", (req, res) => {
    const roomId = (req.params.roomId || "").trim();
    if (!roomId) {
      return res.status(400).json({ error: "Missing roomId" });
    }
    const record = rooms[roomId];
    if (record) {
      return res.json({ success: true, data: record.data, updatedAt: record.updatedAt, found: true });
    }
    return res.json({ success: true, data: null, found: false });
  });

  app.post("/api/sync/:roomId", (req, res) => {
    const roomId = (req.params.roomId || "").trim();
    const body = req.body;
    if (!roomId || !body) {
      return res.status(400).json({ error: "Missing roomId or data" });
    }
    const incomingData = body.data || body;
    rooms[roomId] = { data: incomingData, updatedAt: Date.now() };
    
    // Also notify any socket connections in that room!
    io.to(roomId).emit("sync_data", { data: incomingData, timestamp: Date.now(), fromHttp: true });
    
    const count = io.sockets.adapter.rooms.get(roomId)?.size || 0;
    return res.json({ success: true, timestamp: Date.now(), peerCount: count });
  });

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*all', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  server.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
