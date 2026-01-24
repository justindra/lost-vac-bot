import { LayoutChangeEvent, StyleSheet, View } from "react-native";
import {
  Canvas,
  Circle,
  Rect,
  vec,
  RadialGradient,
} from "@shopify/react-native-skia";
import { useDerivedValue } from "react-native-reanimated";
import { usePlayer, useMaze, useCanvasSize, useFlash, useFog } from "../game";
import { PLAYER_RADIUS } from "@/src/maze/constants";
import { colors } from "@/src/styles";
import { Maze } from "./maze";

const PLAYER_COLOR = colors.main;
const EXIT_SIZE = PLAYER_RADIUS * 2;
const EXIT_COLOR = colors.main;

const GameScreen: React.FC = () => {
  const { playerX, playerY } = usePlayer();
  const mazeData = useMaze();
  const { canvasSize, setCanvasSize } = useCanvasSize();
  const flashOpacity = useFlash();
  const fogRadius = useFog();

  const handleLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setCanvasSize({ width, height });
  };

  const cx = useDerivedValue(() => playerX.value);
  const cy = useDerivedValue(() => playerY.value);
  const flashAlpha = useDerivedValue(() => flashOpacity.value);
  const fogCenter = useDerivedValue(() => vec(playerX.value, playerY.value));
  const fogR = useDerivedValue(() => fogRadius.value);

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
          {/* Exit marker (rendered behind player) */}
          <Rect
            x={mazeData.exit.x - EXIT_SIZE / 2}
            y={mazeData.exit.y - EXIT_SIZE / 2}
            width={EXIT_SIZE}
            height={EXIT_SIZE}
            color={EXIT_COLOR}
          />
          {/* Maze walls */}
          <Maze walls={mazeData.walls} />
          {/* Player */}
          <Circle cx={cx} cy={cy} r={PLAYER_RADIUS} color={PLAYER_COLOR} />
          {/* Fog of war overlay */}
          <Rect x={0} y={0} width={canvasSize.width} height={canvasSize.height}>
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
