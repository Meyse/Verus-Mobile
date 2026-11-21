import React, {useMemo} from 'react';
import {useSelector} from 'react-redux';
import SelectionSheet, {
  SelectionGroup,
  SelectionRow,
} from '../../../components/SelectionSheet';
import CardTitle from '../../../components/CardTitle';
import {createSelectionSheetStyles} from '../../../styles';
import {useOnboardingTheme} from '../../../theme/onboarding';
import useSheetDismissal from '../../../components/useSheetDismissal';
import {RenderPlainCoinLogo} from '../../../utils/CoinData/Graphics';
import {
  getSubWalletCardTitle,
  getSubWalletDisplayIdentifier,
} from '../../../utils/subwallet/cardPresentation';
import {truncateDecimal} from '../../../utils/math';
import {formatSyncStatus} from '../../../utils/subwallet/privateWallet';

export const SourceCardSheet = ({
  cards,
  onClose,
  onClosed,
  onSelect,
  selectedId,
  visible,
}) => {
  const theme = useOnboardingTheme();
  const styles = useMemo(() => createSelectionSheetStyles(theme), [theme]);
  const activeAccount = useSelector(state => state.authentication.activeAccount);
  const dismissal = useSheetDismissal({visible, onClose, onClosed});
  // Rows keep the network order. Each title names its network (PR 266 review
  // R8), so the list has no network group titles.
  const sources = useMemo(() => {
    const map = new Map();
    cards.forEach(source => {
      const network = source.card.network || source.coin.system_id || 'Verus';
      if (!map.has(network)) map.set(network, []);
      map.get(network).push(source);
    });
    return [...map.values()].flat();
  }, [cards]);

  return (
    <SelectionSheet
      title="Choose an address"
      visible={visible}
      onClose={dismissal.close}
      onClosed={dismissal.onClosed}>
      {sources.map(source => {
        // Name sources as the asset screen does: the short address, the
        // VerusID name or "Private", then the network. No address line.
        // A private card that still syncs shows, but cannot be picked.
        const syncing = source.syncPercent != null;
        const address = getSubWalletDisplayIdentifier(
          source.card,
          activeAccount,
          source.coin.id,
          false,
        );
        const cardTitle = getSubWalletCardTitle(source.card, {
          address,
          coin: source.coin,
        });
        // The line under the name: the network, then the sync state.
        const subtitle = [
          cardTitle.networkTicker,
          syncing ? formatSyncStatus(source.syncPercent) : null,
        ]
          .filter(Boolean)
          .join(' · ');
        const value = truncateDecimal(source.balance, 4);
        return (
          <SelectionRow
            key={source.card.id}
            accessibilityLabel={[
              cardTitle.name,
              subtitle,
              value,
              source.coin.display_ticker,
            ]
              .filter(Boolean)
              .join(', ')}
            disabled={syncing}
            titleContent={
              <CardTitle title={cardTitle} style={styles.rowTitle} nameOnly />
            }
            subtitle={subtitle || undefined}
            subtitleLikeValueLabel
            selected={source.card.id === selectedId}
            value={value}
            valueLabel={source.coin.display_ticker}
            onPress={() => dismissal.dismiss(() => onSelect(source))}
          />
        );
      })}
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
