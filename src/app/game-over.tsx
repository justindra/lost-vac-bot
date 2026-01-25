import { Text, View } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useGameOver, useHighScore } from "../components/game";
import { Button } from "../components/button";
import { colors, fonts } from "../styles";

export default function GameOverScreen() {
  const router = useRouter();
  const { score } = useLocalSearchParams<{ score: string }>();
  const { restartGame } = useGameOver();
  const highScore = useHighScore();

  const finalScore = Math.max(0, Number(score));
  const isNewHighScore = finalScore >= highScore && finalScore > 0;

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
        Score: {finalScore}
      </Text>
      {isNewHighScore && (
        <Text
          style={{
            color: "#ffd700",
            fontSize: 24,
            fontWeight: "bold",
            fontFamily: fonts.main,
          }}
        >
          NEW HIGH SCORE!
        </Text>
      )}
      <Text
        style={{
          color: colors.main,
          fontSize: 16,
          fontFamily: fonts.main,
          opacity: 0.7,
        }}
      >
        Best: {highScore}
      </Text>
      <View style={{ marginTop: 16 }}>
        <Button label="RESTART" onPress={handleRestart} />
      </View>
    </View>
  );
}
