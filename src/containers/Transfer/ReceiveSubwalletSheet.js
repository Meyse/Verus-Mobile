import React, {useMemo} from 'react';
import SelectionSheet, {
  SelectionGroup,
  SelectionRow,
} from '../../components/SelectionSheet';
import useSheetDismissal from '../../components/useSheetDismissal';
import {CoinDirectory} from '../../utils/CoinData/CoinDirectory';

const getNetworkDetails = wallet => {
  const networkId =
    wallet.network || wallet.channel?.split('.')?.[2] || 'unknown';
  try {
    const coin = CoinDirectory.findCoinObj(networkId, null, true);
    return {
      id: networkId,
      name: coin.display_name || coin.display_ticker || networkId,
    };
  } catch (e) {
    return {id: networkId, name: networkId === 'unknown' ? 'Other' : networkId};
  }
};

const ReceiveSubwalletSheet = ({
  balanceMap = {},
  coinObj,
  onClose,
  onClosed,
  onSelect,
  selectedId,
  subWallets = [],
  visible,
}) => {
  const dismissal = useSheetDismissal({visible, onClose, onClosed});
  const groups = useMemo(() => {
    const result = new Map();
    subWallets.forEach(wallet => {
      const network = getNetworkDetails(wallet);
      if (!result.has(network.id))
        result.set(network.id, {...network, wallets: []});
      result.get(network.id).wallets.push(wallet);
    });
    return Array.from(result.values());
  }, [subWallets]);

  if (!coinObj) return null;
  return (
    <SelectionSheet
      title="Choose a card"
      visible={visible}
      onClose={dismissal.close}
      onClosed={dismissal.onClosed}>
      {groups.map(group => (
        <SelectionGroup key={group.id} title={group.name}>
          {group.wallets.map(wallet => (
            <SelectionRow
              key={wallet.id}
              title={wallet.name || wallet.id}
              accessibilityLabel={`Receive with ${wallet.name || 'Card'}`}
              selected={
                selectedId == null ? undefined : wallet.id === selectedId
              }
              value={Number(balanceMap[wallet.id] || 0).toFixed(4)}
              valueLabel={coinObj.display_ticker}
              onPress={() => dismissal.dismiss(() => onSelect(wallet))}
            />
          ))}
        </SelectionGroup>
      ))}
    </SelectionSheet>
  );
};

export default ReceiveSubwalletSheet;
