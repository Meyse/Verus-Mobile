import React, {useMemo} from 'react';
import BigNumber from 'bignumber.js';
import SelectionSheet, {
  SelectionGroup,
  SelectionRow,
} from '../../../components/SelectionSheet';
import useSheetDismissal from '../../../components/useSheetDismissal';
import {RenderPlainCoinLogo} from '../../../utils/CoinData/Graphics';
import {truncateDecimal} from '../../../utils/math';

export const SourceCardSheet = ({
  cards,
  description,
  onClose,
  onClosed,
  onSelect,
  selectedId,
  visible,
}) => {
  const dismissal = useSheetDismissal({visible, onClose, onClosed});
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
    <SelectionSheet
      title="Choose a card"
      subtitle={description}
      visible={visible}
      onClose={dismissal.close}
      onClosed={dismissal.onClosed}>
      {groups.map(([network, sources]) => (
        <SelectionGroup key={network} title={network}>
          {sources.map(source => (
            <SelectionRow
              key={source.card.id}
              title={source.card.name}
              selected={source.card.id === selectedId}
              value={truncateDecimal(source.balance, 4)}
              valueLabel={source.coin.display_ticker}
              onPress={() => dismissal.dismiss(() => onSelect(source))}
            />
          ))}
        </SelectionGroup>
      ))}
    </SelectionSheet>
  );
};

export const TargetNetworkSheet = ({
  onClose,
  onClosed,
  onSelect,
  options,
  selectedKey,
  target,
  visible,
}) => {
  const dismissal = useSheetDismissal({visible, onClose, onClosed});
  return (
    <SelectionSheet
      title="Choose a network"
      subtitle={`Where should the recipient receive ${
        target?.ticker || target?.name || 'this asset'
      }?`}
      visible={visible}
      onClose={dismissal.close}
      onClosed={dismissal.onClosed}>
      {options.map(item => (
        <SelectionRow
          key={`${item.networkKey}:${item.transactionCurrency}`}
          title={`${item.networkName} network`}
          subtitle={`Receive as ${item.ticker || item.name}${
            item.isSameNetwork ? ' · Same network' : ''
          }`}
          selected={
            selectedKey == null ? undefined : item.networkKey === selectedKey
          }
          leading={RenderPlainCoinLogo(
            item.networkIcon || item.coinId || item.id,
            {},
            28,
            28,
          )}
          onPress={() => dismissal.dismiss(() => onSelect(item))}
        />
      ))}
    </SelectionSheet>
  );
};

export const RouteSheet = ({
  estimates = {},
  onClose,
  onClosed,
  onSelect,
  routes,
  selectedKey,
  target,
  title = 'Choose a conversion route',
  visible,
}) => {
  const dismissal = useSheetDismissal({visible, onClose, onClosed});
  const bestRouteKey = useMemo(() => {
    let best = null;
    routes.forEach(route => {
      const output = estimates[route.key]?.estimatedcurrencyout;
      if (output == null) return;
      const amount = BigNumber(output);
      if (!amount.isFinite()) return;
      if (!best || amount.isGreaterThan(best.amount))
        best = {amount, key: route.key};
    });
    return best?.key || null;
  }, [estimates, routes]);

  return (
    <SelectionSheet
      title={title}
      visible={visible}
      onClose={dismissal.close}
      onClosed={dismissal.onClosed}>
      {routes.map(item => {
        const estimate = estimates[item.key]?.estimatedcurrencyout;
        const routeDescription = item.via
          ? 'Conversion through an intermediate currency'
          : 'Direct conversion route';
        const estimateDescription =
          estimate == null
            ? ''
            : `\n≈ ${truncateDecimal(BigNumber(estimate), 8)} ${
                target?.ticker || ''
              }${item.key === bestRouteKey ? ' · Best estimate' : ''}`;
        return (
          <SelectionRow
            key={item.key}
            title={item.label}
            subtitle={`${routeDescription}${estimateDescription}`}
            selected={item.key === selectedKey}
            onPress={() => dismissal.dismiss(() => onSelect(item))}
          />
        );
      })}
    </SelectionSheet>
  );
};
