import React from 'react';
import {Alert, ScrollView, StyleSheet, Text, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import AppButton from '../../../../../components/AppButton';
import OnboardingBackButton from '../../../../../components/OnboardingBackButton';
import SafeBottomActionStack from '../../../../../components/SafeBottomActionStack';
import {useAppTheme} from '../../../../../theme/app';

const GiftCardServiceIntroSlider = ({onBack, onDone}) => {
  const theme = useAppTheme();

  const finishIntro = () => {
    Alert.alert(
      'Treat Gift Cards as Secrets',
      'Gift cards are spendable secrets. Anyone with access to one can redeem its funds now, and can also redeem funds added to it later.',
      [
        {
          text: 'I Understand',
          onPress: onDone,
        },
      ],
    );
  };

  return (
    <SafeAreaView
      edges={['top', 'left', 'right']}
      style={[styles.screen, {backgroundColor: theme.colors.background}]}>
      <View style={styles.header}>
        <OnboardingBackButton onPress={onBack} />
      </View>
      <ScrollView
        bounces={false}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}>
        <View
          style={[
            styles.icon,
            {backgroundColor: theme.colors.surfaceMuted},
          ]}>
          <MaterialCommunityIcons
            accessible={false}
            color={theme.colors.primary}
            name="gift-outline"
            size={42}
          />
        </View>
        <Text
          style={[
            theme.typography.headlineMd,
            styles.title,
            {color: theme.colors.textPrimary},
          ]}>
          Gift cards
        </Text>
        <Text
          style={[
            theme.typography.bodyMd,
            styles.description,
            {color: theme.colors.textSecondary},
          ]}>
          Share funds or VerusIDs as a redeemable link, QR code, or NFC card.
        </Text>

        <View
          style={[
            styles.notice,
            {backgroundColor: theme.colors.warningBackground},
          ]}>
          <MaterialCommunityIcons
            accessible={false}
            color={theme.colors.warning}
            name="shield-alert-outline"
            size={23}
          />
          <View style={styles.noticeCopy}>
            <Text
              style={[
                theme.typography.labelMd,
                {color: theme.colors.textPrimary},
              ]}>
              A gift card is a spendable secret
            </Text>
            <Text
              style={[
                theme.typography.caption,
                styles.noticeBody,
                {color: theme.colors.textSecondary},
              ]}>
              Anyone with its link can redeem current and future contents. An
              optional claim password adds a second secret, but it cannot be
              recovered if lost.
            </Text>
          </View>
        </View>
      </ScrollView>

      <SafeBottomActionStack gap={10} safeAreaSpacing={0}>
        <AppButton
          accessibilityLabel="Open gift cards"
          mode="contained"
          onPress={finishIntro}>
          Open gift cards
        </AppButton>
      </SafeBottomActionStack>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  header: {
    minHeight: 52,
    paddingHorizontal: 12,
    justifyContent: 'center',
  },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingVertical: 28,
  },
  icon: {
    width: 76,
    height: 76,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    borderRadius: 24,
  },
  title: {
    marginTop: 24,
    textAlign: 'center',
  },
  description: {
    marginTop: 10,
    textAlign: 'center',
  },
  notice: {
    flexDirection: 'row',
    gap: 14,
    marginTop: 32,
    padding: 16,
    borderRadius: 16,
  },
  noticeCopy: {
    minWidth: 0,
    flex: 1,
  },
  noticeBody: {
    marginTop: 5,
  },
});

export default GiftCardServiceIntroSlider;
