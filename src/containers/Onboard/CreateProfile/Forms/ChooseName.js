/**
 * Update: Redesign ChooseName with UI kit components and responsive layout.
 * - Uses AppBackButton, AppTextField, AppButton from ui kit
 * - Adds SoftSpotlightBackground and SafeArea + keyboard handling
 * - Numeric spacing based on screen height (useResponsive)
 */
import React, { useEffect, useState } from 'react';
import { View, Dimensions, TouchableWithoutFeedback, Keyboard, Text, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SMALL_DEVICE_HEGHT } from '../../../../utils/constants/constants';
import { useObjectSelector } from '../../../../hooks/useObjectSelector';
import { AppButton, AppTextField } from '../../../../components/ui';
import { useHeaderHeight } from '@react-navigation/elements';
import SoftSpotlightBackground from '../../../../components/SoftSpotlightBackground';
import useResponsive from '../../../../hooks/useResponsive';

export default function ChooseName({ profileName, setProfileName, navigation }) {
  const { height } = Dimensions.get('window');
  const accounts = useObjectSelector(state => state.authentication.accounts)

  const isDuplicateAccount = (accountID) => {
    let index = 0;

    while (
      index < accounts.length &&
      accountID !== accounts[index].id
    ) {
      index++;
    }

    if (index < accounts.length) {
      return true;
    } else {
      return false;
    }
  };

  const [touched, setTouched] = useState(false);
  const [duplicate, setDuplicate] = useState(false);

  useEffect(() => {
    const handle = setTimeout(() => {
      setDuplicate(isDuplicateAccount(profileName.trim()))
    }, 300);
    return () => clearTimeout(handle);
  }, [profileName, accounts]);

  const getErrorText = () => {
    if (!touched) return '';
    if (profileName.trim().length === 0) return 'Please enter a profile name.';
    if (duplicate) return 'A profile with this name already exists.';
    return '';
  };

  const next = () => {
    if (!touched) setTouched(true);
    const error = getErrorText();
    if (error) return;
    navigation.navigate("CreatePassword")
  }

  const { isVerySmallHeight, isSmallHeight, height: screenHeight } = useResponsive();
  const headerHeight = useHeaderHeight();
  const topPadding = headerHeight; // content sits directly under native header
  const titleSizeClass = isVerySmallHeight ? "text-2xl" : isSmallHeight ? "text-3xl" : "text-4xl";
  const subtitleLineHeight = isSmallHeight || isVerySmallHeight ? 20 : 22;

  return (
    <SafeAreaView className="flex-1">
      <SoftSpotlightBackground pointerEvents="none" className="absolute left-0 right-0 top-0 bottom-0" />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <TouchableWithoutFeedback onPress={() => Keyboard.dismiss()}>
          {isVerySmallHeight ? (
            <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'space-between', paddingTop: topPadding }} className="px-5 pb-4">
              <View>
                <View>
                  <Text className={"text-zinc-800 font-bold " + titleSizeClass}>{"Name your profile"}</Text>
                  <Text className="text-zinc-600 mt-2" style={{ lineHeight: subtitleLineHeight }}>{"Give your profile a name. You can create multiple profiles. Your password (next step) will protect and encrypt your wallet on this device."}</Text>
                </View>
                <View className="mt-8">
                  <Text className="text-sm text-zinc-700 mb-2">{"Name"}</Text>
                  <AppTextField
                    placeholder="e.g., Personal wallet"
                    value={profileName}
                    onChangeText={(text) => setProfileName(text)}
                    maxLength={50}
                    returnKeyType="done"
                    onSubmitEditing={next}
                    onBlur={() => setTouched(true)}
                    helperText={!touched ? '' : undefined}
                    errorText={getErrorText()}
                  />
                </View>
              </View>
              <AppButton onPress={next} disabled={profileName.length == 0}>{"Next"}</AppButton>
            </ScrollView>
          ) : (
            <View className="flex-1 px-5 pb-6 justify-between" style={{ paddingTop: topPadding }}>
              <View>
                <View>
                  <Text className={"text-zinc-800 font-bold " + titleSizeClass}>{"Name your profile"}</Text>
                  <Text className="text-zinc-600 mt-2" style={{ lineHeight: subtitleLineHeight }}>{"Give your profile a name. You can create multiple profiles. Your password (next step) will protect and encrypt your wallet on this device."}</Text>
                </View>
                <View className="mt-10">
                  <Text className="text-sm text-zinc-700 mb-2">{"Name"}</Text>
                  <AppTextField
                    placeholder="e.g., Personal wallet"
                    value={profileName}
                    onChangeText={(text) => setProfileName(text)}
                    maxLength={50}
                    returnKeyType="done"
                    onSubmitEditing={next}
                    onBlur={() => setTouched(true)}
                    helperText={!touched ? '' : undefined}
                    errorText={getErrorText()}
                  />
                </View>
              </View>
              <AppButton onPress={next} disabled={profileName.length == 0}> {"Next"} </AppButton>
            </View>
          )}
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
