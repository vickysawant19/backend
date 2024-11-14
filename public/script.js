const socket = io("https://bingo-vs.up.railway.app");
// const socket = io("http://localhost:3000");

socket.on("connect", () => {
  console.log("Connected to server");
});

const bingoPairs = [
  [0, 1, 2, 3, 4],
  [5, 6, 7, 8, 9],
  [10, 11, 12, 13, 14],
  [15, 16, 17, 18, 19],
  [20, 21, 22, 23, 24],
  [0, 5, 10, 15, 20],
  [1, 6, 11, 16, 21],
  [2, 7, 12, 17, 22],
  [3, 8, 13, 18, 23],
  [4, 9, 14, 19, 24],
  [0, 6, 12, 18, 24],
  [4, 8, 12, 16, 20],
];

let numberArr = [];
let playerData = {};
let currentGame = {};
let onlineUsers = [];
let isGameEnd = false;

let playerBox = document.querySelector(".player-box");
let playerName = document.querySelector("#player-name");
let startBtn = document.querySelector(".start-btn");

let gameContainer = document.querySelector(".game-container");
let gameBox = document.querySelector(".game-box");
let player = document.querySelector(".player");
let currentPlay = document.querySelector(".current-play");

let block = document.querySelector(".block");

let onlineUserContainer = document.querySelector(".online-users");

let chatBox = document.querySelector(".chat-box");
let chatCloseBtn = document.querySelector(".close-btn");

let allChat = document.querySelector(".all-chat");
let chatMessage = document.querySelector("#chat-message");
let chatSendBtn = document.querySelector(".chat-send-btn");

chatCloseBtn.addEventListener("click", () => {
  chatBox.classList.toggle("close-chat");
  chatCloseBtn.textContent = chatBox.classList.contains("close-chat")
    ? "Chat"
    : "Close ❌";
});

chatSendBtn.addEventListener("click", () => {
  let msg = chatMessage.value;
  if (msg !== "") {
    chatMessage.value = "";
    let senderId = playerData.id;
    socket.emit("send-message", msg, senderId, currentGame.room);
  }
});

socket.on("received-message", (msg, senderId) => {
  chatBox.classList.remove("close-chat");
  chatCloseBtn.textContent = "Close ❌";
  let div = document.createElement("div");
  div.classList.add("message");
  let classname = senderId === playerData.id ? "sent" : "received";
  div.classList.add(classname);
  div.textContent = msg;
  allChat.appendChild(div);
  allChat.scrollTop = allChat.scrollHeight;
});

const createNewArr = () => {
  let arr = [...Array.from({ length: 25 })].map((_, index) => ({
    value: index + 1,
    isSelected: false,
  }));
  return arr
    .map((item) => ({ ...item, sort: Math.random() }))
    .sort((a, b) => a.sort - b.sort)
    .map(({ sort, ...item }, index) => ({ ...item, id: index }));
};

const showWhosTurn = () => {
  let myTurn = currentGame.currentPlayer.id === playerData.id;
  if (myTurn) {
    player.textContent = "Your turn";
    player.classList.add("animate");
  } else {
    player.textContent =
      currentGame.player1.id === playerData.id
        ? `${currentGame.player2.name} turn!`
        : `${currentGame.player1.name} turn!`;
    player.classList.remove("animate");
  }
};

const createStats = (name, score) => {
  let player = document.createElement("div");
  player.innerHTML = `<ul>
  <p style="padding-bottom: 10px;">Player 1:</p>
  <li style="font-size: 1rem;">${name}</li>
  <li style="font-size: 1.8rem;">${score}</li>
</ul>`;
  return player;
};

const showStat = () => {
  currentPlay.innerHTML = "";
  let elm1 = createStats(currentGame.player1.name, currentGame.player1.score);
  let elm2 = createStats(currentGame.player2.name, currentGame.player2.score);
  currentPlay.append(elm1, elm2);
};

const checkPossibles = (arr) => {
  let result = bingoPairs.filter((item) =>
    item.every((x) => arr.some((inn) => inn.id === x && inn.isSelected))
  );
  currentGame.player1.id === playerData.id
    ? (currentGame.player1.score = result.length)
    : (currentGame.player2.score = result.length);
};

const clearBoard = () => {
  gameBox.innerHTML = "";
};

const showArr = (numArr) => {
  clearBoard();
  numArr.forEach((item, index) => {
    let btn = document.createElement("button");
    btn.textContent = item.value;
    btn.classList.add("number-btn");
    btn.style.cursor = "auto";
    btn.disabled =
      !currentGame?.currentPlayer.id === playerData.id || item.isSelected;
    btn.style.backgroundColor = item.isSelected ? "#D7003A" : "#0A9D58";
    if (
      !item.isSelected &&
      currentGame?.currentPlayer.id === playerData.id &&
      !isGameEnd
    ) {
      btn.style.cursor = "pointer";
      btn.addEventListener("click", () => {
        block.classList.remove("hidden");
        currentGame.player1.id === currentGame.currentPlayer.id
          ? (currentGame.currentPlayer = currentGame.player2)
          : (currentGame.currentPlayer = currentGame.player1);
        numberArr = numberArr.map((x) =>
          x.value === item.value ? { ...x, isSelected: true } : { ...x }
        );
        updateUI(numberArr);
        let otherPlayer =
          currentGame.player1.id === playerData.id
            ? currentGame.player2
            : currentGame.player1;

        socket.emit(
          "update-other-player",
          item.value,
          currentGame,
          otherPlayer
        );
      });
    }

    gameBox.appendChild(btn);
  });
};

