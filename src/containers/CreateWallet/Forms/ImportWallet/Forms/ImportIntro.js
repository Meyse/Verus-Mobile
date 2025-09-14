/**
 * Update: Redesign ImportIntro screen to match onboarding visual language.
 * - Uses SoftSpotlightBackground and Tailwind/NativeWind styling
 * - Title + subtitle header and three large option buttons with icons
 * - Buttons styled like secondary AppButton (outlined, transparent)
 * - Each button supports a small subtitle text below the title
 */
import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useHeaderHeight } from '@react-navigation/elements';
import SoftSpotlightBackground from '../../../../../components/SoftSpotlightBackground';
import useResponsive from '../../../../../hooks/useResponsive';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

export default function ImportIntro({ navigation, label }) {
  const { isVerySmallHeight, isSmallHeight, height } = useResponsive();
  const headerHeight = useHeaderHeight();

  const title = label ? label : 'Import your wallet';
  const subtitle = 'Choose one of the options below to get started.';

  const iconSize = isVerySmallHeight ? 24 : isSmallHeight ? 26 : 28;

  const Option = ({ onPress, iconName, titleText, subtitleText }) => (
    <Pressable
      onPress={onPress}
      className="rounded-3xl border border-neutral-700/30"
      style={({ pressed }) => ({ 
        opacity: pressed ? 0.95 : 1,
        transform: [{ scale: pressed ? 0.98 : 1 }],
        minHeight: isVerySmallHeight ? 72 : 80
      })}
      android_ripple={{ color: "#0000001a", borderless: false }}
    >
      <View className="flex-row items-center px-6 py-5">
        <View className="w-12 h-12 rounded-2xl bg-gradient-to-br from-neutral-100 to-neutral-200 items-center justify-center mr-4 shadow-sm">
          <MaterialCommunityIcons name={iconName} size={iconSize} color="#374151" />
        </View>
        <View className="flex-1">
          <Text className="text-zinc-900 text-lg font-bold mb-1">{titleText}</Text>
          {subtitleText ? (
            <Text className="text-zinc-600 text-sm leading-relaxed">{subtitleText}</Text>
          ) : null}
        </View>
        <MaterialCommunityIcons name="chevron-right" size={20} color="#9CA3AF" />
      </View>
    </Pressable>
  );

  return (
    <SafeAreaView className="flex-1" edges={['left','right','bottom']}>
      <SoftSpotlightBackground pointerEvents="none" className="absolute left-0 right-0 top-0 bottom-0" />

      <View className="flex-1 px-5 pb-6" style={{ paddingTop: headerHeight + 32 }}>
        <View>
          <Text className={"text-zinc-800 font-bold " + (isVerySmallHeight ? 'text-2xl' : isSmallHeight ? 'text-3xl' : 'text-4xl')}>{title}</Text>
          <Text className="text-zinc-600 mt-2" style={{ lineHeight: (isSmallHeight || isVerySmallHeight) ? 20 : 22 }}>{subtitle}</Text>
        </View>

        <View className="mt-8">
          <Option
            onPress={() => navigation.navigate('ImportSeed')}
            iconName="format-list-bulleted"
            titleText="Import recovery phrase"
            subtitleText="Type your 24-word recovery phrase"
          />
          <View className="mt-4">
            <Option
              onPress={() => navigation.navigate('ScanQr')}
              iconName="qrcode-scan"
              titleText="Scan QR code"
              subtitleText="Scan a seed or private key QR"
            />
          </View>
          <View className="mt-4">
            <Option
              onPress={() => navigation.navigate('ImportText')}
              iconName="key-variant"
              titleText="Enter private key"
              subtitleText="Paste a private key or recovery phrase"
            />
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}
