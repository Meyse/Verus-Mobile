/**
 * Update: Tailwind landing screen with spotlight background and onboarding card.
 * - Uses `SoftSpotlightBackground` full-screen
 * - Adds rounded card with heading and icons background image
 * - Adds Tailwind button (TWButton) and login link
 */
import React from 'react';
import { View, Dimensions, Image, Text, Pressable } from 'react-native';
import TWButton from '../../../components/TWButton';
import { SMALL_DEVICE_HEGHT } from '../../../utils/constants/constants';
import { useState } from 'react';
import { useEffect } from 'react';
import SoftSpotlightBackground from '../../../components/SoftSpotlightBackground';
import bgStart from '../../../images/customIcons/bg-start2.png';

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

  return (
    <View className="flex-1">
      <SoftSpotlightBackground pointerEvents="none" className="absolute left-0 right-0 top-0 bottom-0" />

      {/* Content column */}
      <View className="flex-1 px-5 pt-28 pb-6 justify-between">
        {/* Card */}
        <View className="rounded-3xl bg-white/60 border border-white/30 shadow-xl overflow-hidden">
          <View className="px-6 pt-6 pb-2">
            <Text className="text-zinc-800 text-4xl font-bold leading-tight">
              {'Easily manage\nyour wallet for\nthe Verus\necosystem'}
            </Text>
          </View>
          <View className="w-full items-center justify-center">
            <Image source={bgStart} resizeMode="cover" className="w-full h-80" />
          </View>
        </View>

        {/* Terms */}
        {normalDevice ? (
          <Text className="text-center text-xs text-zinc-600 px-4 mt-16">
            {'By using Verus wallet you agree to\nthe terms and the privacy policy'}
          </Text>
        ) : null}

        {/* CTA */}
        <View>
          <TWButton onPress={() => props.navigation.navigate('WelcomeSlider')} className="mx-1">
            {"Get Started!"}
          </TWButton>
          <View className="mt-3 items-center">
            <Text className="text-zinc-600">{'Already have a wallet? '}
              <Text className="text-zinc-800 font-semibold" onPress={() => props.navigation.navigate('Login')}> {'Log in'}</Text>
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}
