/**
 * New file: AppButton (UI Kit)
 * - Tailwind/NativeWind styled button for consistent app usage
 * - API is intentionally small and extensible for future variants
 */
import React from 'react';
import { Pressable, Text } from 'react-native';

const AppButton = ({ onPress, children, className, textClassName, size = "md", variant = "primary", disabled = false }) => {
  const isCompact = size === 'sm' || size === 'compact';
  const base = "rounded-2xl items-center justify-center ";
  const heights = isCompact ? "h-12 " : "h-14 ";
  let palette = "";
  if (variant === 'primary') {
    palette = disabled ? "bg-neutral-300 " : "bg-neutral-700 ";
  } else if (variant === 'secondary') {
    palette = "bg-transparent border border-neutral-700/30 ";
  } else if (variant === 'ghost') {
    palette = "bg-transparent ";
  } else {
    palette = "bg-neutral-700 ";
  }

  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      className={heights + base + palette + (className || "")}
      style={({ pressed }) => ({ opacity: pressed && !disabled ? 0.9 : 1 })}
      android_ripple={disabled ? undefined : { color: "#ffffff22", borderless: false }}
    >
      <Text className={(isCompact ? "text-base " : "text-lg ") + (variant === 'secondary' || variant === 'ghost' ? "text-neutral-800 " : "text-white ") + "font-semibold " + (textClassName || "")}>
        {children}
      </Text>
    </Pressable>
  );
};

export default AppButton;


