import express from "express";
import { fileURLToPath } from "url";
import path, { dirname } from "path";
import http from "http";
import { Server } from "socket.io";

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;
const _filename = fileURLToPath(import.meta.url);
const _dirname = dirname(_filename);

app.use(express.static("public"));
app.use(express.urlencoded({ extended: true }));

app.get("/", (req, res) => {
  return res.sendFile(path.join(_dirname, "/views/index.html"));
});

app.get("*", (req, res) => {
  return res.sendFile(path.join(_dirname, "/views/404.html"));
});

let waitingPlayer = null; // To store the waiting player temporarily

io.on("connection", (socket) => {
  console.log(socket.id + " is connected!");

  // When a player sends their name
  socket.on("player-name", (playerData) => {
    console.log("New Player:", playerData);

    playerData = { ...playerData, id: socket.id };

    socket.emit("player-data", playerData);

    // Check if there's a player already waiting
    if (waitingPlayer) {
      // Pair the new player with the waiting player
      const roomName = `room-${waitingPlayer.id}-${socket.id}`;

      // Join both players to the room
      socket.join(roomName);
      waitingPlayer.socket.join(roomName);

      // Notify both players
      io.to(roomName).emit("message", `You are paired! Room: ${roomName}`);

      // Notify players they're in a room with each other
      io.to(roomName).emit("game-start", {
        player1: waitingPlayer.playerData,
        player2: playerData,
        room: roomName,
        currentPlayer:
          Math.random() > 0.5 ? playerData : waitingPlayer.playerData,
      });

      // Clear waiting player
      waitingPlayer = null;
    } else {
      // If no players are waiting, set this player as the waiting player
      waitingPlayer = { id: socket.id, playerData, socket };
      socket.emit("message", "Waiting for another player...");
    }
  });

  // Handle the winner event and leave the room
  socket.on("winner", (currentGame) => {
    const rooms = Array.from(socket.rooms).filter((room) => room !== socket.id); // Get player's rooms

    rooms.forEach((room) => {
      // Broadcast winner to room and then disconnect both players from the room
      io.to(room).emit("winner", currentGame);

      // Remove both players from the room
      socket.leave(room);
      const otherPlayerSocket = io.sockets.adapter.rooms.get(room); // Get other player
      if (otherPlayerSocket) {
        otherPlayerSocket.forEach((playerId) =>
          io.sockets.sockets.get(playerId).leave(room)
        );
      }
    });
  });

  socket.on("start-new-game", (playerData) => {
    console.log("new game request", playerData);

    // Check if there's a player already waiting
    if (waitingPlayer) {
      // Pair the new player with the waiting player
      const roomName = `room-${waitingPlayer.id}-${socket.id}`;

      // Join both players to the room
      socket.join(roomName);
      waitingPlayer.socket.join(roomName);

      // Notify both players
      io.to(roomName).emit("message", `You are paired! Room: ${roomName}`);

      // Notify players they're in a room with each other
      io.to(roomName).emit("game-start", {
        player1: waitingPlayer.playerData,
        player2: playerData,
        room: roomName,
        currentPlayer: playerData,
      });

      // Clear waiting player
      waitingPlayer = null;
    } else {
      // If no players are waiting, set this player as the waiting player
      waitingPlayer = { id: socket.id, playerData, socket };
      socket.emit("message", "Waiting for another player...");
    }
  });

  socket.on("update", (num, game) => {
    // Broadcast update within the player's room only
    const rooms = Array.from(socket.rooms).filter((room) => room !== socket.id); // Get player's rooms
    rooms.forEach((room) => {
      io.to(room).emit("update", num, game);
    });
  });

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);

    // If the disconnected player was waiting, remove them from the waiting state
    if (waitingPlayer && waitingPlayer.id === socket.id) {
      waitingPlayer = null;
    }
  });
});

server.listen(PORT, () => {
  console.log("Server running on Port:", PORT);
});
