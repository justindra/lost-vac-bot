import { useEffect, useState } from "react";
import { Text, View, Pressable } from "react-native";
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
    <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
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
  const { gameOver, level, restartGame } = useGameOver();
  const router = useRouter();

  useEffect(() => {
    if (gameOver) {
      router.push({
        pathname: "/game-over" as any,
        params: { level: String(level) },
      });
    }
  }, [gameOver, level, router]);

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
          paddingVertical: spacing.md * 3,
          paddingLeft: spacing.md,
          justifyContent: "space-between",
        }}
      >
        <View style={{ alignItems: "center", gap: 8 }}>
          <BatteryIndicator />
          <Text
            style={{
              color: colors.main,
              fontSize: 14,
              fontFamily: fonts.main,
            }}
          >
            Score: {level - 1}
          </Text>
        </View>
        <Pressable
          onPress={restartGame}
          style={({ pressed }) => ({
            borderWidth: 1,
            borderColor: colors.main,
            paddingHorizontal: 12,
            paddingVertical: 6,
            opacity: pressed ? 0.6 : 1,
          })}
        >
          <Text
            style={{
              color: colors.main,
              fontSize: 12,
              fontFamily: fonts.main,
            }}
          >
            RESTART
          </Text>
        </Pressable>
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
