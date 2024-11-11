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

let waitingPlayer = null; // Waiting player store
const activeRooms = {}; // Custom room tracking for active games

io.on("connection", (socket) => {
  console.log(socket.id + " is connected!");

  socket.on("start-new-game", (playerData) => {
    console.log("New Player:", playerData);
    playerData = { ...playerData, id: socket.id };
    socket.emit("player-data", playerData);

    if (waitingPlayer) {
      const roomName = `room-${waitingPlayer.id}-${socket.id}`;
      socket.join(roomName);
      waitingPlayer.socket.join(roomName);
      io.to(roomName).emit("message", `You are paired! Room: ${roomName}`);
      io.to(roomName).emit(
        "message",
        `${waitingPlayer.playerData.name} with ${playerData.name}`
      );
      // Store room and player details in activeRooms
      activeRooms[roomName] = {
        player1: waitingPlayer,
        player2: { id: socket.id, playerData, socket },
      };
      setTimeout(() => {
        io.to(roomName).emit("game-start", {
          player1: waitingPlayer.playerData,
          player2: playerData,
          room: roomName,
          currentPlayer: playerData,
        });
        waitingPlayer = null; // Clear waiting player
      }, 2000);
    } else {
      waitingPlayer = { id: socket.id, playerData, socket };
      socket.emit("message", "Waiting for another player...");
    }
  });

  socket.on("update", (num, game) => {
    io.to(game.room).emit("update", num, game);
  });

  socket.on("winner", (currentGame) => {
    let room = currentGame.room;
    io.to(room).emit("winner", currentGame);
    socket.leave(room);

    if (activeRooms[room]) {
      const { player1, player2 } = activeRooms[room];
      player1.socket.leave(room);
      player2.socket.leave(room);
      delete activeRooms[room];
    }
  });

  // Handle player disconnection
  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);

    if (waitingPlayer && waitingPlayer.id === socket.id) {
      waitingPlayer = null;
    } else {
      // Find the room where the disconnected player was in
      for (const roomName in activeRooms) {
        const { player1, player2 } = activeRooms[roomName];
        if (player1.id === socket.id || player2.id === socket.id) {
          const otherPlayer = player1.id === socket.id ? player2 : player1;

          // Notify and remove the other player from the room
          otherPlayer.socket.leave(roomName);
          otherPlayer.socket.emit(
            "message",
            "Your opponent disconnected. Waiting for a new player..."
          );

          // Set the remaining player as the waiting player
          waitingPlayer = {
            id: otherPlayer.id,
            playerData: otherPlayer.playerData,
            socket: otherPlayer.socket,
          };

          // Remove room from activeRooms
          delete activeRooms[roomName];
          break;
        }
      }
    }
  });
});

server.listen(PORT, () => {
  console.log("Server running on Port:", PORT);
});
