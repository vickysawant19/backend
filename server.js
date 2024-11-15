import express from "express";
import { fileURLToPath } from "url";
import path, { dirname } from "path";
import http from "http";
import { Server } from "socket.io";

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  // cors: [],
});

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

let players = [];

io.on("connection", (socket) => {
  console.log(socket.id + " is connected!");
  //send online users data
  io.emit("online-users", players);

  socket.on("start-new-game", (playerData) => {
    playerData = {
      ...playerData,
      id: socket.id,
      isWaiting: false,
      room: null,
    };
    socket.emit("player-data", playerData); //update player data with socket id on client
    let alredyPresent = players.find((item) => item.id === socket.id);
    if (!alredyPresent) {
      players.push(playerData);
    }

    let waitingPlayerData = players.find(
      (player) => player.id !== socket.id && player.isWaiting
    ); //get first waiting player

    if (waitingPlayerData) {
      const roomName = `room-${waitingPlayerData.id}-${socket.id}`;
      socket.join(roomName);
      io.sockets.sockets.get(waitingPlayerData.id).join(roomName);
      players = players.map((player) =>
        player.id === socket.id || player.id === waitingPlayerData.id
          ? { ...player, isWaiting: false, room: roomName }
          : player
      );

      io.to(roomName).emit(
        "message",
        `${waitingPlayerData.name} with ${playerData.name}`
      );
      //send online users data
      io.emit("online-users", players);

      setTimeout(() => {
        io.to(roomName).emit("game-start", {
          player1: waitingPlayerData,
          player2: playerData,
          room: roomName,
          currentPlayer: playerData,
        });
      }, 1000);
    } else {
      players = players.map((player) =>
        player.id === socket.id ? { ...player, isWaiting: true } : player
      );
      //send online users data
      io.emit("online-users", players);
      socket.emit("message", "Waiting for another player...");
    }
  });

  //update other player data
  socket.on("update-other-player", (number, game, data, boardBtnDisabled) => {
    io.to(data.id).emit("update-board", number, game, boardBtnDisabled);
  });

  socket.on("update-game-data", (data) => {
    io.to(data.room).emit("update-game-data", data);
  });

  socket.on("winner", (currentGame) => {
    let room = currentGame.room;
    io.to(room).emit("winner", currentGame);
    socket.leave(room);
    let otherPlayer = players.find(
      (player) => player.room === room && player.id !== socket.id
    );

    if (otherPlayer) {
      io.sockets.sockets.get(otherPlayer.id).leave(room);
    }
    //update players room
    players = players.map((player) =>
      player.room === room
        ? { ...player, room: null, isWaiting: false }
        : player
    );
    io.emit("online-users", players);
  });

  //handle message
  socket.on("send-message", (msg, senderId, room) => {
    io.to(room).emit("received-message", msg, senderId);
  });

  // Handle player disconnection
  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
    let playerInfo = players.find((player) => player.id === socket.id);
    if (playerInfo?.room) {
      let otherPlayer = players.find(
        (player) => player.id !== socket.id && player.room === playerInfo.room
      );

      if (otherPlayer && otherPlayer.id) {
        players = players.map((play) =>
          play.id === otherPlayer.id
            ? { ...play, isWaiting: true, room: null }
            : play
        );
        io.sockets.sockets.get(otherPlayer.id).leave(playerInfo.room);
        io.sockets.sockets
          .get(otherPlayer.id)
          .emit(
            "message",
            "Your opponent disconnected. Waiting for a new player..."
          );
        setTimeout(() => {
          io.sockets.sockets
            .get(otherPlayer.id)
            ?.emit("start-new-game", otherPlayer);
        }, 2000);
      }
    }
    players = players.filter((item) => item.id !== socket.id);
    //send online users data
    io.emit("online-users", players);
  });
});

server.listen(PORT, () => {
  console.log("Server running on Port:", PORT);
});
