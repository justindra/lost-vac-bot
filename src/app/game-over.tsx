import { Text, View } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useGameOver } from "../components/game";
import { Button } from "../components/button";
import { colors, fonts } from "../styles";

export default function GameOverScreen() {
  const router = useRouter();
  const { level } = useLocalSearchParams<{ level: string }>();
  const { restartGame } = useGameOver();

  const mazesCompleted = Math.max(0, Number(level) - 1);

  const handleRestart = () => {
    restartGame();
    router.replace("/game");
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
          fontFamily: fonts.main,
        }}
      >
        GAME OVER
      </Text>
      <Text
        style={{
          color: colors.main,
          fontSize: 20,
          fontFamily: fonts.main,
        }}
      >
        Score: {mazesCompleted}
      </Text>
      <View style={{ marginTop: 16 }}>
        <Button label="RESTART" onPress={handleRestart} />
      </View>
    </View>
  );
}
