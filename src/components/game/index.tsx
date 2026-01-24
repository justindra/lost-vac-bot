import { useCallback, useMemo, useRef, useState } from "react";
import {
  useSharedValue,
  useFrameCallback,
  withTiming,
  runOnJS,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
import { useAudioPlayer } from "expo-audio";
import { GameContext } from "./context";
import { generateMaze } from "@/src/maze/generate";
import { resolveCollisions } from "@/src/maze/collision";
import {
  PLAYER_RADIUS,
  FOG_INITIAL_RADIUS,
  FOG_MIN_RADIUS,
  BATTERY_DRAIN_RATE,
  STARTING_BATTERY,
} from "@/src/maze/constants";
import type { MazeData, MazeLocation } from "@/src/maze/types";

const SPEED = 3;
const EXIT_THRESHOLD = PLAYER_RADIUS; // Distance to trigger exit
const FLASH_DURATION = 400; // ms
const COUNTDOWN_DURATION = 3000; // ms — matches countdown-start.mp3 length

// Audio sources
const countdownSound = require("@/assets/sounds/countdown-start.mp3");
const gameOverSound = require("@/assets/sounds/game-over.mp3");
const levelUpSound = require("@/assets/sounds/level-up.mp3");

export const GameProvider: React.FC<React.PropsWithChildren> = ({
  children,
}) => {
  const joystickX = useSharedValue(0);
  const joystickY = useSharedValue(0);
  const playerX = useSharedValue(0);
  const playerY = useSharedValue(0);

  const [canvasSize, setCanvasSizeState] = useState({ width: 0, height: 0 });
  const [mazeData, setMazeData] = useState<MazeData | null>(null);

  // Shared values for worklet access to maze wall data
  const wallsFlat = useSharedValue<number[]>([]);
  const wallCount = useSharedValue(0);

  // Exit position shared values (for worklet access)
  const exitX = useSharedValue(0);
  const exitY = useSharedValue(0);

  // Transition state
  const transitioning = useSharedValue(false);
  const flashOpacity = useSharedValue(0);

  // Battery & fog of war state
  const battery = useSharedValue(STARTING_BATTERY);
  const fogRadius = useSharedValue(FOG_INITIAL_RADIUS);
  const fogOpacity = useSharedValue(1);
  const [gameOver, setGameOver] = useState(false);
  const [level, setLevel] = useState(1);

  // Coverage tracking: cells visited in current maze and cumulative score
  const [visitedCells, setVisitedCells] = useState<Set<number>>(new Set());
  const [score, setScore] = useState(0);
  // Shared values for worklet access to maze grid info
  const mazeOffsetX = useSharedValue(0);
  const mazeOffsetY = useSharedValue(0);
  const mazeCols = useSharedValue(0);
  const mazeCellSize = useSharedValue(0);
  // Track last visited cell index to avoid redundant callbacks
  const lastCellIndex = useSharedValue(-1);

  // Audio players
  const countdownPlayer = useAudioPlayer(countdownSound);
  const gameOverPlayer = useAudioPlayer(gameOverSound);
  const levelUpPlayer = useAudioPlayer(levelUpSound);

  const [countdownActive, setCountdownActive] = useState(false);

  // Store canvas size in a ref so regenerateMaze always has the latest
  const canvasSizeRef = useRef({ width: 0, height: 0 });

  // Track the last exit location so the next maze starts there
  const lastExitLocation = useRef<MazeLocation | undefined>(undefined);

  // Callback to mark a cell as visited (called from worklet via scheduleOnRN)
  const markCellVisited = useCallback((cellIndex: number) => {
    setVisitedCells((prev) => {
      if (prev.has(cellIndex)) return prev;
      const next = new Set(prev);
      next.add(cellIndex);
      setScore((s) => s + 1);
      return next;
    });
  }, []);

  // Start the countdown sequence: show full map, animate fog closed, block movement
  const startCountdown = useCallback(() => {
    // Make fog overlay invisible and radius full (so gradient covers entire screen)
    fogOpacity.value = 0;
    fogRadius.value = FOG_INITIAL_RADIUS;
    // Block movement
    transitioning.value = true;
    setCountdownActive(true);

    // Play countdown audio
    countdownPlayer.seekTo(0);
    countdownPlayer.play();

    // Animate both: fog fades in AND radius shrinks to battery-appropriate level
    fogOpacity.value = withTiming(1, { duration: COUNTDOWN_DURATION });
    const targetFogRadius =
      FOG_MIN_RADIUS +
      (FOG_INITIAL_RADIUS - FOG_MIN_RADIUS) * (battery.value / 100);
    fogRadius.value = withTiming(targetFogRadius, {
      duration: COUNTDOWN_DURATION,
    });

    // After countdown completes, unblock movement
    setTimeout(() => {
      transitioning.value = false;
      setCountdownActive(false);
    }, COUNTDOWN_DURATION);
  }, [fogOpacity, fogRadius, transitioning, battery, countdownPlayer]);

  const regenerateMaze = useCallback(() => {
    const { width, height } = canvasSizeRef.current;
    if (width === 0 || height === 0) return;

    // Play level-up sound
    levelUpPlayer.seekTo(0);
    levelUpPlayer.play();

    // Trigger flash animation
    flashOpacity.value = 1;
    flashOpacity.value = withTiming(0, { duration: FLASH_DURATION });

    // Generate new maze, starting where the previous exit was
    const maze = generateMaze(width, height, lastExitLocation.current);
    setMazeData(maze);
    lastExitLocation.current = maze.exitLocation;

    // Update shared values for worklet
    wallsFlat.value = maze.wallsFlat;
    wallCount.value = maze.wallCount;
    exitX.value = maze.exit.x;
    exitY.value = maze.exit.y;
    mazeOffsetX.value = maze.offsetX;
    mazeOffsetY.value = maze.offsetY;
    mazeCols.value = maze.cols;
    mazeCellSize.value = maze.cellSize;
    lastCellIndex.value = -1;

    // Reset player to new start
    playerX.value = maze.start.x;
    playerY.value = maze.start.y;

    // Reset visited cells for new maze
    setVisitedCells(new Set());

    // Increment level counter
    setLevel((l) => l + 1);

    // After flash completes, start the countdown sequence
    setTimeout(() => {
      startCountdown();
    }, FLASH_DURATION);
  }, [
    flashOpacity,
    wallsFlat,
    wallCount,
    exitX,
    exitY,
    mazeOffsetX,
    mazeOffsetY,
    mazeCols,
    mazeCellSize,
    lastCellIndex,
    playerX,
    playerY,
    levelUpPlayer,
    startCountdown,
  ]);

  const setCanvasSize = useCallback(
    (size: { width: number; height: number }) => {
      // Only generate maze once (first layout)
      if (canvasSizeRef.current.width > 0 && canvasSizeRef.current.height > 0)
        return;

      setCanvasSizeState(size);
      canvasSizeRef.current = size;

      const maze = generateMaze(size.width, size.height);
      setMazeData(maze);
      lastExitLocation.current = maze.exitLocation;

      // Set shared values for worklet access
      wallsFlat.value = maze.wallsFlat;
      wallCount.value = maze.wallCount;
      exitX.value = maze.exit.x;
      exitY.value = maze.exit.y;
      mazeOffsetX.value = maze.offsetX;
      mazeOffsetY.value = maze.offsetY;
      mazeCols.value = maze.cols;
      mazeCellSize.value = maze.cellSize;
      lastCellIndex.value = -1;

      // Set player start position
      playerX.value = maze.start.x;
      playerY.value = maze.start.y;

      // Start countdown on first level
      startCountdown();
    },
    [
      wallsFlat,
      wallCount,
      exitX,
      exitY,
      mazeOffsetX,
      mazeOffsetY,
      mazeCols,
      mazeCellSize,
      lastCellIndex,
      playerX,
      playerY,
      startCountdown,
    ],
  );

  const handleGameOver = useCallback(() => {
    // Play game-over sound, then trigger navigation when it completes
    gameOverPlayer.seekTo(0);
    gameOverPlayer.play();
    setGameOver(true);
  }, [gameOverPlayer]);

  const restartGame = useCallback(() => {
    setGameOver(false);
    setLevel(1);
    setScore(0);
    setVisitedCells(new Set());
    battery.value = STARTING_BATTERY;
    fogRadius.value = FOG_INITIAL_RADIUS;
    lastExitLocation.current = undefined;
    transitioning.value = false;

    const { width, height } = canvasSizeRef.current;
    if (width === 0 || height === 0) return;

    const maze = generateMaze(width, height);
    setMazeData(maze);
    lastExitLocation.current = maze.exitLocation;

    wallsFlat.value = maze.wallsFlat;
    wallCount.value = maze.wallCount;
    exitX.value = maze.exit.x;
    exitY.value = maze.exit.y;
    mazeOffsetX.value = maze.offsetX;
    mazeOffsetY.value = maze.offsetY;
    mazeCols.value = maze.cols;
    mazeCellSize.value = maze.cellSize;
    lastCellIndex.value = -1;
    playerX.value = maze.start.x;
    playerY.value = maze.start.y;

    // Start countdown on the fresh maze
    startCountdown();
  }, [
    battery,
    fogRadius,
    transitioning,
    wallsFlat,
    wallCount,
    exitX,
    exitY,
    mazeOffsetX,
    mazeOffsetY,
    mazeCols,
    mazeCellSize,
    lastCellIndex,
    playerX,
    playerY,
    startCountdown,
  ]);

  useFrameCallback((frameInfo) => {
    "worklet";
    const dt = frameInfo.timeSincePreviousFrame ?? 16.67;
    const dtRatio = dt / 16.67;

    // Skip if no maze loaded yet or transitioning
    if (wallCount.value === 0) return;
    if (transitioning.value) return;

    // Compute intended position
    const newX = playerX.value + joystickX.value * SPEED * dtRatio;
    const newY = playerY.value + joystickY.value * SPEED * dtRatio;

    // Resolve collisions with maze walls
    const resolved = resolveCollisions(
      newX,
      newY,
      wallsFlat.value,
      wallCount.value,
    );

    playerX.value = resolved[0];
    playerY.value = resolved[1];

    // Track cell coverage
    if (mazeCellSize.value > 0) {
      const col = Math.floor(
        (playerX.value - mazeOffsetX.value) / mazeCellSize.value,
      );
      const row = Math.floor(
        (playerY.value - mazeOffsetY.value) / mazeCellSize.value,
      );
      if (col >= 0 && col < mazeCols.value && row >= 0) {
        const cellIndex = row * mazeCols.value + col;
        if (cellIndex !== lastCellIndex.value) {
          lastCellIndex.value = cellIndex;
          scheduleOnRN(markCellVisited, cellIndex);
        }
      }
    }

    // Drain battery and derive fog radius
    battery.value = Math.max(
      0,
      battery.value - BATTERY_DRAIN_RATE * (dt / 1000),
    );
    fogRadius.value =
      FOG_MIN_RADIUS +
      (FOG_INITIAL_RADIUS - FOG_MIN_RADIUS) * (battery.value / 100);

    // Check for game over (battery depleted)
    if (battery.value <= 0) {
      transitioning.value = true;
      runOnJS(handleGameOver)();
      return;
    }

    // Check if player reached the exit
    const dx = playerX.value - exitX.value;
    const dy = playerY.value - exitY.value;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < EXIT_THRESHOLD) {
      transitioning.value = true;
      runOnJS(regenerateMaze)();
    }
  });

  const contextValue = useMemo(
    () => ({
      joystickX,
      joystickY,
      playerX,
      playerY,
      mazeData,
      canvasSize,
      setCanvasSize,
      flashOpacity,
      fogRadius,
      fogOpacity,
      battery,
      gameOver,
      restartGame,
      level,
      score,
      visitedCells,
      countdownActive,
    }),
    [
      joystickX,
      joystickY,
      playerX,
      playerY,
      mazeData,
      canvasSize,
      setCanvasSize,
      flashOpacity,
      fogRadius,
      fogOpacity,
      battery,
      gameOver,
      restartGame,
      level,
      score,
      visitedCells,
      countdownActive,
    ],
  );

  return (
    <GameContext.Provider value={contextValue}>{children}</GameContext.Provider>
  );
};

export * from "./hooks";
