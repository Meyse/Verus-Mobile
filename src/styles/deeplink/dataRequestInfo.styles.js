import {Platform, StyleSheet} from 'react-native';
import createAppEncryptionRequestInfoStyles from './appEncryptionRequestInfo.styles';

const createDataRequestInfoStyles = theme => ({
  ...createAppEncryptionRequestInfoStyles(theme),
  ...StyleSheet.create({
    section: {marginTop: 24},
    item: {
      paddingVertical: 20,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.colors.border,
    },
    itemTitle: {
      ...theme.typography.titleRow,
      color: theme.colors.textPrimary,
      marginBottom: 8,
    },
    body: {...theme.typography.bodySm, color: theme.colors.textSecondary},
    value: {...theme.typography.bodyMd, color: theme.colors.textPrimary},
    field: {marginTop: 10},
    fieldLabel: {
      ...theme.typography.caption,
      color: theme.colors.textSecondary,
      marginBottom: 3,
    },
    detailsLink: {
      minHeight: 44,
      justifyContent: 'center',
      alignSelf: 'flex-start',
    },
    detailsLinkText: {...theme.typography.labelMd, color: theme.colors.primary},
    consentRow: {
      minHeight: 48,
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 8,
    },
    consentText: {
      ...theme.typography.bodySm,
      color: theme.colors.textPrimary,
      flex: 1,
      paddingLeft: 4,
    },
    notice: {paddingVertical: 20},
    noticeTitle: {
      ...theme.typography.titleRow,
      color: theme.colors.textPrimary,
      marginBottom: 6,
    },
    error: {
      ...theme.typography.bodySm,
      color: theme.colors.danger,
    },
    loading: {paddingVertical: 24, gap: 16},
    detailField: {
      paddingVertical: 12,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.colors.border,
    },
    detailLabelRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    detailLabel: {
      ...theme.typography.labelMd,
      color: theme.colors.textSecondary,
      flex: 1,
    },
    technicalValue: {
      ...theme.typography.bodySm,
      color: theme.colors.textPrimary,
      fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
      marginTop: 8,
    },
  }),
});

export default createDataRequestInfoStyles;
