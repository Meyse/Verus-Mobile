import {StyleSheet} from 'react-native';

export const NFC_TAP_SYMBOL_SIZE = 132;
export const NFC_TAP_CIRCLE_SIZE = 96;
const ACTION_HEIGHT = 56;
const ACTION_GAP = 10;

// Room for two 56-point actions, so the symbol and text do not move when the
// actions appear.
export const NFC_TAP_ACTIONS_MIN_HEIGHT = ACTION_HEIGHT * 2 + ACTION_GAP;

const createNfcTapStyles = theme =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    body: {
      flex: 1,
      alignItems: 'center',
      paddingHorizontal: theme.spacing.lg,
    },
    // Android: the middle of the screen, over the reader in most phones.
    bodyCentered: {
      justifyContent: 'center',
    },
    // iPhone: the top, above the iOS scan sheet and near the reader.
    bodyTop: {
      justifyContent: 'flex-start',
      paddingTop: 40,
    },
    symbol: {
      width: NFC_TAP_SYMBOL_SIZE,
      height: NFC_TAP_SYMBOL_SIZE,
    },
    layer: {
      ...StyleSheet.absoluteFillObject,
      alignItems: 'center',
      justifyContent: 'center',
    },
    circle: {
      width: NFC_TAP_CIRCLE_SIZE,
      height: NFC_TAP_CIRCLE_SIZE,
      borderRadius: NFC_TAP_CIRCLE_SIZE / 2,
    },
    ripple: {
      width: NFC_TAP_CIRCLE_SIZE,
      height: NFC_TAP_CIRCLE_SIZE,
      borderRadius: NFC_TAP_CIRCLE_SIZE / 2,
      borderWidth: 3,
      borderColor: theme.colors.success,
    },
    text: {
      alignItems: 'center',
      marginTop: theme.spacing.md,
      maxWidth: 320,
    },
    title: {
      ...theme.typography.titleSheet,
      color: theme.colors.textPrimary,
      textAlign: 'center',
    },
    detail: {
      ...theme.typography.bodySm,
      color: theme.colors.textSecondary,
      marginTop: theme.spacing.xs,
      textAlign: 'center',
    },
    actions: {
      minHeight: NFC_TAP_ACTIONS_MIN_HEIGHT,
      justifyContent: 'flex-end',
      gap: ACTION_GAP,
    },
  });

export default createNfcTapStyles;
