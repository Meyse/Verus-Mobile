import React, {useMemo} from 'react';
import {
  FlatList,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import BottomSheetModal from '../../../components/BottomSheetModal';
import {fontStyle} from '../../../globals/fonts';
import {useOnboardingTheme} from '../../../theme/onboarding';
import {RenderPlainCoinLogo} from '../../../utils/CoinData/Graphics';
import {truncateDecimal} from '../../../utils/math';
import BigNumber from 'bignumber.js';

const SheetHeader = ({onClose, title}) => {
  const theme = useOnboardingTheme();
  return (
    <View style={styles.header}>
      <View style={styles.headerSide} />
      <Text style={[styles.title, {color: theme.colors.textPrimary}]}>{title}</Text>
      <TouchableOpacity
        accessibilityLabel={`Close ${title}`}
        accessibilityRole="button"
        onPress={onClose}
        style={[styles.close, {backgroundColor: theme.colors.surfaceMuted}]}>
        <MaterialCommunityIcons name="close" size={18} color={theme.colors.textPrimary} />
      </TouchableOpacity>
    </View>
  );
};

export const SourceCardSheet = ({
  cards,
  description = 'Your asset has multiple Cards. Select which Card to send from.',
  onClose,
  onSelect,
  selectedId,
  visible,
}) => {
  const theme = useOnboardingTheme();
  const groups = useMemo(() => {
    const map = new Map();
    cards.forEach(source => {
      const network = source.card.network || source.coin.system_id || 'Verus';
      if (!map.has(network)) map.set(network, []);
      map.get(network).push(source);
    });
    return [...map.entries()];
  }, [cards]);

  return (
    <BottomSheetModal floating={false} maxHeight="70%" onClose={onClose} visible={visible}>
      <SheetHeader title="Select source" onClose={onClose} />
      <Text style={[styles.description, {color: theme.colors.textSecondary}]}>
        {description}
      </Text>
      <ScrollView contentContainerStyle={styles.list}>
        {groups.map(([network, sources]) => (
          <View key={network} style={styles.networkGroup}>
            <View style={styles.networkHeader}>
              {RenderPlainCoinLogo(
                sources[0]?.coin?.system_id || sources[0]?.coin?.id || 'VRSC',
                {},
                24,
                24,
              )}
              <Text style={[styles.networkTitle, {color: theme.colors.textSecondary}]}>{network}</Text>
            </View>
            {sources.map(source => (
              <TouchableOpacity
                key={source.card.id}
                onPress={() => onSelect(source)}
                style={[
                  styles.sourceCard,
                  {backgroundColor: theme.colors.surfaceMuted},
                  source.card.id === selectedId && {
                    borderColor: theme.colors.primary,
                    borderWidth: 1,
                  },
                ]}>
                <Text numberOfLines={1} style={[styles.sourceName, {color: theme.colors.textPrimary}]}>{source.card.name}</Text>
                <View style={styles.sourceBalance}>
                  <Text style={[styles.sourceAmount, {color: theme.colors.textPrimary}]}>{truncateDecimal(source.balance, 4)}</Text>
                  <Text style={[styles.sourceTicker, {color: theme.colors.textSecondary}]}>{source.coin.display_ticker}</Text>
                </View>
                <MaterialCommunityIcons
                  name={source.card.id === selectedId ? 'check' : 'chevron-right'}
                  size={20}
                  color={source.card.id === selectedId ? theme.colors.primary : theme.colors.textSubtle}
                />
              </TouchableOpacity>
            ))}
          </View>
        ))}
      </ScrollView>
    </BottomSheetModal>
  );
};

export const TargetNetworkSheet = ({
  onClose,
  onSelect,
  options,
  target,
  visible,
}) => {
  const theme = useOnboardingTheme();

  return (
    <BottomSheetModal
      floating={false}
      maxHeight="70%"
      onClose={onClose}
      visible={visible}>
      <SheetHeader title="Select network" onClose={onClose} />
      <Text style={[styles.description, {color: theme.colors.textSecondary}]}>{`${
        target?.ticker || target?.name || 'This asset'
      } is available on multiple networks. Choose where the recipient should receive it.`}</Text>
      <FlatList
        data={options}
        keyExtractor={item => `${item.networkKey}:${item.transactionCurrency}`}
        renderItem={({item}) => (
          <TouchableOpacity
            onPress={() => onSelect(item)}
            style={[
              styles.routeCard,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.border,
              },
            ]}>
            <View
              style={[
                styles.routeAccent,
                {backgroundColor: theme.colors.primary},
              ]}
            />
            <View style={styles.routeIcon}>
              {RenderPlainCoinLogo(
                item.networkIcon || item.coinId || item.id,
                {},
                28,
                28,
              )}
            </View>
            <View style={styles.routeCopy}>
              <View style={styles.routeBadgeRow}>
                {item.isSameNetwork ? (
                  <Text style={[styles.routeBadge, {color: theme.colors.primary}]}>SAME NETWORK</Text>
                ) : null}
              </View>
              <Text
                style={[
                  styles.routeTitle,
                  {color: theme.colors.textPrimary},
                ]}>{`${item.networkName} network`}</Text>
              <Text style={[styles.routeDetail, {color: theme.colors.textSecondary}]}>{`Receive as ${
                item.ticker || item.name
              }`}</Text>
            </View>
            <MaterialCommunityIcons
              name="chevron-right"
              size={20}
              color={theme.colors.textSubtle}
            />
          </TouchableOpacity>
        )}
        contentContainerStyle={styles.list}
      />
    </BottomSheetModal>
  );
};

