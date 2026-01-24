import { Text, Pressable } from "react-native";
import { colors, fonts } from "../styles";

interface ButtonProps {
  label: string;
  onPress: () => void;
}

export function Button({ label, onPress }: ButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        borderWidth: 2,
        borderColor: colors.main,
        paddingHorizontal: 24,
        paddingVertical: 12,
        opacity: pressed ? 0.6 : 1,
      })}
    >
      <Text
        style={{
          color: colors.main,
          fontSize: 24,
          fontFamily: fonts.main,
          fontWeight: "bold",
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}
