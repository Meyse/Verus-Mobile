import React, {useMemo} from 'react';
import SelectionSheet, {
  SelectionGroup,
  SelectionRow,
} from '../../../components/SelectionSheet';
import useSheetDismissal from '../../../components/useSheetDismissal';
import {RenderPlainCoinLogo} from '../../../utils/CoinData/Graphics';
import {
  getSubWalletCardType,
  getSubWalletNetworkLabel,
} from '../../../utils/subwallet/cardPresentation';
import {truncateDecimal} from '../../../utils/math';
import {formatSyncStatus} from '../../../utils/subwallet/privateWallet';

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
        <SelectionGroup
          key={network}
          title={getSubWalletNetworkLabel(sources[0].card, sources[0].coin)}>
          {sources.map(source => {
            // Name cards as Receive's "Choose a card" does: the type, with a
            // transparent card's short address below, or the VerusID name.
            // A private card that still syncs shows, but cannot be picked.
            const cardType = getSubWalletCardType(source.card);
            const syncing = source.syncPercent != null;
            return (
              <SelectionRow
                key={source.card.id}
                disabled={syncing}
                title={cardType === 'VerusID' ? source.card.name : cardType}
                subtitle={
                  syncing
                    ? formatSyncStatus(source.syncPercent)
                    : cardType === 'Transparent'
                    ? source.card.name
                    : undefined
                }
                subtitleMonospace={!syncing}
                selected={source.card.id === selectedId}
                value={truncateDecimal(source.balance, 4)}
                valueLabel={source.coin.display_ticker}
                onPress={() => dismissal.dismiss(() => onSelect(source))}
              />
            );
          })}
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
  // The asset's own network is the standard choice, so it always comes first
  // and is named by its group. Other networks keep the daemon's route order.
  const groups = useMemo(
    () =>
      [
        {
          title: 'Same network',
          items: options.filter(item => item.isSameNetwork),
        },
        {
          title: 'Other networks',
          items: options.filter(item => !item.isSameNetwork),
        },
      ].filter(group => group.items.length > 0),
    [options],
  );
  return (
    <SelectionSheet
      title="Choose a network"
      subtitle={`Where should the recipient receive ${
        target?.ticker || target?.name || 'this asset'
      }?`}
      visible={visible}
      onClose={dismissal.close}
      onClosed={dismissal.onClosed}>
      {groups.map(group => (
        <SelectionGroup key={group.title} title={group.title}>
          {group.items.map(item => (
            <SelectionRow
              key={`${item.networkKey}:${item.transactionCurrency}`}
              title={item.networkName}
              subtitle={`Receive as ${item.ticker || item.name}`}
              selected={
                selectedKey == null
                  ? undefined
                  : item.networkKey === selectedKey
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
        </SelectionGroup>
      ))}
    </SelectionSheet>
  );
};
