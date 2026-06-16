import {StyleSheet} from 'react-native';
import {fontStyle} from '../../globals/fonts';

const createAppEncryptionRequestInfoStyles = theme =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    header: {
      marginBottom: 28,
    },
    mainTitle: {
      color: theme.colors.textPrimary,
      letterSpacing: 0,
      ...theme.typography.headlineLg,
    },
    mainSubtitle: {
      color: theme.colors.textSecondary,
      fontSize: 14,
      lineHeight: 20,
      letterSpacing: 0,
      marginTop: 12,
      ...fontStyle('regular'),
    },
    warningCard: {
      marginBottom: theme.spacing.lg,
      padding: theme.spacing.md,
      borderRadius: 16,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.isDark
        ? 'rgba(255, 178, 92, 0.38)'
        : 'rgba(248, 147, 54, 0.38)',
      backgroundColor: theme.isDark
        ? 'rgba(255, 178, 92, 0.11)'
        : '#FFF5E8',
    },
    warningHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 7,
    },
    warningTitle: {
      flex: 1,
      minWidth: 0,
      color: theme.colors.textPrimary,
      fontSize: 15,
      lineHeight: 20,
      letterSpacing: 0,
      ...fontStyle('semiBold'),
    },
    warningText: {
      color: theme.colors.textSecondary,
      fontSize: 13,
      lineHeight: 19,
      letterSpacing: 0,
      ...fontStyle('regular'),
    },
    warningEmphasis: {
      color: theme.colors.textPrimary,
      fontSize: 13,
      lineHeight: 19,
      letterSpacing: 0,
      marginTop: 8,
      ...fontStyle('semiBold'),
    },
    footer: {
      backgroundColor: theme.colors.background,
      paddingTop: theme.spacing.sm,
    },
    footerInfoRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 8,
      marginBottom: theme.spacing.xs,
    },
    footerInfoIcon: {
      width: 16,
      height: 20,
      alignItems: 'center',
      justifyContent: 'center',
    },
    footerInfoText: {
      flex: 1,
      color: theme.colors.textSecondary,
      fontSize: 14,
      lineHeight: 20,
      letterSpacing: 0,
      ...fontStyle('regular'),
    },
    footerWarningCard: {
      borderRadius: 16,
      backgroundColor: theme.isDark
        ? 'rgba(255, 178, 92, 0.10)'
        : '#FFF7EC',
      paddingHorizontal: theme.spacing.md,
      paddingVertical: 12,
    },
    footerWarningTitle: {
      color: theme.colors.textPrimary,
      fontSize: 14,
      lineHeight: 19,
      letterSpacing: 0,
      marginBottom: 5,
      ...fontStyle('semiBold'),
    },
    footerWarningText: {
      color: theme.colors.textSecondary,
      fontSize: 12,
      lineHeight: 17,
      letterSpacing: 0,
      ...fontStyle('regular'),
    },
    selectedIdentityLabel: {
      color: theme.colors.textSubtle,
      fontSize: 13,
      lineHeight: 18,
      letterSpacing: 0,
      marginBottom: 8,
      ...fontStyle('semiBold'),
    },
    selectedIdentityCard: {
      height: 56,
      borderRadius: 18,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: 0,
      backgroundColor: theme.colors.successBackground,
      flexDirection: 'row',
      alignItems: 'center',
    },
    selectedIdentityText: {
      flex: 1,
      minWidth: 0,
      paddingRight: 10,
    },
    selectedIdentityName: {
      color: theme.colors.textPrimary,
      fontSize: 17,
      lineHeight: 22,
      letterSpacing: 0,
      ...fontStyle('semiBold'),
    },
    selectedIdentityCheck: {
      width: 24,
      height: 24,
      alignItems: 'center',
      justifyContent: 'center',
      marginLeft: 2,
    },
    loadingSheetContainer: {
      paddingTop: 0,
    },
    loadingSheetBody: {
      minHeight: 170,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: theme.spacing.sheetPadding,
      paddingVertical: theme.spacing.lg,
    },
    loadingAnimation: {
      width: 96,
      height: 70,
      marginBottom: 4,
    },
    loadingTitle: {
      color: theme.colors.textPrimary,
      fontSize: 16,
      lineHeight: 22,
      letterSpacing: 0,
      textAlign: 'center',
      ...fontStyle('semiBold'),
    },
    loadingSubtitle: {
      color: theme.colors.textSecondary,
      fontSize: 13,
      lineHeight: 19,
      letterSpacing: 0,
      textAlign: 'center',
      marginTop: 4,
      ...fontStyle('regular'),
    },
  });

export default createAppEncryptionRequestInfoStyles;
