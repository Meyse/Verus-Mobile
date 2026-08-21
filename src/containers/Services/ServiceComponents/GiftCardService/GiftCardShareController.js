import React, {useCallback, useEffect, useRef, useState} from 'react';
import {
  AccessibilityInfo,
  Alert,
  Modal,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Clipboard from 'react-native/Libraries/Components/Clipboard/Clipboard';
import {ActivityIndicator} from 'react-native-paper';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import {useAppTheme} from '../../../../theme/app';
import {buildGiftCardNfcDeeplinkUri} from '../../../../utils/giftCard/giftCard';
import {writeDeeplinkUriToNfc} from '../../../../utils/walletBackup/walletBackupNfc';

export const useGiftCardSharing = card => {
  const copyFeedbackTimeoutRef = useRef(null);
  const [copied, setCopied] = useState(false);
  const [nfcStatus, setNfcStatus] = useState(null);
  const resetSharing = useCallback(() => {
    setCopied(false);

    if (copyFeedbackTimeoutRef.current) {
      clearTimeout(copyFeedbackTimeoutRef.current);
      copyFeedbackTimeoutRef.current = null;
    }
  }, []);

  useEffect(() => {
    resetSharing();
    setNfcStatus(null);

    return () => {
      if (copyFeedbackTimeoutRef.current) {
        clearTimeout(copyFeedbackTimeoutRef.current);
      }
    };
  }, [card?.id, resetSharing]);

  const copyLink = useCallback(cardOverride => {
    const cardToShare = cardOverride || card;
    if (!cardToShare?.requestUri) {
      throw new Error('Gift card link is unavailable.');
    }

    Clipboard.setString(cardToShare.requestUri);
    setCopied(true);
    AccessibilityInfo.announceForAccessibility(
      'Redeemable gift card link copied',
    );

    if (copyFeedbackTimeoutRef.current) {
      clearTimeout(copyFeedbackTimeoutRef.current);
    }

    copyFeedbackTimeoutRef.current = setTimeout(() => {
      setCopied(false);
      copyFeedbackTimeoutRef.current = null;
    }, 1400);
  }, [card]);

  const shareNative = useCallback(async cardOverride => {
    const cardToShare = cardOverride || card;
    if (!cardToShare?.requestUri) {
      throw new Error('Gift card link is unavailable.');
    }

    const result = await Share.share({message: cardToShare.requestUri});

    return result?.action !== Share.dismissedAction;
  }, [card]);

  const shareNfc = useCallback(async cardOverride => {
    const cardToShare = cardOverride || card;
    if (!cardToShare) {
      throw new Error('Gift card is unavailable.');
    }

    setNfcStatus('Preparing NFC writer...');

    try {
      await writeDeeplinkUriToNfc(buildGiftCardNfcDeeplinkUri(cardToShare), {
        onStatus: setNfcStatus,
      });
      Alert.alert('Success', 'Gift card written to NFC card.');
    } finally {
      setNfcStatus(null);
    }
  }, [card]);

  return {
    copied,
    copyLink,
    nfcStatus,
    resetSharing,
    shareNative,
    shareNfc,
  };
};

export const GiftCardNfcProgressModal = ({nfcStatus}) => {
  const theme = useAppTheme();

  return (
    <Modal
      animationType="fade"
      onRequestClose={() => {}}
      transparent={false}
      visible={nfcStatus != null}>
      <View
        accessibilityLiveRegion="polite"
        style={[
          styles.nfcProgress,
          {backgroundColor: theme.colors.background},
        ]}>
        <MaterialCommunityIcons
          color={theme.colors.primary}
          name="credit-card-wireless-outline"
          size={64}
        />
        <ActivityIndicator
          animating
          color={theme.colors.primary}
          size="large"
          style={styles.nfcSpinner}
        />
        <Text
          style={[
            theme.typography.titleSheet,
            styles.nfcStatus,
            {color: theme.colors.textPrimary},
          ]}>
          {nfcStatus}
        </Text>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  nfcProgress: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  nfcSpinner: {
    marginTop: 28,
  },
  nfcStatus: {
    marginTop: 24,
    textAlign: 'center',
  },
});
