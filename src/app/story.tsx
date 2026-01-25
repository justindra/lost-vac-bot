import { useEffect, useState, useRef } from "react";
import { Text, View, ScrollView, Animated } from "react-native";
import { useRouter } from "expo-router";
import { useAudioPlayer } from "expo-audio";
import { Button } from "../components/button";
import { colors, fonts, spacing } from "../styles";

// Audio files
const beepSound = require("@/assets/sounds/beep.mp3");
const typingSound = require("@/assets/sounds/typing.mp3");

const SYSTEM_LINE_COUNT = 4; // First 4 lines use beep sound

const STORY_LINES = [
  "> SYSTEM BOOT...",
  "> UNIT: VAC-BOT 3000",
  "> STATUS: LOST",
  "> BATTERY: 100%",
  "",
  "I'm a little vacuum bot.",
  "",
  "I've gotten lost in an endless maze.",
  "",
  "My mission: clean as many cells as possible while finding my way to the charging station.",
  "",
  "But my battery drains with every move... and with it, my ability to see.",
  "",
  "The darkness is closing in.",
  "",
  "How far can I go?",
];

const CHAR_DELAY = 50; // ms per character
const LINE_DELAY = 300; // extra delay after each line

export default function StoryScreen() {
  const router = useRouter();
  const scrollRef = useRef<ScrollView>(null);
  const [displayedText, setDisplayedText] = useState("");
  const [isComplete, setIsComplete] = useState(false);
  const [showCursor, setShowCursor] = useState(true);
  const buttonOpacity = useRef(new Animated.Value(0)).current;

  // Audio players
  const beepPlayer = useAudioPlayer(beepSound);
  const typingPlayer = useAudioPlayer(typingSound);

  // Cursor blink effect
  useEffect(() => {
    const cursorInterval = setInterval(() => {
      setShowCursor((prev) => !prev);
    }, 530);
    return () => clearInterval(cursorInterval);
  }, []);

  // Typing effect
  useEffect(() => {
    const fullText = STORY_LINES.join("\n");
    let charIndex = 0;
    let currentLineIndex = 0;
    let currentLineCharIndex = 0;
    let typingSoundStarted = false;

    const playBeep = () => {
      if (beepPlayer) {
        beepPlayer.seekTo(0);
        beepPlayer.play();
      }
    };

    const startTypingSound = () => {
      if (typingPlayer && !typingSoundStarted) {
        typingSoundStarted = true;
        typingPlayer.loop = true;
        typingPlayer.play();
      }
    };

    const typeChar = () => {
      if (charIndex < fullText.length) {
        const char = fullText[charIndex];

        // Play beep at the start of each system line (lines 0-3)
        if (
          currentLineCharIndex === 0 &&
          currentLineIndex < SYSTEM_LINE_COUNT
        ) {
          playBeep();
        }

        // Start typing sound when we reach the story section (line 4+)
        if (currentLineIndex >= SYSTEM_LINE_COUNT && !typingSoundStarted) {
          startTypingSound();
        }

        setDisplayedText(fullText.slice(0, charIndex + 1));
        charIndex++;

        // Track position within lines for delay calculation
        if (char === "\n") {
          currentLineIndex++;
          currentLineCharIndex = 0;
          // Longer delay at end of lines
          setTimeout(typeChar, LINE_DELAY);
        } else {
          currentLineCharIndex++;
          setTimeout(typeChar, CHAR_DELAY);
        }
      } else {
        // Typing complete
        setIsComplete(true);
        if (typingPlayer) {
          typingPlayer.pause();
        }
        // Fade in the button
        Animated.timing(buttonOpacity, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }).start();
      }
    };

    // Start typing after a brief delay
    const startDelay = setTimeout(typeChar, 500);

    return () => {
      clearTimeout(startDelay);
      if (typingPlayer) {
        typingPlayer.pause();
      }
    };
  }, []);

  // Auto-scroll as text appears
  useEffect(() => {
    scrollRef.current?.scrollToEnd({ animated: true });
  }, [displayedText]);

  const handleContinue = () => {
    router.replace("/game");
  };

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.background,
        paddingTop: 60,
        paddingBottom: 40,
        paddingHorizontal: spacing.xl,
      }}
    >
      <ScrollView
        ref={scrollRef}
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: spacing.xl }}
        showsVerticalScrollIndicator={false}
      >
        <Text
          style={{
            color: colors.main,
            fontSize: 14,
            fontFamily: fonts.main,
            lineHeight: 24,
          }}
        >
          {displayedText}
          {!isComplete && showCursor ? "_" : !isComplete ? " " : ""}
        </Text>
      </ScrollView>

      <Animated.View
        style={{
          opacity: buttonOpacity,
          alignItems: "center",
          paddingTop: spacing.xl,
        }}
      >
        <Button label="LET'S GO" onPress={handleContinue} />
      </Animated.View>
    </View>
  );
}
