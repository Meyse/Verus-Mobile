/**
 * New file: TWButton
 * - Tailwind/NativeWind based button component for consistent styling
 * - Primary variant used on LandingScreen
 */
import React from 'react';
import { Pressable, Text } from 'react-native';

const TWButton = ({ onPress, children, className, textClassName }) => {
  return (
    <Pressable
      onPress={onPress}
      className={
        "h-14 rounded-2xl bg-neutral-700 items-center justify-center " +
        (className || "")
      }
      style={({ pressed }) => ({ opacity: pressed ? 0.9 : 1 })}
      android_ripple={{ color: "#ffffff22", borderless: false }}
    >
      <Text className={"text-white text-lg font-semibold " + (textClassName || "")}>{children}</Text>
    </Pressable>
  );
};

export default TWButton;


