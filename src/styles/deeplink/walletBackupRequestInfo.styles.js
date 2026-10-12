import {StyleSheet} from 'react-native';
import {fontStyle} from '../../globals/fonts';

const createWalletBackupRequestInfoStyles = theme =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    keyboardFrame: {
      flex: 1,
    },
    header: {
      marginBottom: 28,
    },
    mainSubtitle: {
      color: theme.colors.textSecondary,
      fontSize: 14,
      lineHeight: 20,
      letterSpacing: 0,
      marginTop: 12,
      ...fontStyle('regular'),
    },
    inputStack: {
      gap: 12,
      marginBottom: theme.spacing.sm,
    },
    passwordStack: {
      gap: 12,
      marginTop: theme.spacing.xs,
      marginBottom: theme.spacing.sm,
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
  });

export default createWalletBackupRequestInfoStyles;
