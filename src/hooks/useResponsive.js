/**
 * New file: useResponsive
 * - Provides screen tier booleans and a scale factor to size UI elements
 * - Tiers are based on screen height to target small devices like iPhone SE
 */
import { useWindowDimensions } from 'react-native';
import { useMemo } from 'react';

export default function useResponsive() {
  const { height, width } = useWindowDimensions();

  // iPhone SE (2/3) is 667pts height; older is 568
  const isVerySmallHeight = height <= 568;
  const isSmallHeight = height <= 667 && !isVerySmallHeight;
  const isMediumHeight = height > 667 && height <= 780;
  const isLargeHeight = height > 780;

  // Base on iPhone 13/14 Pro height ~844; clamp to keep readable
  const scale = useMemo(() => {
    const s = height / 844;
    if (s < 0.75) return 0.75;
    if (s > 1) return 1;
    return s;
  }, [height]);

  return {
    height,
    width,
    isVerySmallHeight,
    isSmallHeight,
    isMediumHeight,
    isLargeHeight,
    scale,
  };
}


