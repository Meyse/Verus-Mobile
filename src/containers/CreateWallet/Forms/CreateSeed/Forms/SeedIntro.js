/**
 * Update: Redesign SeedIntro to match onboarding style.
 * - Uses SoftSpotlightBackground and responsive layout
 * - Replace MnemonicSeed icon with seed-bg.png background image
 * - Remove warning text, keep checkbox requirement
 */
import React, {useState} from 'react';
import {View, Dimensions, Image, Text, SafeAreaView, ScrollView, TouchableWithoutFeedback, Keyboard} from 'react-native';
import Colors from '../../../../../globals/colors';
import SoftSpotlightBackground from '../../../../../components/SoftSpotlightBackground';
import useResponsive from '../../../../../hooks/useResponsive';
import { AppButton, AppCheckbox } from '../../../../../components/ui';
import walletSeed from '../../../../../images/customIcons/wallet-seed.png';
import { getKey } from '../../../../../utils/keyGenerator/keyGenerator';
import { createAlert } from '../../../../../actions/actions/alert/dispatchers/alert';

export default function SeedIntro({navigation, setNewSeed}) {
  const [userAgrees, setUserAgrees] = useState(false);
  const [loading, setLoading] = useState(false);
  const { isVerySmallHeight, isSmallHeight, height: screenHeight } = useResponsive();
  
  const titleSizeClass = isVerySmallHeight ? 'text-2xl' : isSmallHeight ? 'text-3xl' : 'text-4xl';
  const subtitleLineHeight = isSmallHeight || isVerySmallHeight ? 20 : 22;
  const topPadding = isSmallHeight ? 12 : 40;
  const clamp = (n, min, max) => Math.min(Math.max(n, min), max);
  const imageHeight = clamp(Math.round(screenHeight * (isSmallHeight ? 0.30 : 0.36)), 220, 360);

  const generateSeedAndContinue = async () => {
    setLoading(true);
    try {
      const newSeed = await getKey(256);
      setNewSeed(newSeed);
      navigation.navigate("SeedWords");
    } catch (e) {
      createAlert("Error", "Error generating seed words.");
      console.warn(e);
    }
    setLoading(false);
  };

  return (
    <SafeAreaView className="flex-1">
      <SoftSpotlightBackground pointerEvents="none" className="absolute left-0 right-0 top-0 bottom-0" />
      
      {isVerySmallHeight ? (
        <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'space-between', paddingTop: topPadding }} className="flex-1 px-5 pb-4">
          {/* Content */}
          <View>
            <View className="items-center">
              <Image 
                source={walletSeed} 
                resizeMode="contain" 
                style={{ width: '100%', height: isVerySmallHeight ? 140 : isSmallHeight ? 180 : 220 }} 
              />
            </View>
            <View className="mt-6">
              <Text className={'text-zinc-800 font-bold ' + titleSizeClass}>
                {'24-word recovery phrase'}
              </Text>
              <Text className="text-zinc-600 mt-2" style={{ lineHeight: subtitleLineHeight }}>
                {'Your 24-word recovery phrase is the secret key that gives you access to your wallet. Write each word down, separated by a space, and keep your words safe.'}
              </Text>
            </View>
          </View>
          
          {/* Checkbox and CTA */}
          <View>
            <AppCheckbox
              checked={userAgrees}
              onPress={() => setUserAgrees(!userAgrees)}
              label={'I understand the need to write down the seed, and to never share it with anyone.'}
            />
            <View className="mt-6">
              <AppButton onPress={generateSeedAndContinue} disabled={!userAgrees || loading}>
                {loading ? 'Generating...' : 'Show words 1-12'}
              </AppButton>
            </View>
          </View>
        </ScrollView>
      ) : (
        <View className="flex-1 px-5 pb-6 justify-between" style={{ paddingTop: topPadding }}>
          {/* Content */}
          <View>
            <View className="items-center">
              <Image 
                source={walletSeed} 
                resizeMode="contain" 
                style={{ width: '100%', height: isVerySmallHeight ? 140 : isSmallHeight ? 180 : 220 }} 
              />
            </View>
            <View className="mt-6">
              <Text className={'text-zinc-800 font-bold ' + titleSizeClass}>
                {'24-word recovery phrase'}
              </Text>
              <Text className="text-zinc-600 mt-2" style={{ lineHeight: subtitleLineHeight }}>
                {'Your 24-word recovery phrase is the secret key that gives you access to your wallet. Write each word down, separated by a space, and keep your words safe.'}
              </Text>
            </View>
          </View>
          
          {/* Checkbox and CTA */}
          <View>
            <AppCheckbox
              checked={userAgrees}
              onPress={() => setUserAgrees(!userAgrees)}
              label={'I understand the need to write down the seed, and to never share it with anyone.'}
            />
            <View className="mt-6">
              <AppButton onPress={generateSeedAndContinue} disabled={!userAgrees || loading}>
                {loading ? 'Generating...' : 'Show words 1-12'}
              </AppButton>
            </View>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}
