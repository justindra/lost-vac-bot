import { Text, View, Pressable } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useGameOver } from "../components/game";
import { colors } from "../styles";

export default function GameOverScreen() {
  const router = useRouter();
  const { level } = useLocalSearchParams<{ level: string }>();
  const { restartGame } = useGameOver();

  const mazesCompleted = Math.max(0, Number(level) - 1);

  const handleRestart = () => {
    restartGame();
    router.replace("/");
  };

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.background,
        alignItems: "center",
        justifyContent: "center",
        gap: 24,
      }}
    >
      <Text
        style={{
          color: colors.main,
          fontSize: 48,
          fontWeight: "bold",
          fontFamily: "monospace",
        }}
      >
        GAME OVER
      </Text>
      <Text
        style={{
          color: colors.main,
          fontSize: 20,
          fontFamily: "monospace",
        }}
      >
        Mazes completed: {mazesCompleted}
      </Text>
      <Pressable
        onPress={handleRestart}
        style={({ pressed }) => ({
          borderWidth: 2,
          borderColor: colors.main,
          paddingHorizontal: 24,
          paddingVertical: 12,
          marginTop: 16,
          opacity: pressed ? 0.6 : 1,
        })}
      >
        <Text
          style={{
            color: colors.main,
            fontSize: 24,
            fontFamily: "monospace",
            fontWeight: "bold",
          }}
        >
          RESTART
        </Text>
      </Pressable>
    </View>
  );
}
