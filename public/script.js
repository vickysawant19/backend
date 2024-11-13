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

let playerBox = document.querySelector(".player-box");
let playerName = document.querySelector("#player-name");
let startBtn = document.querySelector(".start-btn");

let gameContainer = document.querySelector(".game-container");
let gameBox = document.querySelector(".game-box");
let player = document.querySelector(".player");

let currentPlay = document.querySelector(".current-play");

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
    // showTimer(10);
    player.classList.add("animate");
  } else {
    // hideTimer();
    player.classList.remove("animate");
  }
};

const showStat = () => {
  // show whoes turn
  showWhosTurn();
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

const checkPossibles = (arr) => {
  let result = bingoPairs.filter((item) =>
    item.every((x) => arr.some((inn) => inn.id === x && inn.isSelected))
  );
  currentGame.player1.id === playerData.id
    ? (currentGame.player1.score = result.length)
    : (currentGame.player2.score = result.length);

  showStat();
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

        checkPossibles(numberArr);
        showArr(numberArr);
        showWhosTurn();

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

const getPlayerData = () => {
  gameContainer.classList.add("hidden");
  playerBox.classList.remove("hidden");

  startBtn.addEventListener("click", () => {
    if (playerName.value !== "") {
      playerBox.classList.add("hidden");
      playerData = {
        //   id: 0,
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
  socket.emit("show-all-players", "");
});

//start new game request from server
socket.on("start-new-game", (data) => {
  socket.emit("start-new-game", data);
});

//start-game request if found new user after waiting
socket.on("game-start", (data) => {
  let messageBox = document.querySelector(".message-box");
  messageBox.classList.add("hidden");
  isGameEnd = false;
  currentGame = data;
  gameContainer.classList.remove("hidden");
  startNewGame();
});

//winner declare
socket.on("winner", (gameData) => {
  currentGame = gameData;
  isGameEnd = true;
  showArr(numberArr);
  showStat();
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

  newGame.addEventListener("click", () => {
    socket.emit("start-new-game", { ...playerData, score: 0 });
  });
  player.append(p, newGame);
});

//show message came from server
socket.on("message", (data) => {
  gameContainer.classList.add("hidden");
  let messageBox = document.querySelector(".message-box");
  messageBox.classList.remove("hidden");
  messageBox.textContent = data;
});

socket.on("update-board", (number, game) => {
  numberArr = numberArr.map((x) =>
    x.value === number ? { ...x, isSelected: true } : { ...x }
  );
  currentGame = game;
  showArr(numberArr);
  showWhosTurn();
  checkPossibles(numberArr);
  socket.emit("update-game-data", currentGame);
});

socket.on("update-game-data", (data) => {
  currentGame = data;
  showStat();
  let score1 = currentGame.player1.score;
  let score2 = currentGame.player2.score;
  if (score1 >= 5 || score2 >= 5) {
    isGameEnd = true;
    socket.emit("winner", currentGame);
  }
});

socket.on("calculate", (numberArr) => {
  checkPossibles(numberArr);
});

socket.on("show-all-players", (data) => {
  console.log("all playerss", data);
});

//handle disconnects
socket.on("disconnect", () => {
  console.log("Disconnected from server");
});