const updateUI = (numberArr) => {
  showStat();
  showWhosTurn();
  showArr(numberArr);
  checkPossibles(numberArr);
};

const startNewGame = () => {
  isGameEnd = false;
  numberArr = createNewArr();
  updateUI(numberArr);
};

const getPlayerData = () => {
  gameContainer.classList.add("hidden");
  playerBox.classList.remove("hidden");
  startBtn.addEventListener("click", () => {
    if (playerName.value !== "") {
      playerBox.classList.add("hidden");
      playerData = {
        name: playerName.value || "vicky",
        score: 0,
      };
      socket.emit("start-new-game", playerData);
    }
  });
};

getPlayerData();

//get updated Player Data from server
socket.on("player-data", (data) => {
  playerData = data;
});

//start new game request from server
socket.on("start-new-game", (data) => {
  socket.emit("start-new-game", data);
});

//start-game request if found new user after waiting
socket.on("game-start", (data) => {
  currentGame = data;
  let myTurn = currentGame.currentPlayer.id === playerData.id;
  if (!myTurn) {
    block.classList.remove("hidden");
  } else {
    block.classList.add("hidden");
  }

  let messageBox = document.querySelector(".message-box");
  messageBox.classList.add("hidden");
  isGameEnd = false;
  gameContainer.classList.remove("hidden");
  chatBox.classList.remove("hidden");
  startNewGame();
});

//winner declare
socket.on("winner", (gameData) => {
  currentGame = gameData;
  isGameEnd = true;
  updateUI(numberArr);
  chatBox.classList.add("hidden");
  player.classList.remove("animate");
  player.innerHTML = "";

  let player1Score = currentGame.player1.score;
  let player2Score = currentGame.player2.score;
  let message = null;
  if (player1Score === player2Score) {
    message = "Game Tie";
  }

  let winnerData =
    gameData.player1.score >= 5 ? gameData.player1 : gameData.player2;
  //show winner details
  let p = document.createElement("p");
  if (!message) {
    if (winnerData.id === playerData.id) {
      p.innerText = `You won the Game!`;
    } else {
      p.innerText = `${winnerData.name} won the Game!`;
    }
  } else {
    p.innerText = message;
  }

  //create new game btn
  let newGame = document.createElement("button");
  newGame.classList.add("btn");
  newGame.textContent = "Play New Game";
  block.classList.add("hidden");

  newGame.addEventListener("click", () => {
    socket.emit("start-new-game", { ...playerData, score: 0 });
  });
  player.append(p, newGame);
});

//show message came from server
socket.on("message", (data) => {
  gameContainer.classList.add("hidden");
  chatBox.classList.add("hidden");
  let messageBox = document.querySelector(".message-box");
  messageBox.classList.remove("hidden");
  messageBox.textContent = data;
});

socket.on("update-board", (number, game) => {
  numberArr = numberArr.map((x) =>
    x.value === number ? { ...x, isSelected: true } : { ...x }
  );
  currentGame = game;
  updateUI(numberArr);
  socket.emit("update-game-data", currentGame);
});

socket.on("update-game-data", (data) => {
  currentGame = data;
  let myTurn = currentGame.currentPlayer.id === playerData.id;
  if (!myTurn) {
    block.classList.remove("hidden");
  } else {
    block.classList.add("hidden");
  }
  showStat();
  let score1 = currentGame.player1.score;
  let score2 = currentGame.player2.score;
  if (score1 >= 5 || score2 >= 5) {
    isGameEnd = true;
    block.classList.remove("hidden");
    socket.emit("winner", currentGame);
  }
});

// show online users
socket.on("online-users", (data) => {
  if (Object.values(playerData).length > 0) {
    onlineUserContainer.classList.add("hidden");
    return;
  }
  onlineUserContainer.classList.remove("hidden");
  let h1tag = document.createElement("h1");
  h1tag.textContent = `Online Users: (${data.length})`;
  onlineUserContainer.innerHTML = "";
  onlineUserContainer.appendChild(h1tag);
  if (data && data.length > 0) {
    data.forEach((user) => {
      const userDiv = document.createElement("div");
      userDiv.classList.add("user-container");
      const nameElement = document.createElement("h1");
      nameElement.classList.add("user-name");
      nameElement.textContent = user.name || "Unnamed Player";
      const info = document.createElement("p");
      info.style.fontSize = "1rem";
      info.textContent = user.room ? "Playing..." : "Waiting...";
      userDiv.append(nameElement, info);
      onlineUserContainer.appendChild(userDiv);
    });
  } else {
    let messageTag = document.createElement("p");
    messageTag.style.marginTop = "10px";
    messageTag.textContent = "No users online";
    onlineUserContainer.appendChild(messageTag);
  }
});

//handle disconnects
socket.on("disconnect", () => {
  console.log("Disconnected from server");
});
