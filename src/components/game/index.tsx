import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  useSharedValue,
  useFrameCallback,
  withTiming,
  runOnJS,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
import { useAudioPlayer } from "expo-audio";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { GameContext } from "./context";
import { generateMaze } from "@/src/maze/generate";
import { resolveCollisions } from "@/src/maze/collision";
import {
  PLAYER_RADIUS,
  FOG_INITIAL_RADIUS,
  FOG_MIN_RADIUS,
  BATTERY_DRAIN_RATE,
  STARTING_BATTERY,
  BATTERY_POWERUP_VALUE,
  BATTERY_LOW_THRESHOLD,
  BATTERY_POWERUP_RADIUS,
  BATTERY_HIGH_THRESHOLD,
  PLAYER_MAX_SPEED,
} from "@/src/maze/constants";
import type { MazeData, MazeLocation } from "@/src/maze/types";

const EXIT_THRESHOLD = PLAYER_RADIUS; // Distance to trigger exit
const FLASH_DURATION = 400; // ms
const COUNTDOWN_DURATION = 3000; // ms — matches countdown-start.mp3 length

const HIGH_SCORE_KEY = "lost-vac-bot-high-score";

// Audio sources
const countdownSound = require("@/assets/sounds/countdown-start.mp3");
const gameOverSound = require("@/assets/sounds/game-over.mp3");
const levelUpSound = require("@/assets/sounds/level-up.mp3");
const powerUpSound = require("@/assets/sounds/power-up.mp3");
const backgroundMusic = require("@/assets/sounds/background.mp3");

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
  const [highScore, setHighScore] = useState(0);
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
  const powerUpPlayer = useAudioPlayer(powerUpSound);
  const bgMusicPlayer = useAudioPlayer(backgroundMusic);

  // Configure background music
  useEffect(() => {
    bgMusicPlayer.loop = true;
    bgMusicPlayer.volume = 0.3;
  }, [bgMusicPlayer]);

  // Load high score from storage on mount
  useEffect(() => {
    const loadHighScore = async () => {
      try {
        const stored = await AsyncStorage.getItem(HIGH_SCORE_KEY);
        if (stored !== null) {
          setHighScore(parseInt(stored, 10));
        }
      } catch (error) {
        console.warn("Failed to load high score:", error);
      }
    };
    loadHighScore();
  }, []);

  const [countdownActive, setCountdownActive] = useState(false);

  // Power-up state
  const [powerUpsCollected, setPowerUpsCollected] = useState<boolean[]>([]);
  // Shared values for worklet: flat array [x1, y1, x2, y2, ...] and collected flags
  const powerUpsFlat = useSharedValue<number[]>([]);
  const powerUpsCount = useSharedValue(0);
  const powerUpsCollectedSV = useSharedValue<boolean[]>([]);

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

  // Callback when a power-up is collected (called from worklet via runOnJS)
  const collectPowerUp = useCallback(
    (index: number) => {
      setPowerUpsCollected((prev) => {
        if (prev[index]) return prev;
        const next = [...prev];
        next[index] = true;
        return next;
      });
      powerUpPlayer.seekTo(0);
      powerUpPlayer.play();
    },
    [powerUpPlayer],
  );

  // Determine how many power-ups to place based on level and battery
  const getPowerUpCount = useCallback((currentBattery: number) => {
    if (currentBattery > BATTERY_HIGH_THRESHOLD) return 0;
    return currentBattery < BATTERY_LOW_THRESHOLD ? 2 : 1;
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

    // Start background music
    bgMusicPlayer.play();

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
  }, [
    fogOpacity,
    fogRadius,
    transitioning,
    battery,
    countdownPlayer,
    bgMusicPlayer,
  ]);

  const regenerateMaze = useCallback(() => {
    const { width, height } = canvasSizeRef.current;
    if (width === 0 || height === 0) return;

    // Play level-up sound
    levelUpPlayer.seekTo(0);
    levelUpPlayer.play();

    // Trigger flash animation
    flashOpacity.value = 1;
    flashOpacity.value = withTiming(0, { duration: FLASH_DURATION });

    // Determine power-up count for the next level
    const puCount = getPowerUpCount(battery.value);

    // Generate new maze, starting where the previous exit was
    const maze = generateMaze(width, height, lastExitLocation.current, puCount);
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

    // Set up power-up shared values for worklet
    const puFlat: number[] = [];
    for (const pu of maze.powerUps) {
      puFlat.push(pu.x, pu.y);
    }
    powerUpsFlat.value = puFlat;
    powerUpsCount.value = maze.powerUps.length;
    powerUpsCollectedSV.value = maze.powerUps.map(() => false);
    setPowerUpsCollected(maze.powerUps.map(() => false));

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
    level,
    battery,
    getPowerUpCount,
    powerUpsFlat,
    powerUpsCount,
    powerUpsCollectedSV,
  ]);

  const setCanvasSize = useCallback(
    (size: { width: number; height: number }) => {
      // Only generate maze once (first layout)
      if (canvasSizeRef.current.width > 0 && canvasSizeRef.current.height > 0)
        return;

      setCanvasSizeState(size);
      canvasSizeRef.current = size;

      // Level 1: no power-ups (min level is 3)
      const maze = generateMaze(size.width, size.height, "center", 0);
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

      // No power-ups on level 1
      powerUpsFlat.value = [];
      powerUpsCount.value = 0;
      powerUpsCollectedSV.value = [];
      setPowerUpsCollected([]);

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
      powerUpsFlat,
      powerUpsCount,
      powerUpsCollectedSV,
    ],
  );

  const handleGameOver = useCallback(async () => {
    // Stop background music
    bgMusicPlayer.pause();

    // Play game-over sound, then trigger navigation when it completes
    gameOverPlayer.seekTo(0);
    gameOverPlayer.play();

    // Update high score if current score is higher
    if (score > highScore) {
      setHighScore(score);
      try {
        await AsyncStorage.setItem(HIGH_SCORE_KEY, score.toString());
      } catch (error) {
        console.warn("Failed to save high score:", error);
      }
    }

    setGameOver(true);
  }, [gameOverPlayer, bgMusicPlayer, score, highScore]);

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

    // Level 1 restart: no power-ups
    const maze = generateMaze(width, height, "center", 0);
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

    // Reset power-ups
    powerUpsFlat.value = [];
    powerUpsCount.value = 0;
    powerUpsCollectedSV.value = [];
    setPowerUpsCollected([]);

    // Reset background music volume (in case it was modified)
    bgMusicPlayer.volume = 0.3;

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
    powerUpsFlat,
    powerUpsCount,
    powerUpsCollectedSV,
    bgMusicPlayer,
  ]);

  useFrameCallback((frameInfo) => {
    "worklet";
    const dt = frameInfo.timeSincePreviousFrame ?? 16.67;
    const dtRatio = dt / 16.67;

    // Skip if no maze loaded yet or transitioning
    if (wallCount.value === 0) return;
    if (transitioning.value) return;

    // Compute intended position
    const newX = playerX.value + joystickX.value * PLAYER_MAX_SPEED * dtRatio;
    const newY = playerY.value + joystickY.value * PLAYER_MAX_SPEED * dtRatio;

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

    // Check for power-up pickups
    for (let i = 0; i < powerUpsCount.value; i++) {
      if (!powerUpsCollectedSV.value[i]) {
        const puX = powerUpsFlat.value[i * 2];
        const puY = powerUpsFlat.value[i * 2 + 1];
        const pdx = playerX.value - puX;
        const pdy = playerY.value - puY;
        const pDist = Math.sqrt(pdx * pdx + pdy * pdy);
        if (pDist < BATTERY_POWERUP_RADIUS + PLAYER_RADIUS) {
          // Mark as collected in shared value (for worklet)
          const newCollected = [...powerUpsCollectedSV.value];
          newCollected[i] = true;
          powerUpsCollectedSV.value = newCollected;
          // Add battery (capped at 100)
          battery.value = Math.min(100, battery.value + BATTERY_POWERUP_VALUE);
          // Notify JS thread for state update and sound
          runOnJS(collectPowerUp)(i);
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
      highScore,
      visitedCells,
      countdownActive,
      powerUpsCollected,
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
      highScore,
      visitedCells,
      countdownActive,
      powerUpsCollected,
    ],
  );

  return (
    <GameContext.Provider value={contextValue}>{children}</GameContext.Provider>
  );
};

export * from "./hooks";
