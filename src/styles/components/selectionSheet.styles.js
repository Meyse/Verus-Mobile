import {Platform, StyleSheet} from 'react-native';

export const createSelectionSheetStyles = theme =>
  StyleSheet.create({
    body: {flexShrink: 1},
    fill: {flex: 1},
    headerContent: {marginBottom: 10},
    header: {minHeight: 36, justifyContent: 'center', marginBottom: 14},
    title: {...theme.typography.titleSheet, color: theme.colors.textPrimary},
    subtitle: {
      ...theme.typography.bodySm,
      color: theme.colors.textSecondary,
      marginTop: 4,
    },
    group: {marginTop: 12},
    groupTitle: {
      ...theme.typography.bodySm,
      color: theme.colors.textSecondary,
      marginBottom: 8,
    },
    row: {
      minHeight: 56,
      borderRadius: 18,
      paddingHorizontal: 16,
      paddingVertical: 12,
      marginVertical: 4,
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.surfaceMuted,
    },
    selectedRow: {backgroundColor: theme.colors.successBackground},
    leading: {marginRight: 12},
    copy: {flex: 1, minWidth: 0},
    rowTitle: {...theme.typography.titleRow, color: theme.colors.textPrimary},
    rowSubtitle: {
      ...theme.typography.bodySm,
      color: theme.colors.textSecondary,
      marginTop: 3,
    },
    identifier: {fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace'},
    value: {alignItems: 'flex-end', marginLeft: 12, flexShrink: 1},
    valueText: {...theme.typography.titleRow, color: theme.colors.textPrimary},
    valueLabel: {...theme.typography.bodySm, color: theme.colors.textSecondary},
    indicator: {marginLeft: 10, width: 22, alignItems: 'center'},
    action: {
      minHeight: 62,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    actionText: {...theme.typography.titleRow, color: theme.colors.textPrimary},
    empty: {
      ...theme.typography.bodySm,
      color: theme.colors.textSecondary,
      paddingVertical: 20,
    },
  });
