/**
 * New file: OnboardScreen layout
 * - Shared onboarding scaffolding: background, safe-area, header spacing,
 *   keyboard handling, responsive scroll, title/subtitle, and bottom CTA.
 */
import React from 'react';
import { View, Text, KeyboardAvoidingView, Platform, ScrollView, TouchableWithoutFeedback, Keyboard } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useHeaderHeight } from '@react-navigation/elements';
import SoftSpotlightBackground from '../../components/SoftSpotlightBackground';
import useResponsive from '../../hooks/useResponsive';
import { AppButton } from '../ui';

const OnboardScreen = ({
  title,
  subtitle,
  ctaLabel,
  ctaDisabled,
  onCtaPress,
  children,
  headerGap = 32,
}) => {
  const headerHeight = useHeaderHeight();
  const { isVerySmallHeight, isSmallHeight } = useResponsive();
  const titleSizeClass = isVerySmallHeight ? 'text-2xl' : isSmallHeight ? 'text-3xl' : 'text-4xl';
  const subtitleLineHeight = isSmallHeight || isVerySmallHeight ? 20 : 22;
  const topPad = headerHeight + (headerGap || 0);

  const Content = (
    <View>
      <View>
        {title ? <Text className={'text-zinc-800 font-bold ' + titleSizeClass}>{title}</Text> : null}
        {subtitle ? (
          <Text className="text-zinc-600 mt-2" style={{ lineHeight: subtitleLineHeight }}>{subtitle}</Text>
        ) : null}
      </View>
      {children}
    </View>
  );

  return (
    <SafeAreaView className="flex-1" edges={['left','right','bottom']}>
      <SoftSpotlightBackground pointerEvents="none" className="absolute left-0 right-0 top-0 bottom-0" />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <TouchableWithoutFeedback onPress={() => Keyboard.dismiss()}>
          {isVerySmallHeight ? (
            <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'space-between', paddingTop: topPad }} className="px-5 pb-4">
              {Content}
              <AppButton onPress={onCtaPress} disabled={ctaDisabled}>{ctaLabel}</AppButton>
            </ScrollView>
          ) : (
            <View className="flex-1 px-5 pb-6 justify-between" style={{ paddingTop: topPad }}>
              {Content}
              <AppButton onPress={onCtaPress} disabled={ctaDisabled}>{ctaLabel}</AppButton>
            </View>
          )}
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default OnboardScreen;


