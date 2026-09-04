import {StyleSheet} from 'react-native';
import {fontStyle} from '../../globals/fonts';

const createSpendableKeyRequestInfoStyles = theme =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    scrollContent: {
      paddingHorizontal: theme.spacing.lg,
      paddingTop: theme.spacing.md,
      paddingBottom: theme.spacing.md,
    },
    scrollEndSpacer: {
      height: theme.spacing.sm,
    },
    header: {
      marginBottom: theme.spacing.sm,
    },
    mainTitle: {
      color: theme.colors.textPrimary,
      letterSpacing: 0,
      ...theme.typography.headlineLg,
    },
    subtitle: {
      color: theme.colors.textSecondary,
      fontSize: 14,
      lineHeight: 20,
      letterSpacing: 0,
      marginTop: 10,
      ...fontStyle('regular'),
    },
    centerContent: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: theme.spacing.xl,
    },
    loadingText: {
      color: theme.colors.textPrimary,
      fontSize: 18,
      lineHeight: 24,
      letterSpacing: 0,
      marginTop: theme.spacing.md,
      textAlign: 'center',
      ...fontStyle('semiBold'),
    },
    loadingDescription: {
      color: theme.colors.textSecondary,
      fontSize: 14,
      lineHeight: 20,
      letterSpacing: 0,
      marginTop: theme.spacing.sm,
      textAlign: 'center',
      ...fontStyle('regular'),
    },
    passwordScreen: {
      flex: 1,
    },
    passwordNavigation: {
      alignItems: 'flex-start',
      height: 44,
      justifyContent: 'center',
      paddingHorizontal: theme.spacing.md,
    },
    passwordScrollContent: {
      flexGrow: 1,
      justifyContent: 'flex-start',
      paddingHorizontal: theme.spacing.screenPadding,
      paddingTop: theme.spacing.stepTop,
      paddingBottom: theme.spacing.lg,
    },
    passwordScrollContentSmallDevice: {
      paddingTop: theme.spacing.stepTopSmallDevice,
    },
    passwordScrollContentWithBack: {
      paddingTop: 10,
    },
    passwordContent: {
      width: '100%',
      maxWidth: 360,
      alignSelf: 'center',
    },
    passwordTitle: {
      color: theme.colors.textPrimary,
      marginBottom: 18,
      ...theme.typography.headlineLg,
    },
    passwordDescription: {
      color: theme.colors.textSecondary,
      ...theme.typography.bodyMd,
      marginBottom: theme.spacing.lg,
    },
    passwordHeroIcon: {
      marginBottom: theme.spacing.lg,
    },
    scannerContainer: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    amountHero: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: theme.spacing.xl,
    },
    amountHeroRow: {
      alignItems: 'baseline',
      flexDirection: 'row',
      justifyContent: 'center',
      marginTop: 10,
      maxWidth: '100%',
    },
    amountHeroValue: {
      color: theme.colors.textPrimary,
      flexShrink: 1,
      fontSize: 42,
      lineHeight: 50,
      letterSpacing: -1.2,
      maxWidth: '72%',
      textAlign: 'right',
      ...fontStyle('semiBold'),
    },
    amountHeroCurrency: {
      color: theme.colors.textSecondary,
      flexShrink: 1,
      fontSize: 16,
      lineHeight: 21,
      marginLeft: 8,
      maxWidth: '40%',
      ...fontStyle('semiBold'),
    },
    chainLabel: {
      color: theme.colors.textSubtle,
      fontSize: 12,
      lineHeight: 17,
      letterSpacing: 0.7,
      textAlign: 'center',
      textTransform: 'uppercase',
      ...fontStyle('semiBold'),
    },
    countHero: {
      alignItems: 'center',
      paddingBottom: theme.spacing.lg,
      paddingTop: theme.spacing.lg,
    },
    countHeroValue: {
      color: theme.colors.textPrimary,
      fontSize: 26,
      lineHeight: 33,
      letterSpacing: -0.4,
      marginTop: 8,
      textAlign: 'center',
      ...fontStyle('semiBold'),
    },
    itemSection: {
      marginBottom: theme.spacing.lg,
    },
    sectionTitle: {
      color: theme.colors.textSubtle,
      fontSize: 12,
      lineHeight: 17,
      letterSpacing: 0.7,
      marginBottom: 8,
      textTransform: 'uppercase',
      ...fontStyle('semiBold'),
    },
    systemGroup: {
      marginBottom: 14,
    },
    systemGroupLabel: {
      color: theme.colors.textSecondary,
      fontSize: 12,
      lineHeight: 17,
      marginBottom: 5,
      ...fontStyle('semiBold'),
    },
    flatRows: {
      borderBottomColor: theme.colors.border,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.colors.border,
      borderTopWidth: StyleSheet.hairlineWidth,
    },
    flatRow: {
      alignItems: 'center',
      flexDirection: 'row',
      minHeight: 46,
      paddingVertical: 10,
    },
    identityRow: {
      minHeight: 46,
      paddingVertical: 11,
    },
    flatRowBorder: {
      borderTopColor: theme.colors.border,
      borderTopWidth: StyleSheet.hairlineWidth,
    },
    rowTitle: {
      color: theme.colors.textPrimary,
      flex: 1,
      fontSize: 14,
      lineHeight: 20,
      minWidth: 0,
      ...fontStyle('semiBold'),
    },
    rowSubtitle: {
      color: theme.colors.textSecondary,
      fontSize: 12,
      lineHeight: 17,
      marginTop: 3,
      ...fontStyle('regular'),
    },
    rowWarningSubtitle: {
      color: theme.isDark ? theme.colors.warning : '#9A3412',
      ...fontStyle('semiBold'),
    },
    rowAmount: {
      color: theme.colors.textPrimary,
      fontSize: 14,
      lineHeight: 20,
      marginLeft: 16,
      maxWidth: '46%',
      textAlign: 'right',
      ...fontStyle('semiBold'),
    },
    transactionSection: {
      marginTop: theme.spacing.md,
    },
    transactionSummary: {
      color: theme.colors.textSecondary,
      fontSize: 14,
      lineHeight: 20,
      ...fontStyle('regular'),
    },
    txidCard: {
      backgroundColor: theme.colors.surfaceMuted,
      borderRadius: theme.rounded.md,
      padding: 12,
      marginTop: 12,
    },
    partialErrorText: {
      color: theme.isDark ? theme.colors.warning : '#9A3412',
      fontSize: 13,
      lineHeight: 19,
      marginTop: 8,
      ...fontStyle('regular'),
    },
    txidHeader: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 8,
      gap: 8,
    },
    txidLabel: {
      flex: 1,
      minWidth: 0,
      color: theme.colors.textPrimary,
      fontSize: 13,
      lineHeight: 18,
      ...fontStyle('semiBold'),
    },
    txidActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      marginLeft: 'auto',
    },
    txidValue: {
      color: theme.colors.textSecondary,
      fontSize: 12,
      lineHeight: 18,
      ...fontStyle('regular'),
    },
    explorerButton: {
      minWidth: 88,
    },
    warningCard: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      backgroundColor: theme.isDark
        ? 'rgba(255, 178, 92, 0.10)'
        : '#FFF7EC',
      borderColor: theme.isDark
        ? 'rgba(255, 178, 92, 0.36)'
        : 'rgba(248, 147, 54, 0.36)',
      borderWidth: StyleSheet.hairlineWidth,
      borderRadius: theme.rounded.lg,
      padding: 14,
      marginBottom: theme.spacing.md,
    },
    warningText: {
      flex: 1,
      color: theme.colors.textSecondary,
      fontSize: 13,
      lineHeight: 19,
      letterSpacing: 0,
      marginLeft: 8,
      ...fontStyle('regular'),
    },
    privateAddressOptionCard: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      backgroundColor: theme.colors.surfaceMuted,
      borderColor: theme.colors.border,
      borderWidth: StyleSheet.hairlineWidth,
      borderRadius: theme.rounded.lg,
      paddingHorizontal: 10,
      paddingVertical: 12,
      marginBottom: theme.spacing.md,
    },
    privateAddressOptionText: {
      flex: 1,
      minWidth: 0,
      paddingTop: 6,
      paddingRight: 6,
    },
    privateAddressOptionTitle: {
      color: theme.colors.textPrimary,
      fontSize: 14,
      lineHeight: 19,
      marginBottom: 4,
      ...fontStyle('semiBold'),
    },
    privateAddressOptionSubtitle: {
      color: theme.colors.textSecondary,
      fontSize: 13,
      lineHeight: 19,
      ...fontStyle('regular'),
    },
    criticalWarningCard: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      backgroundColor: theme.isDark
        ? 'rgba(255, 107, 117, 0.10)'
        : '#FFF2F3',
      borderColor: theme.isDark
        ? 'rgba(255, 107, 117, 0.38)'
        : 'rgba(242, 45, 55, 0.30)',
      borderWidth: StyleSheet.hairlineWidth,
      borderRadius: theme.rounded.lg,
      padding: 14,
      marginBottom: theme.spacing.md,
    },
    criticalWarningContent: {
      flex: 1,
      minWidth: 0,
      marginLeft: 10,
    },
    criticalWarningTitle: {
      color: theme.isDark ? theme.colors.danger : '#991B1B',
      fontSize: 15,
      lineHeight: 20,
      letterSpacing: 0,
      marginBottom: 6,
      ...fontStyle('semiBold'),
    },
    criticalWarningText: {
      color: theme.colors.textSecondary,
      fontSize: 13,
      lineHeight: 19,
      letterSpacing: 0,
      ...fontStyle('regular'),
    },
    authorityLineItem: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.isDark
        ? 'rgba(255, 178, 92, 0.10)'
        : '#FFF7EC',
      borderColor: theme.isDark
        ? 'rgba(255, 178, 92, 0.36)'
        : 'rgba(248, 147, 54, 0.36)',
      borderWidth: StyleSheet.hairlineWidth,
      borderRadius: theme.rounded.sm,
      paddingHorizontal: 8,
      paddingVertical: 7,
      marginTop: 8,
    },
    authorityLineIcon: {
      marginRight: 7,
    },
    authorityLineText: {
      flex: 1,
      minWidth: 0,
    },
    authorityLineLabel: {
      color: theme.isDark ? theme.colors.warning : '#9A3412',
      fontSize: 11,
      lineHeight: 15,
      letterSpacing: 0,
      marginBottom: 1,
      ...fontStyle('semiBold'),
    },
    authorityLineName: {
      color: theme.colors.textPrimary,
      fontSize: 13,
      lineHeight: 18,
      letterSpacing: 0,
      ...fontStyle('semiBold'),
    },
    footerInfoRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      marginBottom: 2,
    },
    footerInfoIcon: {
      marginRight: 8,
      marginTop: 1,
    },
    footerInfoText: {
      flex: 1,
      color: theme.colors.textSecondary,
      fontSize: 14,
      lineHeight: 20,
      letterSpacing: 0,
      ...fontStyle('regular'),
    },
    footer: {
      backgroundColor: theme.colors.background,
      paddingTop: theme.spacing.sm,
    },
  });

export default createSpendableKeyRequestInfoStyles;
