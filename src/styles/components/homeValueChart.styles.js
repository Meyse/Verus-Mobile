import { StyleSheet } from 'react-native';

export default StyleSheet.create({
  block: { paddingBottom: 8 },
  chart: { marginHorizontal: 20 },
  ranges: { flexDirection: 'row', justifyContent: 'space-between', marginHorizontal: 28 },
  range: { width: 44, alignItems: 'center', justifyContent: 'center' },
  selected: { fontWeight: '700' },
  tabular: { fontVariant: ['tabular-nums'] },
  day1: { marginTop: 4, marginHorizontal: 20, marginBottom: 14 },
  skeleton: { marginHorizontal: 20, paddingTop: 28 },
  label: {
    position: 'absolute', top: 0, height: 22, maxWidth: '100%',
  },
  pill: {
    height: 24, borderRadius: 12, paddingHorizontal: 9, paddingVertical: 3,
  },
  pillSlot: { marginLeft: 8, marginTop: 8, flexShrink: 0 },
  pillBelow: { alignSelf: 'flex-start', marginLeft: 0, marginTop: 8 },
  hidden: { opacity: 0 },
  compactAmountRow: { marginTop: 12, marginBottom: 0 },
  compactBalanceRow: { marginBottom: 0 },
  amountGroup: {
    flexDirection: 'row', alignItems: 'flex-start', flexShrink: 1, minWidth: 0,
  },
  amountWithPill: { flex: 0, flexShrink: 1 },
  amountFullRow: { flex: 0, flexShrink: 0, width: '100%' },
  wrap: { flexDirection: 'column' },
  // Measure unshrunk text before deciding whether the badge needs its own row.
  measure: { position: 'absolute', width: 10000, opacity: 0 },
});
