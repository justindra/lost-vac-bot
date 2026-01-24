import { useState } from "react";
import { LayoutChangeEvent, StyleSheet, View } from "react-native";
import { Canvas, Circle } from "@shopify/react-native-skia";
import { useDerivedValue } from "react-native-reanimated";
import { usePlayer } from "../game";
import { colors } from "@/src/styles";

const PLAYER_RADIUS = 10;
const PLAYER_COLOR = colors.main;

const GameScreen: React.FC = () => {
  const { playerX, playerY } = usePlayer();
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });

  const handleLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setCanvasSize({ width, height });
  };

  const cx = useDerivedValue(() => canvasSize.width / 2 + playerX.value);
  const cy = useDerivedValue(() => canvasSize.height / 2 + playerY.value);

  return (
    <View
      style={{
        flex: 1,
        borderColor: colors.main,
        borderWidth: 1,
        width: "100%",
        height: "100%",
      }}
      onLayout={handleLayout}
    >
      {canvasSize.width > 0 && canvasSize.height > 0 && (
        <Canvas style={StyleSheet.absoluteFill}>
          <Circle cx={cx} cy={cy} r={PLAYER_RADIUS} color={PLAYER_COLOR} />
        </Canvas>
      )}
    </View>
  );
};

export default GameScreen;
