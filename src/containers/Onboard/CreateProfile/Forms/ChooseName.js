/**
 * Update: Redesign ChooseName with UI kit components and responsive layout.
 * - Uses AppBackButton, AppTextField, AppButton from ui kit
 * - Adds SoftSpotlightBackground and SafeArea + keyboard handling
 * - Numeric spacing based on screen height (useResponsive)
 */
import React, { useEffect, useState } from 'react';
import { View, Dimensions, Text } from 'react-native';
import { SMALL_DEVICE_HEGHT } from '../../../../utils/constants/constants';
import { useObjectSelector } from '../../../../hooks/useObjectSelector';
import { AppTextField } from '../../../../components/ui';
import OnboardScreen from '../../../../components/layout/OnboardScreen';
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
    if (profileName.trim().length === 0) return 'Please enter a wallet name.';
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
  const titleSizeClass = isVerySmallHeight ? "text-2xl" : isSmallHeight ? "text-3xl" : "text-4xl";
  const subtitleLineHeight = isSmallHeight || isVerySmallHeight ? 20 : 22;

  return (
    <OnboardScreen
      title={"Name your wallet"}
      subtitle={"Give your wallet a name. You can create multiple wallets on this device. Your password (next step) will protect and encrypt your wallet on this device only."}
      ctaLabel={"Next"}
      ctaDisabled={profileName.length == 0}
      onCtaPress={next}
    >
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
    </OnboardScreen>
  );
}
