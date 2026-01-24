import { useEffect, useState } from "react";
import { Text, View } from "react-native";
import { useAnimatedReaction } from "react-native-reanimated";
import { useRouter } from "expo-router";
import { Joystick } from "../components/joystick";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { useBattery, useGameOver } from "../components/game";
import { GameScreenLoader } from "../components/game-screen";
import { colors, fonts, spacing } from "../styles";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { scheduleOnRN } from "react-native-worklets";
import { STARTING_BATTERY } from "../maze/constants";
import { Button } from "../components/button";

type BatteryIconName =
  | "battery-full"
  | "battery-three-quarters"
  | "battery-half"
  | "battery-quarter"
  | "battery-empty";

function getBatteryIcon(level: number): BatteryIconName {
  if (level > 75) return "battery-full";
  if (level > 50) return "battery-three-quarters";
  if (level > 25) return "battery-half";
  if (level > 5) return "battery-quarter";
  return "battery-empty";
}

function BatteryIndicator() {
  const battery = useBattery();
  const [displayLevel, setDisplayLevel] = useState(STARTING_BATTERY);

  useAnimatedReaction(
    () => Math.round(battery.value),
    (current) => {
      scheduleOnRN(setDisplayLevel, current);
    },
  );

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: spacing.md,
      }}
    >
      <FontAwesome
        name={getBatteryIcon(displayLevel)}
        size={24}
        color={colors.main}
      />
      <Text
        style={{ color: colors.main, fontSize: 12, fontFamily: fonts.main }}
      >
        {displayLevel}%
      </Text>
    </View>
  );
}

export default function GameScreen() {
  const { gameOver, score, restartGame } = useGameOver();
  const router = useRouter();

  useEffect(() => {
    if (gameOver) {
      router.push({
        pathname: "/game-over" as any,
        params: { score: String(score) },
      });
    }
  }, [gameOver, score, router]);

  return (
    <View
      style={{
        flex: 1,
        flexDirection: "row",
        justifyContent: "center",
        backgroundColor: colors.background,
      }}
    >
      {/* Left Panel */}
      <View
        style={{
          flex: 1,
          alignItems: "center",
          paddingVertical: spacing.xl,
          paddingLeft: spacing.md,
          justifyContent: "space-between",
        }}
      >
        <View style={{ alignItems: "center", gap: spacing.lg }}>
          <BatteryIndicator />
          <Text
            style={{
              color: colors.main,
              fontSize: 14,
              fontFamily: fonts.main,
            }}
          >
            Score: {score}
          </Text>
        </View>
        <Button onPress={restartGame} label="RESTART" size="sm" />
      </View>
      {/* Game Screen */}
      <View style={{ flex: 3, padding: spacing.md }}>
        <GameScreenLoader />
      </View>
      {/* Right Panel */}
      <GestureHandlerRootView>
        <View
          style={{ flex: 1, alignItems: "center", justifyContent: "center" }}
        >
          <Joystick />
        </View>
      </GestureHandlerRootView>
    </View>
  );
}
