export const DIRECTIONS = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};

export const DEFAULT_CONFIG = {
  gridSize: 21,
  startLength: 3,
  tickMs: 140,
};

export function createRng(seed = Date.now()) {
  let value = seed % 2147483647;
  if (value <= 0) value += 2147483646;
  return () => {
    value = (value * 16807) % 2147483647;
    return (value - 1) / 2147483646;
  };
}

export function createInitialState(config = DEFAULT_CONFIG, rng = Math.random) {
  const mid = Math.floor(config.gridSize / 2);
  const snake = [];
  for (let i = 0; i < config.startLength; i += 1) {
    snake.push({ x: mid - i, y: mid });
  }
  const food = placeFood(config.gridSize, snake, rng);

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

export function isOpposite(a, b) {
  return a.x + b.x === 0 && a.y + b.y === 0;
}

export function setDirection(state, dir) {
  if (!dir || isOpposite(state.dir, dir)) return state;
  return { ...state, nextDir: dir };
}

export function stepState(state, rng = Math.random) {
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

export function placeFood(gridSize, snake, rng = Math.random) {
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
