import {CameraRoll} from '@react-native-camera-roll/camera-roll';
import React, {useRef, useState} from 'react';
import {
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import RNFS from 'react-native-fs';
import QRCode from 'react-native-qrcode-svg';
import {SafeAreaView} from 'react-native-safe-area-context';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import AppButton from '../../../../components/AppButton';
import SafeBottomActionStack from '../../../../components/SafeBottomActionStack';
import {fontStyle} from '../../../../globals/fonts';
import {useAppTheme} from '../../../../theme/app';

const VERUS_LOGO = require('../../../../images/customIcons/Verus.png');

const GiftCardQrModal = ({card, onClose, visible}) => {
  const theme = useAppTheme();
  const qrCodeRef = useRef(null);
  const [saving, setSaving] = useState(false);

  const saveQrCode = () => {
    if (!card?.requestUri || !qrCodeRef.current || saving) return;

    setSaving(true);
    qrCodeRef.current.toDataURL(data => {
      const filePath = `${RNFS.CachesDirectoryPath}/GiftCard-${card.id}.png`;

      RNFS.writeFile(filePath, data, 'base64')
        .then(() => CameraRoll.save(filePath, {type: 'photo'}))
        .then(() => RNFS.unlink(filePath))
        .then(() => {
          Alert.alert('Saved', 'Gift card QR code saved to your photos.');
        })
        .catch(error => {
          Alert.alert(
            'Unable to Save QR Code',
            error.message || 'The gift card QR code could not be saved.',
          );
        })
        .finally(() => setSaving(false));
    });
  };

  return (
    <Modal
      animationType="none"
      onRequestClose={onClose}
      presentationStyle="fullScreen"
      visible={visible}>
      <SafeAreaView
        edges={['top', 'left', 'right']}
        style={[styles.screen, {backgroundColor: theme.colors.background}]}>
        <View style={[styles.header, {borderBottomColor: theme.colors.border}]}>
          <View style={styles.headerPlaceholder} />
          <Text style={[styles.headerTitle, {color: theme.colors.textPrimary}]}>
            Gift card QR
          </Text>
          <AppButton
            accessibilityLabel="Close gift card QR code"
            height={44}
            labelStyle={styles.closeLabel}
            onPress={onClose}
            style={styles.closeButton}
            variant="text">
            Close
          </AppButton>
        </View>

        <ScrollView
          bounces={false}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}>
          <Text style={[styles.title, {color: theme.colors.textPrimary}]}>
            {card?.label || 'Gift card'}
          </Text>
          <Text style={[styles.description, {color: theme.colors.textSecondary}]}>
            Scan this code in Verus Mobile to claim the gift card.
          </Text>

          <View
            accessibilityLabel="Redeemable gift card QR code"
            accessibilityRole="image"
            style={[styles.qrFrame, {borderColor: theme.colors.border}]}>
            <QRCode
              getRef={ref => {
                qrCodeRef.current = ref;
              }}
              logo={VERUS_LOGO}
              logoBackgroundColor="#FFFFFF"
              logoBorderRadius={100}
              logoSize={46}
              size={232}
              value={card?.requestUri || '-'}
            />
          </View>

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
            <Text style={[styles.warningText, {color: theme.colors.textSecondary}]}>
              This QR code is a spendable secret. Anyone who scans or saves it
              can claim current and future contents.
            </Text>
          </View>
        </ScrollView>

        <SafeBottomActionStack gap={8} horizontalSpacing={20}>
          <AppButton
            disabled={saving}
            icon="content-save-outline"
            onPress={saveQrCode}
            variant="secondary">
            {saving ? 'Saving…' : 'Save to photos'}
          </AppButton>
        </SafeBottomActionStack>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  header: {
    minHeight: 58,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerPlaceholder: {
    width: 60,
  },
  headerTitle: {
    minWidth: 0,
    flex: 1,
    textAlign: 'center',
    fontSize: 18,
    lineHeight: 24,
    ...fontStyle('semiBold'),
  },
  closeButton: {
    width: 60,
    minWidth: 60,
  },
  closeLabel: {
    fontSize: 13,
  },
  content: {
    flexGrow: 1,
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 30,
    paddingBottom: 24,
  },
  title: {
    textAlign: 'center',
    fontSize: 25,
    lineHeight: 32,
    ...fontStyle('semiBold'),
  },
  description: {
    maxWidth: 320,
    marginTop: 8,
    textAlign: 'center',
    fontSize: 14,
    lineHeight: 21,
    ...fontStyle('regular'),
  },
  qrFrame: {
    marginTop: 28,
    padding: 18,
    backgroundColor: '#FFFFFF',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 22,
  },
  warning: {
    maxWidth: 360,
    marginTop: 24,
    padding: 14,
    flexDirection: 'row',
    gap: 12,
    borderRadius: 14,
  },
  warningText: {
    minWidth: 0,
    flex: 1,
    fontSize: 13,
    lineHeight: 19,
    ...fontStyle('regular'),
  },
});

export default GiftCardQrModal;
