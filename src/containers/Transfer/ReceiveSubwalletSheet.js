import React, {useMemo} from 'react';
import {useSelector} from 'react-redux';
import {Text} from 'react-native';
import SelectionSheet, {SelectionRow} from '../../components/SelectionSheet';
import CardTitle from '../../components/CardTitle';
import useSheetDismissal from '../../components/useSheetDismissal';
import {createSelectionSheetStyles} from '../../styles';
import {useOnboardingTheme} from '../../theme/onboarding';
import {CoinDirectory} from '../../utils/CoinData/CoinDirectory';
import {
  getSubWalletCardTitle,
  getSubWalletDisplayIdentifier,
} from '../../utils/subwallet/cardPresentation';

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
  const activeAccount = useSelector(state => state.authentication.activeAccount);
  const theme = useOnboardingTheme();
  const styles = useMemo(() => createSelectionSheetStyles(theme), [theme]);
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
      title="Choose an address"
      visible={visible}
      onClose={dismissal.close}
      onClosed={dismissal.onClosed}>
      {groups.length === 0 ? (
        // Never present an empty chooser: the invoking screen keeps the user
        // on an accurate empty state instead of opening this sheet.
        <Text style={styles.empty}>
          No receiving address is available for this asset.
        </Text>
      ) : (
        // Rows keep the network order. Each title names its network (PR 266
        // review R8), so the list has no network group titles.
        groups.flatMap(group => group.wallets).map(wallet => {
          const address = getSubWalletDisplayIdentifier(
            wallet,
            activeAccount,
            coinObj.id,
            false,
          );
          const cardTitle = getSubWalletCardTitle(wallet, {
            address,
            coin: coinObj,
          });
          const balance = Number(balanceMap[wallet.id] || 0).toFixed(4);
          return (
            <SelectionRow
              key={wallet.id}
              titleContent={
                <CardTitle title={cardTitle} style={styles.rowTitle} nameOnly />
              }
              subtitle={cardTitle.chainLabel || undefined}
              subtitleChain
              accessibilityLabel={`Receive with ${[cardTitle.name, cardTitle.chainLabel].filter(Boolean).join(', ')}, ${balance} ${coinObj.display_ticker}`}
              selected={
                selectedId == null ? undefined : wallet.id === selectedId
              }
              value={balance}
              valueLabel={coinObj.display_ticker}
              onPress={() => dismissal.dismiss(() => onSelect(wallet))}
            />
          );
        })
      )}
    </SelectionSheet>
  );
};

export default ReceiveSubwalletSheet;
