import { LayoutChangeEvent, StyleSheet, View } from "react-native";
import {
  Canvas,
  Circle,
  Rect,
  vec,
  RadialGradient,
  Group,
} from "@shopify/react-native-skia";
import { useDerivedValue } from "react-native-reanimated";
import {
  usePlayer,
  useMaze,
  useCanvasSize,
  useFlash,
  useFog,
  useVisitedCells,
  usePowerUps,
} from "../game";
import { PLAYER_RADIUS } from "@/src/maze/constants";
import { colors } from "@/src/styles";
import { Maze } from "./maze";
import { CleanedCells } from "./cleaned-cells";

const PLAYER_COLOR = colors.main;
const EXIT_SIZE = PLAYER_RADIUS * 2;
const EXIT_COLOR = colors.main;

// Battery power-up dimensions
const BATTERY_WIDTH = 12;
const BATTERY_HEIGHT = 18;
const BATTERY_TERMINAL_WIDTH = 6;
const BATTERY_TERMINAL_HEIGHT = 3;

const GameScreen: React.FC = () => {
  const { playerX, playerY } = usePlayer();
  const mazeData = useMaze();
  const visitedCells = useVisitedCells();
  const { canvasSize, setCanvasSize } = useCanvasSize();
  const flashOpacity = useFlash();
  const { fogRadius, fogOpacity } = useFog();
  const { powerUps, powerUpsCollected } = usePowerUps();

  const handleLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setCanvasSize({ width, height });
  };

  const cx = useDerivedValue(() => playerX.value);
  const cy = useDerivedValue(() => playerY.value);
  const flashAlpha = useDerivedValue(() => flashOpacity.value);
  const fogCenter = useDerivedValue(() => vec(playerX.value, playerY.value));
  const fogR = useDerivedValue(() => fogRadius.value);
  const fogAlpha = useDerivedValue(() => fogOpacity.value);

  return (
    <View
      style={{
        flex: 1,
        width: "100%",
        height: "100%",
      }}
      onLayout={handleLayout}
    >
      {canvasSize.width > 0 && canvasSize.height > 0 && mazeData && (
        <Canvas style={StyleSheet.absoluteFill}>
          {/* Cleaned cells overlay (rendered behind everything) */}
          <CleanedCells visitedCells={visitedCells} mazeData={mazeData} />
          {/* Exit marker (rendered behind player) */}
          <Rect
            x={mazeData.exit.x - EXIT_SIZE / 2}
            y={mazeData.exit.y - EXIT_SIZE / 2}
            width={EXIT_SIZE}
            height={EXIT_SIZE}
            color={EXIT_COLOR}
          />
          {/* Battery power-ups */}
          {powerUps.map((pu, i) =>
            !powerUpsCollected[i] ? (
              <Group key={i}>
                {/* Battery body */}
                <Rect
                  x={pu.x - BATTERY_WIDTH / 2}
                  y={pu.y - BATTERY_HEIGHT / 2 + BATTERY_TERMINAL_HEIGHT / 2}
                  width={BATTERY_WIDTH}
                  height={BATTERY_HEIGHT}
                  color={colors.main}
                />
                {/* Battery terminal (top nub) */}
                <Rect
                  x={pu.x - BATTERY_TERMINAL_WIDTH / 2}
                  y={pu.y - BATTERY_HEIGHT / 2 - BATTERY_TERMINAL_HEIGHT / 2}
                  width={BATTERY_TERMINAL_WIDTH}
                  height={BATTERY_TERMINAL_HEIGHT}
                  color={colors.main}
                />
              </Group>
            ) : null,
          )}
          {/* Maze walls */}
          <Maze walls={mazeData.walls} />
          {/* Player */}
          <Circle cx={cx} cy={cy} r={PLAYER_RADIUS} color={PLAYER_COLOR} />
          {/* Fog of war overlay */}
          <Rect
            x={0}
            y={0}
            width={canvasSize.width}
            height={canvasSize.height}
            opacity={fogAlpha}
          >
            <RadialGradient
              c={fogCenter}
              r={fogR}
              colors={["transparent", "transparent", "black"]}
              positions={[0, 0.7, 1]}
            />
          </Rect>
          {/* Flash overlay on level transition */}
          <Rect
            x={0}
            y={0}
            width={canvasSize.width}
            height={canvasSize.height}
            color={colors.main}
            opacity={flashAlpha}
          />
        </Canvas>
      )}
    </View>
  );
};

export default GameScreen;
