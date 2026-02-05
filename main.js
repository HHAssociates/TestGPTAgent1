const DIRECTIONS = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};

const DEFAULT_CONFIG = {
  gridSize: 21,
  startLength: 3,
  tickMs: 140,
};

function createRng(seed = Date.now()) {
  let value = seed % 2147483647;
  if (value <= 0) value += 2147483646;
  return () => {
    value = (value * 16807) % 2147483647;
    return (value - 1) / 2147483646;
  };
}

function createInitialState(config = DEFAULT_CONFIG, rng = Math.random) {
  const mid = Math.floor(config.gridSize / 2);
  const snake = [];
  for (let i = 0; i < config.startLength; i += 1) {
    snake.push({ x: mid - i, y: mid });
  }
  const easyFood = { x: mid + 2, y: mid };
  const food = snake.some((s) => s.x === easyFood.x && s.y === easyFood.y)
    ? placeFood(config.gridSize, snake, rng)
    : easyFood;

  return {
    gridSize: config.gridSize,
    snake,
    dir: DIRECTIONS.right,
    nextDir: DIRECTIONS.right,
    food,
    score: 0,
    alive: true,
    paused: false,
  };
}

function isOpposite(a, b) {
  return a.x + b.x === 0 && a.y + b.y === 0;
}

function setDirection(state, dir) {
  if (!dir || isOpposite(state.dir, dir)) return state;
  return { ...state, nextDir: dir };
}

function stepState(state, rng = Math.random) {
  if (!state.alive || state.paused) return state;

  const dir = state.nextDir ?? state.dir;
  const head = state.snake[0];
  const nextHead = { x: head.x + dir.x, y: head.y + dir.y };

  const hitsWall =
    nextHead.x < 0 ||
    nextHead.y < 0 ||
    nextHead.x >= state.gridSize ||
    nextHead.y >= state.gridSize;

  const willEat =
    state.food && nextHead.x === state.food.x && nextHead.y === state.food.y;

  const bodyToCheck = willEat
    ? state.snake
    : state.snake.slice(0, state.snake.length - 1);
  const hitsBody = bodyToCheck.some(
    (segment) => segment.x === nextHead.x && segment.y === nextHead.y
  );

  if (hitsWall || hitsBody) {
    return { ...state, alive: false };
  }

  let newSnake;
  let newFood = state.food;
  let newScore = state.score;

  if (willEat) {
    newSnake = [nextHead, ...state.snake];
    newScore += 1;
    newFood = placeFood(state.gridSize, newSnake, rng);
  } else {
    newSnake = [nextHead, ...state.snake.slice(0, -1)];
  }

  if (!newFood) {
    return { ...state, snake: newSnake, score: newScore, alive: false };
  }

  return {
    ...state,
    snake: newSnake,
    dir,
    nextDir: dir,
    food: newFood,
    score: newScore,
  };
}

function placeFood(gridSize, snake, rng = Math.random) {
  const occupied = new Set(snake.map((s) => `${s.x},${s.y}`));
  const open = [];
  for (let y = 0; y < gridSize; y += 1) {
    for (let x = 0; x < gridSize; x += 1) {
      const key = `${x},${y}`;
      if (!occupied.has(key)) open.push({ x, y });
    }
  }

  if (open.length === 0) return null;
  const index = Math.floor(rng() * open.length);
  return open[index];
}

const canvas = document.getElementById("board");
const scoreEl = document.getElementById("score");
const statusEl = document.getElementById("status");
const restartBtn = document.getElementById("restart");
const pauseBtn = document.getElementById("pause");

function fail(msg) {
  if (statusEl) statusEl.textContent = msg;
  throw new Error(msg);
}

if (!canvas) fail("Canvas missing");
const ctx = canvas.getContext("2d");
if (!ctx) fail("Canvas context missing");
if (statusEl) statusEl.textContent = "Loaded";

const config = { ...DEFAULT_CONFIG };
const rng = Math.random;
let state = createInitialState(config, rng);
let timerId = null;

const cell = canvas.width / config.gridSize;

function drawGrid() {
  ctx.lineWidth = 1;
  for (let i = 0; i <= config.gridSize; i += 1) {
    const pos = i * cell;
    ctx.strokeStyle = i % 2 === 0 ? "rgba(255, 230, 80, 0.4)" : "rgba(80, 255, 120, 0.35)";
    ctx.beginPath();
    ctx.moveTo(pos, 0);
    ctx.lineTo(pos, canvas.height);
    ctx.stroke();

    ctx.strokeStyle = i % 2 === 0 ? "rgba(80, 255, 120, 0.35)" : "rgba(255, 230, 80, 0.4)";
    ctx.beginPath();
    ctx.moveTo(0, pos);
    ctx.lineTo(canvas.width, pos);
    ctx.stroke();
  }
}

function render() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawGrid();

  const hue = (Date.now() / 10) % 360;
  const headColor = `hsl(${hue}, 95%, 60%)`;
  const bodyColor = `hsl(${(hue + 90) % 360}, 90%, 55%)`;
  const foodColor = `hsl(${(hue + 210) % 360}, 95%, 58%)`;

  if (state.food) {
    ctx.fillStyle = foodColor;
    ctx.fillRect(
      state.food.x * cell + 2,
      state.food.y * cell + 2,
      cell - 4,
      cell - 4
    );
  }

  state.snake.forEach((segment, index) => {
    ctx.fillStyle = index === 0 ? headColor : bodyColor;
    ctx.fillRect(
      segment.x * cell + 1,
      segment.y * cell + 1,
      cell - 2,
      cell - 2
    );
  });

  scoreEl.textContent = String(state.score);
  if (!state.alive) {
    statusEl.textContent = "Game Over";
  } else if (state.paused) {
    statusEl.textContent = "Paused";
  } else {
    statusEl.textContent = "Running";
  }
}

function tick() {
  state = stepState(state, rng);
  render();

  if (!state.alive) {
    stopLoop();
  }
}

function startLoop() {
  if (timerId) return;
  timerId = window.setInterval(tick, config.tickMs);
}

function stopLoop() {
  if (!timerId) return;
  window.clearInterval(timerId);
  timerId = null;
}

function togglePause() {
  if (!state.alive) return;
  state = { ...state, paused: !state.paused };
  if (state.paused) {
    stopLoop();
  } else {
    startLoop();
  }
  render();
}

function restart() {
  state = createInitialState(config, rng);
  render();
  stopLoop();
  startLoop();
}

function handleDirection(dir) {
  state = setDirection(state, dir);
}

window.addEventListener("keydown", (event) => {
  const key = event.key.toLowerCase();
  if (key === "arrowup" || key === "w") {
    handleDirection(DIRECTIONS.up);
  } else if (key === "arrowdown" || key === "s") {
    handleDirection(DIRECTIONS.down);
  } else if (key === "arrowleft" || key === "a") {
    handleDirection(DIRECTIONS.left);
  } else if (key === "arrowright" || key === "d") {
    handleDirection(DIRECTIONS.right);
  } else if (key === " ") {
    event.preventDefault();
    togglePause();
  } else if (key === "r") {
    restart();
  }
});

restartBtn.addEventListener("click", restart);
pauseBtn.addEventListener("click", togglePause);

document.querySelectorAll("[data-dir]").forEach((btn) => {
  btn.addEventListener("click", () => {
    const dir = btn.dataset.dir;
    if (dir && DIRECTIONS[dir]) handleDirection(DIRECTIONS[dir]);
  });
});

render();
startLoop();
