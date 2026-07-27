import React, {useState} from 'react';
import {
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {ActivityIndicator} from 'react-native-paper';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import BottomSheetModal from '../../../../components/BottomSheetModal';
import CopyAction from '../../../../components/CopyAction';
import {useAppTheme} from '../../../../theme/app';
import {buildGiftCardNfcDeeplinkUri} from '../../../../utils/giftCard/giftCard';
import {writeDeeplinkUriToNfc} from '../../../../utils/walletBackup/walletBackupNfc';
import GiftCardQrModal from './GiftCardQrModal';

const GiftCardShareSheet = ({card, onClose}) => {
  const theme = useAppTheme();
  const [qrVisible, setQrVisible] = useState(false);
  const [nfcStatus, setNfcStatus] = useState(null);

  const shareNfc = async () => {
    if (!card) return;

    setNfcStatus('Preparing NFC writer...');

    try {
      await writeDeeplinkUriToNfc(buildGiftCardNfcDeeplinkUri(card), {
        onStatus: setNfcStatus,
      });
      Alert.alert('Success', 'Gift card written to NFC card.');
    } catch (e) {
      Alert.alert('NFC Error', e.message);
    } finally {
      setNfcStatus(null);
    }
  };

  return (
    <>
      <BottomSheetModal
        accessibilityViewIsModal
        contentContainerStyle={styles.sheet}
        maxHeight="86%"
        onClose={onClose}
        visible={card != null && !qrVisible && nfcStatus == null}>
        <View style={styles.header}>
          <Text style={[theme.typography.titleSheet, {color: theme.colors.textPrimary}]}>
            Share gift card
          </Text>
          <TouchableOpacity
            accessibilityLabel="Close sharing options"
            accessibilityRole="button"
            onPress={onClose}
            style={styles.closeButton}>
            <MaterialCommunityIcons
              color={theme.colors.textPrimary}
              name="close"
              size={22}
            />
          </TouchableOpacity>
        </View>
        <ScrollView
          bounces={false}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled">
          <View
            style={[
              styles.warning,
              {backgroundColor: theme.colors.warningBackground},
            ]}>
            <MaterialCommunityIcons
              color={theme.colors.warning}
              name="shield-alert-outline"
              size={21}
            />
            <Text
              style={[
                styles.warningText,
                {color: theme.colors.textSecondary},
              ]}>
              Anyone with this redeemable link can claim this gift card and
              funds added to it later.
              {card?.encrypted
                ? ' The claim password is a separate secret and cannot be recovered.'
                : ''}
            </Text>
          </View>

          <TouchableOpacity
            accessibilityRole="button"
            onPress={() => setQrVisible(true)}
            style={[styles.actionRow, {borderBottomColor: theme.colors.border}]}>
            <MaterialCommunityIcons
              color={theme.colors.primary}
              name="qrcode"
              size={23}
            />
            <Text style={[styles.actionLabel, {color: theme.colors.textPrimary}]}>
              Show QR code
            </Text>
            <MaterialCommunityIcons
              color={theme.colors.textSubtle}
              name="chevron-right"
              size={21}
            />
          </TouchableOpacity>

          <View
            style={[styles.actionRow, {borderBottomColor: theme.colors.border}]}>
            <MaterialCommunityIcons
              color={theme.colors.primary}
              name="link-variant"
              size={23}
            />
            <Text style={[styles.actionLabel, {color: theme.colors.textPrimary}]}>
              Copy redeemable link
            </Text>
            <CopyAction
              accessibilityLabel="Copy redeemable gift card link"
              copiedAccessibilityLabel="Redeemable gift card link copied"
              color={theme.colors.primary}
              value={card?.requestUri}
            />
          </View>

          <TouchableOpacity
            accessibilityRole="button"
            onPress={shareNfc}
            style={styles.actionRow}>
            <MaterialCommunityIcons
              color={theme.colors.primary}
              name="credit-card-wireless-outline"
              size={23}
            />
            <Text style={[styles.actionLabel, {color: theme.colors.textPrimary}]}>
              Write to NFC card
            </Text>
            <MaterialCommunityIcons
              color={theme.colors.textSubtle}
              name="chevron-right"
              size={21}
            />
          </TouchableOpacity>
        </ScrollView>
      </BottomSheetModal>

      <GiftCardQrModal
        card={card}
        onClose={() => setQrVisible(false)}
        visible={card != null && qrVisible}
      />

      <Modal
        animationType="fade"
        onRequestClose={() => {}}
        transparent={false}
        visible={nfcStatus != null}>
        <View
          accessibilityLiveRegion="polite"
          style={[styles.nfcProgress, {backgroundColor: theme.colors.background}]}>
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
    </>
  );
};

const styles = StyleSheet.create({
  sheet: {
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 18,
  },
  header: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
  },
  closeButton: {
    width: 44,
    height: 44,
    marginLeft: 'auto',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 999,
  },
  content: {
    paddingTop: 8,
  },
  warning: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 10,
    padding: 14,
    borderRadius: 14,
  },
  warningText: {
    minWidth: 0,
    flex: 1,
    fontSize: 13,
    lineHeight: 19,
  },
  actionRow: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  actionLabel: {
    minWidth: 0,
    flex: 1,
    fontSize: 15,
    lineHeight: 21,
    fontWeight: '600',
  },
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

export default GiftCardShareSheet;
