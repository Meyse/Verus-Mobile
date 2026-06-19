import {StyleSheet} from 'react-native';
import {fontStyle} from '../../globals/fonts';

const createDeepLinkRequestReviewStyles = theme =>
  StyleSheet.create({
    scrollView: {
      flex: 1,
    },
    scrollContent: {
      paddingHorizontal: theme.spacing.lg,
      paddingTop: theme.spacing.md,
      paddingBottom: theme.spacing.xl,
    },
    requesterCard: {
      marginBottom: theme.spacing.xl,
    },
    requesterLabel: {
      color: theme.colors.textSubtle,
      fontSize: 13,
      lineHeight: 18,
      letterSpacing: 0,
      marginBottom: 8,
      ...fontStyle('semiBold'),
    },
    requesterIdentityPanel: {
      minHeight: 64,
      borderRadius: 14,
      backgroundColor: theme.colors.surfaceMuted,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: 15,
      flexDirection: 'row',
      alignItems: 'center',
    },
    requesterTextContainer: {
      flex: 1,
      minWidth: 0,
    },
    requesterName: {
      color: theme.colors.textPrimary,
      fontSize: 22,
      lineHeight: 28,
      letterSpacing: 0,
      ...fontStyle('semiBold'),
    },
    requesterDetailsList: {
      marginTop: theme.spacing.sm,
    },
    requesterDetailRow: {
      minWidth: 0,
      minHeight: 45,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    requesterDetailRowDivider: {
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.colors.border,
    },
    requesterDetailLabel: {
      color: theme.colors.textSubtle,
      fontSize: 13,
      lineHeight: 18,
      letterSpacing: 0,
      marginRight: 12,
      minWidth: 76,
      ...fontStyle('regular'),
    },
    requesterDetailValue: {
      flex: 1,
      minWidth: 0,
      color: theme.colors.textPrimary,
      fontSize: 13,
      lineHeight: 18,
      letterSpacing: 0,
      textAlign: 'right',
      ...fontStyle('semiBold'),
    },
    requestDetailsLinkTouch: {
      minHeight: 44,
      justifyContent: 'center',
      alignItems: 'flex-start',
      marginTop: theme.spacing.sm,
    },
    requestDetailsLinkText: {
      color: theme.colors.textPrimary,
      fontSize: 16,
      lineHeight: 22,
      letterSpacing: 0,
      ...fontStyle('semiBold'),
    },
    requestSheetBody: {
      paddingHorizontal: theme.spacing.sheetPadding,
      paddingTop: 8,
      paddingBottom: 22,
    },
    requestSheetHeader: {
      minHeight: 36,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 14,
    },
    requestSheetHeaderText: {
      flex: 1,
      minWidth: 0,
    },
    requestSheetTitle: {
      color: theme.colors.textPrimary,
      letterSpacing: 0,
      ...theme.typography.titleSheet,
    },
    requestSheetSubtitle: {
      color: theme.colors.textSecondary,
      fontSize: 13,
      lineHeight: 19,
      letterSpacing: 0,
      marginTop: 4,
      ...fontStyle('regular'),
    },
    requestSheetScrollFrame: {
      position: 'relative',
      flexGrow: 0,
      flexShrink: 1,
      overflow: 'hidden',
    },
    requestSheetScroll: {
      flexGrow: 0,
      flexShrink: 1,
    },
    requestSheetContent: {
      paddingBottom: theme.spacing.xs,
    },
    requestSheetActionButton: {
      marginTop: 22,
    },
    requestSheetScrollCue: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      height: 46,
      alignItems: 'center',
      justifyContent: 'flex-end',
    },
    requestSheetScrollCueChevron: {
      position: 'absolute',
      bottom: 2,
      width: 20,
      height: 18,
      alignItems: 'center',
      justifyContent: 'center',
    },
    requestSheetState: {
      minHeight: 112,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: theme.spacing.lg,
    },
    requestSheetStateTitle: {
      color: theme.colors.textPrimary,
      fontSize: 16,
      lineHeight: 22,
      letterSpacing: 0,
      textAlign: 'center',
      marginBottom: 4,
      ...fontStyle('semiBold'),
    },
    requestSheetStateText: {
      color: theme.colors.textSecondary,
      fontSize: 14,
      lineHeight: 20,
      letterSpacing: 0,
      textAlign: 'center',
      marginTop: 8,
      ...fontStyle('regular'),
    },
    requestInfoSection: {
      marginTop: theme.spacing.md,
    },
    requestInfoSectionTitle: {
      color: theme.colors.textSubtle,
      fontSize: 13,
      lineHeight: 18,
      letterSpacing: 0,
      marginBottom: 6,
      ...fontStyle('semiBold'),
    },
    requestInfoRows: {
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.colors.border,
    },
    requestInfoRow: {
      paddingVertical: 9,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.colors.border,
    },
    requestInfoLabel: {
      color: theme.colors.textSubtle,
      fontSize: 12,
      lineHeight: 17,
      letterSpacing: 0,
      marginBottom: 3,
      ...fontStyle('semiBold'),
    },
    requestInfoValue: {
      color: theme.colors.textPrimary,
      fontSize: 15,
      lineHeight: 21,
      letterSpacing: 0,
      ...fontStyle('regular'),
    },
  });

export default createDeepLinkRequestReviewStyles;
