/**
 * Redesign: Wallet list login screen with modal-based password step.
 * - Replaces logos/text with a wallet overview list (account names only)
 * - Tapping a wallet opens the auth modal directly on password step
 * - Adds bottom CTA “Add a new wallet” → navigates to LandingScreen
 * - Reuses LandingScreen styling: SoftSpotlightBackground, AppButton, responsive paddings
 */

import React, {useEffect} from 'react';
import {View, SafeAreaView, Text, Pressable, FlatList} from 'react-native';
import {openAuthenticateUserModal} from '../../actions/actions/sendModal/dispatchers/sendModal';
import {
  SEND_MODAL_FORM_STEP_CONFIRM,
  SEND_MODAL_FORM_STEP_FORM,
  SEND_MODAL_USER_TO_AUTHENTICATE,
} from '../../utils/constants/sendModal';
import {useSelector} from 'react-redux';
import { useObjectSelector } from '../../hooks/useObjectSelector';
import SoftSpotlightBackground from '../../components/SoftSpotlightBackground';
import { AppButton } from '../../components/ui';
import useResponsive from '../../hooks/useResponsive';

const Login = props => {
  const defaultAccount = useSelector(
    state => state.settings.generalWalletSettings.defaultAccount,
  );
  const authModalUsed = useSelector(
    state => state.authentication.authModalUsed,
  );
  const accounts = useObjectSelector(state => state.authentication.accounts);

  const { isVerySmallHeight, isSmallHeight, height } = useResponsive();
  const topPadding = isSmallHeight ? 12 : 40; // px

  const openAuthModal = (ignoreDefault) => {
    if (ignoreDefault) {
      openAuthenticateUserModal();
    } else {
      openAuthenticateUserModal(
        {
          [SEND_MODAL_USER_TO_AUTHENTICATE]: defaultAccount,
        },
        defaultAccount != null &&
          !authModalUsed &&
          accounts.find(x => x.accountHash === defaultAccount) != null
          ? SEND_MODAL_FORM_STEP_CONFIRM
          : SEND_MODAL_FORM_STEP_FORM,
      );
    }
  };

  useEffect(() => {
    if (
      !authModalUsed &&
      defaultAccount != null &&
      accounts.find(x => x.accountHash === defaultAccount) != null
    ) {
      setTimeout(() => {
        openAuthModal();
      }, 700);
    }
  }, []);

  const handleWalletPress = (account) => {
    openAuthenticateUserModal(
      { [SEND_MODAL_USER_TO_AUTHENTICATE]: account.accountHash },
      SEND_MODAL_FORM_STEP_CONFIRM
    );
  };

  const handleAddNewWallet = () => {
    props.navigation.navigate('LandingScreen');
  };

  const renderWalletItem = ({ item }) => {
    const isDefault = item.accountHash === defaultAccount;
    return (
      <Pressable onPress={() => handleWalletPress(item)} className="mb-3">
        <View className="rounded-2xl bg-white/60 border border-white/30 shadow overflow-hidden">
          <View className="flex-row items-center justify-between px-5 py-4">
            <Text className="text-zinc-800 text-base font-semibold">{item.id}</Text>
            {isDefault ? (
              <View className="ml-3 rounded-full bg-zinc-800 px-2 py-1">
                <Text className="text-white text-2xs">Default</Text>
              </View>
            ) : null}
          </View>
        </View>
      </Pressable>
    );
  };

  return (
    <SafeAreaView className="flex-1">
      <SoftSpotlightBackground pointerEvents="none" className="absolute left-0 right-0 top-0 bottom-0" />

      <View className="flex-1 px-5 pb-6" style={{ paddingTop: topPadding }}>
        {/* Header */}
        <View className="mb-4">
          <Text className={"text-zinc-800 font-bold " + (isVerySmallHeight ? 'text-2xl' : isSmallHeight ? 'text-3xl' : 'text-4xl')}>
            {"Select a wallet"}
          </Text>
        </View>

        {/* Wallet list */}
        <View className="flex-1">
          <FlatList
            data={accounts}
            keyExtractor={(item) => item.accountHash}
            renderItem={renderWalletItem}
            contentContainerStyle={{ paddingTop: 4, paddingBottom: 8 }}
          />
        </View>

        {/* CTA */}
        <View>
          <AppButton onPress={handleAddNewWallet} className="mx-1">
            {"Add a new wallet"}
          </AppButton>
        </View>
      </View>
    </SafeAreaView>
  );
};

export default Login;
