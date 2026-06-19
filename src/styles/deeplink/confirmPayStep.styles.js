/*
  ConfirmPayStep.styles 
  - Payment-source, fee, and source-sheet styles for the final request step.
*/
import { Platform, StyleSheet } from 'react-native';

const monospaceFont = Platform.select({
  ios: 'Menlo',
  android: 'monospace',
  default: 'monospace',
});

const IDENTITY_UPDATE_COMPLETION_SHEET_HEIGHT = 360;

// extracted payment-step styling to keep fee and signing logic focused.
const createConfirmPayStepStyles = theme => StyleSheet.create({
  feeCard: {
    backgroundColor: theme.colors.surfaceMuted,
    borderRadius: 18,
    padding: 16,
    marginBottom: 28,
  },
  feeLabel: {
    fontSize: 11,
    color: theme.colors.textSubtle,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0,
    marginBottom: 4,
  },
  feeContent: {
    height: 38,
    justifyContent: 'center',
  },
  feeValue: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  feeFiat: {
    fontSize: 13,
    color: theme.colors.textSubtle,
    marginTop: 2,
  },
  feePlaceholder: {
    fontSize: 14,
    color: theme.colors.textSubtle,
    fontStyle: 'italic',
  },
  feeCalculatingRow: {
    height: 38,
    flexDirection: 'row',
    alignItems: 'center',
  },
  feeLoadingAnimation: {
    width: 36,
    height: 36,
    marginLeft: -4,
    marginRight: 8,
  },
  feeCalculating: {
    color: theme.colors.textPrimary,
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '600',
    letterSpacing: 0,
  },
  recapCard: {
    marginBottom: 12,
  },
  recapTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginBottom: 8,
  },
  recapRow: {
    minWidth: 0,
    minHeight: 45,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  recapRowDivider: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.colors.border,
  },
  recapLabel: {
    color: theme.colors.textSubtle,
    fontSize: 13,
    lineHeight: 18,
    letterSpacing: 0,
    marginRight: 12,
    minWidth: 118,
  },
  recapValue: {
    flex: 1,
    minWidth: 0,
    color: theme.colors.textPrimary,
    fontSize: 13,
    lineHeight: 18,
    letterSpacing: 0,
    fontWeight: '600',
    textAlign: 'right',
  },
  selectedSourceLabel: {
    color: theme.colors.textSubtle,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600',
    letterSpacing: 0,
    marginBottom: 8,
  },
  selectedSourceCard: {
    height: 56,
    borderRadius: 18,
    paddingHorizontal: 16,
    backgroundColor: theme.colors.successBackground,
    flexDirection: 'row',
    alignItems: 'center',
  },
  selectedSourceText: {
    flex: 1,
    minWidth: 0,
    paddingRight: 10,
  },
  selectedSourceName: {
    color: theme.colors.textPrimary,
    fontSize: 17,
    lineHeight: 22,
    fontWeight: '600',
    letterSpacing: 0,
  },
  selectedSourceNameMono: {
    fontFamily: monospaceFont,
  },
  selectedSourceCheck: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 2,
  },
  sheetBody: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 18,
  },
  sheetTitle: {
    color: theme.colors.textPrimary,
    fontSize: 20,
    lineHeight: 26,
    fontWeight: '600',
    letterSpacing: 0,
    marginBottom: 14,
  },
  sheetListContainer: {
    paddingBottom: 4,
  },
  sheetEmpty: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
  },
  sheetEmptyText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
  walletCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surfaceMuted,
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  walletCardSelected: {
    backgroundColor: theme.colors.successBackground,
  },
  walletTextSection: {
    flex: 1,
    minWidth: 0,
    paddingRight: 10,
  },
  walletNameText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  walletNameMonoText: {
    fontFamily: monospaceFont,
  },
  walletBalanceSection: {
    alignItems: 'flex-end',
  },
  walletBalanceAmount: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  walletBalanceTicker: {
    fontSize: 11,
    color: theme.colors.textSubtle,
    marginTop: 1,
  },
  encryptedKeyRecapRow: {
    backgroundColor: theme.isDark
      ? 'rgba(49, 101, 212, 0.18)'
      : '#EBF6FF',
    borderRadius: 16,
    padding: 12,
    marginTop: 8,
  },
  encryptedKeyRecapText: {
    fontSize: 12,
    lineHeight: 17,
    color: theme.colors.primary,
  },
  broadcastSheet: {
    height: IDENTITY_UPDATE_COMPLETION_SHEET_HEIGHT,
    paddingTop: 0,
  },
  broadcastSheetBody: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 24,
    gap: 8,
  },
  broadcastVisualSlot: {
    height: 84,
    alignItems: 'center',
    justifyContent: 'center',
  },
  broadcastLoadingAnimation: {
    width: 96,
    height: 70,
  },
  broadcastSuccessAnimation: {
    width: 84,
    height: 84,
  },
  broadcastTitle: {
    color: theme.colors.textPrimary,
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0,
    lineHeight: 22,
    textAlign: 'center',
  },
  broadcastMessage: {
    color: theme.colors.textSecondary,
    fontSize: 14,
    letterSpacing: 0,
    lineHeight: 20,
    textAlign: 'center',
  },
  txidCard: {
    alignSelf: 'stretch',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.colors.border,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.border,
    marginTop: 4,
    paddingVertical: 10,
  },
  txidRow: {
    minHeight: 32,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  txidLabel: {
    color: theme.colors.textSubtle,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0,
    lineHeight: 17,
    marginBottom: 3,
    textTransform: 'uppercase',
  },
  txidCopyButton: {
    marginRight: -10,
  },
  txidValue: {
    flex: 1,
    minWidth: 0,
    color: theme.colors.textPrimary,
    fontFamily: monospaceFont,
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: 0,
    lineHeight: 20,
    paddingRight: 10,
  },
  completeButton: {
    alignSelf: 'stretch',
    marginTop: 6,
  },
  redirectCompleteHint: {
    alignSelf: 'stretch',
    color: theme.colors.textSubtle,
    fontSize: 12,
    letterSpacing: 0,
    lineHeight: 16,
    marginTop: 2,
    textAlign: 'center',
  },
  deliveryActions: {
    alignSelf: 'stretch',
    gap: 4,
    marginTop: 6,
  },
  deliveryActionButton: {
    alignSelf: 'stretch',
  },
});

export default createConfirmPayStepStyles;
