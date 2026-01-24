import { StyleSheet } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from "react-native-reanimated";
import { useJoystick } from "./game/hooks";

const KNOB_RATIO = 0.4;
const JOYSTICK_SIZE = 100;

const radius = JOYSTICK_SIZE / 2;
const knobSize = JOYSTICK_SIZE * KNOB_RATIO;

export const Joystick: React.FC = () => {
  const { joystickX, joystickY } = useJoystick();

  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);

  const panGesture = Gesture.Pan()
    .onUpdate((event) => {
      "worklet";
      const dx = event.translationX;
      const dy = event.translationY;
      const distance = Math.sqrt(dx * dx + dy * dy);
      const maxOffset = radius - knobSize / 2;

      let clampedX: number;
      let clampedY: number;

      if (distance > maxOffset) {
        const angle = Math.atan2(dy, dx);
        clampedX = Math.cos(angle) * maxOffset;
        clampedY = Math.sin(angle) * maxOffset;
      } else {
        clampedX = dx;
        clampedY = dy;
      }

      translateX.value = clampedX;
      translateY.value = clampedY;

      const normalizedX = clampedX / maxOffset;
      const normalizedY = clampedY / maxOffset;

      joystickX.value = normalizedX;
      joystickY.value = normalizedY;
    })
    .onEnd(() => {
      "worklet";
      translateX.value = withSpring(0, { damping: 15, stiffness: 200 });
      translateY.value = withSpring(0, { damping: 15, stiffness: 200 });

      joystickX.value = 0;
      joystickY.value = 0;
    });

  const knobStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
    ],
  }));

  return (
    <GestureDetector gesture={panGesture}>
      <Animated.View
        style={[
          styles.pad,
          {
            width: JOYSTICK_SIZE,
            height: JOYSTICK_SIZE,
            borderRadius: radius,
          },
        ]}
      >
        <Animated.View
          style={[
            styles.knob,
            {
              width: knobSize,
              height: knobSize,
              borderRadius: knobSize / 2,
            },
            knobStyle,
          ]}
        />
      </Animated.View>
    </GestureDetector>
  );
};

const styles = StyleSheet.create({
  pad: {
    backgroundColor: "rgba(0, 255, 0, 0.1)",
    borderWidth: 2,
    borderColor: "rgba(0, 255, 0, 0.3)",
    justifyContent: "center",
    alignItems: "center",
  },
  knob: {
    backgroundColor: "rgba(0, 255, 0, 0.6)",
  },
});
