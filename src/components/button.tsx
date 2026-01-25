import { Text, Pressable, StyleProp, ViewStyle } from "react-native";
import { colors, fonts } from "../styles";

interface ButtonProps {
  label: string;
  onPress: () => void;
  size?: "sm" | "md";
  style?: StyleProp<ViewStyle>;
}

export function Button({
  label,
  onPress,
  size = "md",
  style = {},
}: ButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        borderWidth: 2,
        borderColor: colors.main,
        paddingHorizontal: size === "sm" ? 12 : 24,
        paddingVertical: size === "sm" ? 8 : 12,
        opacity: pressed ? 0.6 : 1,
        ...(style as Object),
      })}
    >
      <Text
        style={{
          color: colors.main,
          fontSize: size === "sm" ? 12 : 24,
          fontFamily: fonts.main,
          fontWeight: size === "sm" ? "normal" : "bold",
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}