export const RouteSheet = ({
  estimates = {},
  onClose,
  onSelect,
  routes,
  selectedKey,
  target,
  title = 'Select conversion route',
  visible,
}) => {
  const theme = useOnboardingTheme();
  const bestRouteKey = useMemo(() => {
    let best = null;

    routes.forEach(route => {
      const output = estimates[route.key]?.estimatedcurrencyout;
      if (output == null) return;
      const amount = BigNumber(output);
      if (!amount.isFinite()) return;
      if (!best || amount.isGreaterThan(best.amount)) {
        best = {amount, key: route.key};
      }
    });

    return best?.key || null;
  }, [estimates, routes]);

  return (
    <BottomSheetModal floating={false} maxHeight="70%" onClose={onClose} visible={visible}>
      <SheetHeader title={title} onClose={onClose} />
      <Text style={[styles.description, {color: theme.colors.textSecondary}]}>{`Choose how the recipient receives ${
        target?.ticker || target?.name || ''
      }.`}</Text>
      <FlatList
        data={routes}
        keyExtractor={item => item.key}
        renderItem={({item}) => {
          const selected = item.key === selectedKey;
          const estimate = estimates[item.key]?.estimatedcurrencyout;

          return (
            <TouchableOpacity
              onPress={() => onSelect(item)}
              style={[
                styles.routeCard,
                {
                  backgroundColor: theme.colors.surface,
                  borderColor: selected
                    ? theme.colors.primary
                    : theme.colors.border,
                },
              ]}>
              <View
                style={[
                  styles.routeAccent,
                  {backgroundColor: theme.colors.primary},
                ]}
              />
              <View
                style={[
                  styles.routeIcon,
                  {backgroundColor: theme.colors.surfaceMuted},
                ]}>
                <MaterialCommunityIcons
                  name={
                    item.isCrossChain ? 'swap-horizontal' : 'link-variant'
                  }
                  size={22}
                  color={theme.colors.textPrimary}
                />
              </View>
              <View style={styles.routeCopy}>
                <View style={styles.routeBadgeRow}>
                  {item.key === bestRouteKey ? (
                    <Text
                      style={[
                        styles.bestBadge,
                        {backgroundColor: theme.colors.primary},
                      ]}>
                      BEST
                    </Text>
                  ) : null}
                </View>
                <Text
                  style={[
                    styles.routeTitle,
                    {color: theme.colors.textPrimary},
                  ]}>
                  {item.label}
                </Text>
                <Text
                  style={[
                    styles.routeDetail,
                    {color: theme.colors.textSecondary},
                  ]}>
                  {item.via
                    ? 'Conversion through an intermediate currency'
                    : 'Direct conversion route'}
                </Text>
                {estimate != null ? (
                  <Text
                    style={[
                      styles.routeEstimate,
                      {color: theme.colors.textPrimary},
                    ]}>{`≈ ${truncateDecimal(BigNumber(estimate), 8)} ${
                    target?.ticker || ''
                  }`}</Text>
                ) : null}
              </View>
              <MaterialCommunityIcons
                name={selected ? 'check-circle' : 'chevron-right'}
                size={20}
                color={
                  selected ? theme.colors.primary : theme.colors.textSubtle
                }
              />
            </TouchableOpacity>
          );
        }}
        contentContainerStyle={styles.list}
      />
    </BottomSheetModal>
  );
};

