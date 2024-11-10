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
let isGameEnd = false;

let gameContainer = document.querySelector(".game-container");
let gameBox = document.querySelector(".game-box");
let player = document.querySelector(".player");

let playerBox = document.querySelector(".player-box");
let playerName = document.querySelector("#player-name");
let startBtn = document.querySelector(".start-btn");

let currentPlay = document.querySelector(".current-play");

const showStat = () => {
  let isPlayer1 = currentGame.player1.id === playerData.id;
  if (isPlayer1) {
    player.textContent =
      currentGame.currentPlayer.id === playerData.id
        ? "Your turn"
        : `${currentGame.player2.name} turn!`;
  } else {
    player.textContent =
      currentGame.currentPlayer.id === playerData.id
        ? "Your turn"
        : `${currentGame.player1.name} turn!`;
  }
  let myTurn = currentGame.currentPlayer.id === playerData.id;
  if (myTurn) {
    player.classList.add("animate");
  } else {
    player.classList.remove("animate");
  }

  currentPlay.innerHTML = "";
  let player1 = document.createElement("div");
  let player2 = document.createElement("div");
  player1.innerHTML = `<ul>
  <p style="padding-bottom: 10px;">Player 1:</p>
  <li style="font-size: 1rem;">${currentGame.player1.name}</li>
  <li style="font-size: 1.8rem;">${currentGame.player1.score}</li>
</ul>`;

  player2.innerHTML = `<ul>
  <p style="padding-bottom: 10px;">Player 2:</p> <!-- Corrected closing tag -->
  <li style="font-size: 1rem;">${currentGame.player2.name}</li>
  <li style="font-size: 1.8rem;">${currentGame.player2.score}</li>
</ul>`;

  currentPlay.append(player1, player2);
};

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

const checkPossibles = (arr) => {
  let result = bingoPairs.filter((item) =>
    item.every((x) => arr.some((inn) => inn.id === x && inn.isSelected))
  );
  currentGame.player1.id === playerData.id
    ? (currentGame.player1.score = result.length)
    : (currentGame.player2.score = result.length);

  showStat();
  if (result.length >= 5) {
    isGameEnd = true;
    socket.emit("winner", currentGame);
  }
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
    if (currentGame?.currentPlayer.id === playerData.id && !isGameEnd) {
      btn.style.cursor = "pointer";
      btn.addEventListener("click", () => {
        currentGame.player1.id === currentGame.currentPlayer.id
          ? (currentGame.currentPlayer = currentGame.player2)
          : (currentGame.currentPlayer = currentGame.player1);

        numberArr = numberArr.map((x) =>
          x.value === item.value ? { ...x, isSelected: true } : { ...x }
        );
        showArr(numberArr);
        checkPossibles(numberArr);
        socket.emit("update", item.value, currentGame);
      });
    }
    btn.disabled = !currentGame?.currentPlayer.id === playerData.id;
    btn.style.backgroundColor = item.isSelected ? "#D7003A" : "#0A9D58";
    gameBox.appendChild(btn);
  });
};

const startNewGame = () => {
  isGameEnd = false;
  clearBoard();
  numberArr = createNewArr();
  showArr(numberArr);
  showStat();
  checkPossibles(numberArr);
};

const start = () => {
  playerBox.classList.add("hidden");
  playerData = {
    //   id: 0,
    name: playerName.value || "vicky",
    score: 0,
  };
  socket.emit("player-name", playerData);
};

// start();
startBtn.addEventListener("click", () => {
  if (playerName.value !== "") {
    playerBox.classList.add("hidden");
    playerData = {
      //   id: 0,
      name: playerName.value || "vicky",
      score: 0,
    };
    socket.emit("player-name", playerData);
  }
});

socket.on("player-data", (data) => {
  playerData = data;
});

socket.on("winner", (gameData) => {
  currentGame = gameData;
  isGameEnd = true;
  showArr(numberArr);
  showStat();
  player.classList.remove("animate");
  player.innerHTML = "";
  let winnerData =
    gameData.player1.score >= 5 ? gameData.player1 : gameData.player2;
  //show winner details
  let newGame = document.createElement("button");
  newGame.classList.add("btn");
  newGame.textContent = "Play New Game";

  newGame.addEventListener("click", () => {
    socket.emit("start-new-game", { ...playerData, score: 0 });
  });
  let p = document.createElement("p");
  if (winnerData.id === playerData.id) {
    p.innerText = `You won the Game!`;
  } else {
    p.innerText = `${winnerData.name} won the Game!`;
  }
  player.append(p, newGame);
});

socket.on("game-start", (data) => {
  isGameEnd = false;
  currentGame = data;
  let messageBox = document.querySelector(".message-box");
  messageBox.classList.add("hidden");
  gameContainer.classList.remove("hidden");
  startNewGame();
});

socket.on("message", (data) => {
  let messageBox = document.querySelector(".message-box");
  messageBox.classList.remove("hidden");
  messageBox.textContent = data;
});

socket.on("update", (num, game) => {
  numberArr = numberArr.map((x) =>
    x.value === num ? { ...x, isSelected: true } : { ...x }
  );
  currentGame = game;
  checkPossibles(numberArr);
  showArr(numberArr);
});

socket.on("disconnect", () => {
  console.log("Disconnected from server");
});
