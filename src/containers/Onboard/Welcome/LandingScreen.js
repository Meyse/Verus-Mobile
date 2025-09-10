/**
 * Update: Responsive LandingScreen aligned with WelcomeSlider strategy.
 * - Single small/very-small thresholds; numeric paddings/heights
 * - Keep header font scaling; keep button size consistent
 * - Only enable ScrollView on very small heights to avoid clipping
 */
import React from 'react';
import { View, Dimensions, Image, Text, Pressable, SafeAreaView, ScrollView } from 'react-native';
import { AppButton } from '../../../components/ui';
import { SMALL_DEVICE_HEGHT } from '../../../utils/constants/constants';
import { useState } from 'react';
import { useEffect } from 'react';
import SoftSpotlightBackground from '../../../components/SoftSpotlightBackground';
import bgStart from '../../../images/customIcons/bg-start2.png';
import useResponsive from '../../../hooks/useResponsive';

export default function LandingScreen(props) {
  const { height } = Dimensions.get('window');

  const [normalDevice, setNormalDevice] = useState(height > SMALL_DEVICE_HEGHT ? true : false);

  useEffect(() => {
    if (height > SMALL_DEVICE_HEGHT) {
      setNormalDevice(true);
    } else {
      setNormalDevice(false);
    }
  })

  const { isVerySmallHeight, isSmallHeight, height: screenHeight } = useResponsive();

  const titleSizeClass = isVerySmallHeight ? "text-2xl" : isSmallHeight ? "text-3xl" : "text-4xl";
  const clamp = (n, min, max) => Math.min(Math.max(n, min), max);
  const topPadding = isSmallHeight ? 12 : 40; // px
  const termsMarginTop = isSmallHeight ? 8 : 24; // px
  const imageHeight = clamp(Math.round(screenHeight * (isSmallHeight ? 0.30 : 0.36)), 220, 360);

  return (
    <SafeAreaView className="flex-1">
      <SoftSpotlightBackground pointerEvents="none" className="absolute left-0 right-0 top-0 bottom-0" />

      {/* Content column */}
      {isVerySmallHeight ? (
        <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'space-between', paddingTop: topPadding }} className="flex-1 px-5 pb-4">
          {/* Card */}
          <View className="rounded-3xl bg-white/60 border border-white/30 shadow-xl overflow-hidden">
            <View className="px-6 pt-6 pb-2">
              <Text className={"text-zinc-800 font-bold text-3xl" + titleSizeClass}>
                {'Easily manage\nyour wallet for\nthe Verus\necosystem'}
              </Text>
            </View>
            <View className="w-full items-center justify-center">
              <Image source={bgStart} resizeMode="cover" className="w-full" style={{ height: imageHeight }} />
            </View>
          </View>

          {/* Terms */}
          {normalDevice ? (
            <Text className="text-center text-xs text-zinc-600 px-4" style={{ marginTop: termsMarginTop }}>
              {'By using Verus wallet you agree to\nthe terms and the privacy policy'}
            </Text>
          ) : null}

          {/* CTA */}
          <View>
            <AppButton onPress={() => props.navigation.navigate('CreateProfile')} className="mx-1">
              {"Get Started!"}
            </AppButton>
            <View className="mt-3 items-center">
              <Text className="text-zinc-600">{'Already have a wallet? '}
                <Text className="text-zinc-800 font-semibold" onPress={() => props.navigation.navigate('Login')}> {'Log in'}</Text>
              </Text>
            </View>
          </View>
        </ScrollView>
      ) : (
        <View className="flex-1 px-5 pb-6 justify-between" style={{ paddingTop: topPadding }}>
          {/* Card */}
          <View className="rounded-3xl bg-white/60 border border-white/30 shadow-xl overflow-hidden">
            <View className="px-6 pt-6 pb-2">
              <Text className={"text-zinc-800 font-bold leading-tight " + titleSizeClass}>
                {'Easily manage\nyour wallet for\nthe Verus\necosystem'}
              </Text>
            </View>
            <View className="w-full items-center justify-center">
              <Image source={bgStart} resizeMode="cover" className="w-full" style={{ height: imageHeight }} />
            </View>
          </View>

          {/* Terms */}
          {normalDevice ? (
            <Text className="text-center text-xs text-zinc-600 px-4" style={{ marginTop: termsMarginTop }}>
              {'By using Verus wallet you agree to\nthe terms and the privacy policy'}
            </Text>
          ) : null}

          {/* CTA */}
          <View>
            <AppButton onPress={() => props.navigation.navigate('CreateProfile')} className="mx-1">
              {"Get Started!"}
            </AppButton>
            <View className="mt-3 items-center">
              <Text className="text-zinc-600">{'Already have a wallet? '}
                <Text className="text-zinc-800 font-semibold" onPress={() => props.navigation.navigate('Login')}> {'Log in'}</Text>
              </Text>
            </View>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}