const styles = StyleSheet.create({
  header: {minHeight: 54, paddingHorizontal: 16, paddingVertical: 8, flexDirection: 'row', alignItems: 'center'},
  headerSide: {width: 34, height: 34},
  title: {flex: 1, textAlign: 'center', fontSize: 16, lineHeight: 22, ...fontStyle('semiBold')},
  close: {width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center'},
  description: {paddingHorizontal: 20, paddingBottom: 16, fontSize: 14, lineHeight: 20, ...fontStyle('regular')},
  list: {paddingHorizontal: 16, paddingBottom: 20},
  networkGroup: {marginBottom: 20},
  networkHeader: {height: 28, paddingHorizontal: 4, marginBottom: 10, flexDirection: 'row', alignItems: 'center'},
  networkTitle: {marginLeft: 10, fontSize: 13, lineHeight: 18, letterSpacing: 0.5, textTransform: 'uppercase', ...fontStyle('bold')},
  sourceCard: {minHeight: 68, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 14, marginBottom: 8, flexDirection: 'row', alignItems: 'center'},
  sourceName: {flex: 1, fontSize: 15, lineHeight: 20, ...fontStyle('semiBold')},
  sourceBalance: {alignItems: 'flex-end', marginRight: 8},
  sourceAmount: {fontSize: 16, lineHeight: 22, ...fontStyle('bold')},
  sourceTicker: {fontSize: 11, lineHeight: 15, marginTop: 1, ...fontStyle('regular')},
  routeCard: {minHeight: 92, borderRadius: 14, borderWidth: 1, marginBottom: 10, padding: 14, overflow: 'hidden', flexDirection: 'row', alignItems: 'center'},
  routeAccent: {position: 'absolute', left: 0, top: 0, bottom: 0, width: 4},
  routeIcon: {width: 40, height: 40, borderRadius: 10, marginRight: 12, alignItems: 'center', justifyContent: 'center'},
  routeCopy: {flex: 1},
  routeBadgeRow: {minHeight: 14, marginBottom: 2, flexDirection: 'row', alignItems: 'center'},
  routeBadge: {fontSize: 10, lineHeight: 14, letterSpacing: 0.5, marginRight: 6, ...fontStyle('bold')},
  bestBadge: {paddingHorizontal: 6, borderRadius: 6, color: '#FFFFFF', fontSize: 9, lineHeight: 14, letterSpacing: 0.4, overflow: 'hidden', ...fontStyle('bold')},
  routeTitle: {fontSize: 16, lineHeight: 22, ...fontStyle('semiBold')},
  routeDetail: {fontSize: 12, lineHeight: 17, marginTop: 2, ...fontStyle('regular')},
  routeEstimate: {fontSize: 13, lineHeight: 18, marginTop: 5, ...fontStyle('semiBold')},
});
