import React, {useMemo, useState} from 'react';
import {FlatList, Pressable, View} from 'react-native';
import {Avatar, IconButton, Portal, Text} from 'react-native-paper';
import {formatCurrency} from 'react-native-format-currency';
import {SafeAreaView} from 'react-native-safe-area-context';
import ListSelectionModal from '../../components/ListSelectionModal/ListSelectionModal';
import SignedInActionBar from '../../components/SignedInActionBar';
import signedInCopy from '../../copy/signedIn';
import {createSignedInStyles} from '../../styles';
import {useOnboardingTheme} from '../../theme/onboarding';
import {getCoinLogo} from '../../utils/CoinData/CoinData';
import {truncateDecimal} from '../../utils/math';

const formatFiat = (amount, currency) =>
  formatCurrency({amount: Number(amount || 0), code: currency})[0];

const getAssetValueText = (item, showBalance, displayCurrency) => {
  if (!showBalance) return '••••••';
  if (item.fiatValue == null) return signedInCopy.wallet.priceUnavailable;
  return formatFiat(item.fiatValue, displayCurrency);
};

const getAssetDescription = item => {
  if (item.cardCount > 1) return `${item.cardCount} Cards`;
  return item.statusDescription;
};

const SignedInWalletHome = ({
  assets,
  displayCurrency,
  loading,
  showBalance,
  totalFiatBalance,
  onToggleBalance,
  onRefresh,
  onOpenAsset,
  actionSources,
  onOpenActionSource,
  onAddCoin,
  onAddPbaasCurrency,
  onAddErc20Token,
}) => {
  const theme = useOnboardingTheme();
  const styles = createSignedInStyles(theme);
  const [sourceAction, setSourceAction] = useState(null);
  const [manageAssetsOpen, setManageAssetsOpen] = useState(false);

  const sourceOptions = useMemo(
    () => (sourceAction ? actionSources(sourceAction) : []),
    [actionSources, sourceAction],
  );
  const receiveAvailable = actionSources('wallet-receive').length > 0;
  const transferAvailable = actionSources('wallet-transfer').length > 0;

  const manageOptions = [
    {
      key: 'add-asset',
      title: 'Browse assets',
      description: 'Enable or remove supported wallet assets',
    },
    {
      key: 'add-pbaas',
      title: 'Add PBaaS currency',
      description: 'Add a currency from a Verus PBaaS network',
    },
    {
      key: 'add-erc20',
      title: 'Add ERC-20 token',
      description: 'Add a supported Ethereum token',
    },
  ];

  const handleManageSelection = item => {
    setManageAssetsOpen(false);

    if (item.key === 'add-pbaas') onAddPbaasCurrency();
    else if (item.key === 'add-erc20') onAddErc20Token();
    else onAddCoin();
  };

  const openAction = action => {
    const options = actionSources(action);

    if (options.length === 1) {
      onOpenActionSource(options[0], action);
    } else {
      setSourceAction(action);
    }
  };

  const renderAsset = ({item}) => {
    const Logo = getCoinLogo(item.coin.id, item.coin.proto);
    const balanceText = `${truncateDecimal(item.balance.toString(), 8)} ${
      item.coin.display_ticker
    }`;

    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${item.coin.display_name}, ${
          showBalance ? balanceText : 'balance hidden'
        }`}
        onPress={() => onOpenAsset(item.coin, item.preferredCard)}
        style={({pressed}) => [
          styles.row,
          {opacity: pressed ? 0.72 : 1},
        ]}>
        <View
          style={{
            width: 44,
            height: 44,
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: theme.spacing.md,
          }}>
          {Logo ? (
            <Logo width={40} height={40} />
          ) : (
            <Avatar.Icon size={40} icon="wallet-outline" />
          )}
        </View>
        <View style={{flex: 1, minWidth: 0}}>
          <Text numberOfLines={1} style={styles.rowTitle}>
            {item.coin.display_name}
          </Text>
          <Text numberOfLines={1} style={styles.rowDescription}>
            {getAssetDescription(item)}
          </Text>
        </View>
        <View style={{alignItems: 'flex-end', maxWidth: '46%'}}>
          <Text numberOfLines={1} style={styles.rowTitle}>
            {getAssetValueText(item, showBalance, displayCurrency)}
          </Text>
          <Text numberOfLines={1} style={styles.rowDescription}>
            {showBalance ? balanceText : 'Balance hidden'}
          </Text>
        </View>
      </Pressable>
    );
  };

  const header = (
    <View>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
        <Text style={styles.title}>{signedInCopy.wallet.title}</Text>
        <IconButton
          icon="plus"
          accessibilityLabel={signedInCopy.actions.manageAssets}
          iconColor={theme.colors.primary}
          onPress={() => setManageAssetsOpen(true)}
        />
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={showBalance ? 'Hide portfolio balance' : 'Show portfolio balance'}
        onPress={onToggleBalance}
        style={[
          styles.surface,
          {
            marginTop: theme.spacing.lg,
            padding: theme.spacing.lg,
            backgroundColor: theme.colors.surfaceRaised,
          },
        ]}>
        <View style={{flexDirection: 'row', alignItems: 'center'}}>
          <View style={{flex: 1}}>
            <Text style={styles.sectionTitle}>{signedInCopy.wallet.portfolio}</Text>
            <Text
              accessibilityLabel={
                showBalance
                  ? formatFiat(totalFiatBalance, displayCurrency)
                  : 'Portfolio balance hidden'
              }
              style={[
                theme.typography.headlineLg,
                {color: theme.colors.textPrimary},
              ]}>
              {showBalance
                ? formatFiat(totalFiatBalance, displayCurrency)
                : '••••••••'}
            </Text>
          </View>
          <IconButton
            icon={showBalance ? 'eye-off-outline' : 'eye-outline'}
            accessibilityLabel={showBalance ? 'Hide balances' : 'Show balances'}
            iconColor={theme.colors.textSecondary}
            onPress={onToggleBalance}
          />
        </View>
      </Pressable>
      <View
        style={{
          marginTop: theme.spacing.xl,
          marginBottom: theme.spacing.sm,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
        <Text style={styles.sectionTitle}>{signedInCopy.wallet.assets}</Text>
        <Pressable
          accessibilityRole="button"
          onPress={() => setManageAssetsOpen(true)}>
          <Text style={[styles.rowDescription, {color: theme.colors.primary}]}>
            {signedInCopy.actions.manageAssets}
          </Text>
        </Pressable>
      </View>
    </View>
  );

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeScreen}>
      <Portal>
        {sourceAction && (
          <ListSelectionModal
            title={signedInCopy.wallet.selectSource}
            visible
            data={sourceOptions}
            onSelect={item => {
              setSourceAction(null);
              onOpenActionSource(item);
            }}
            cancel={() => setSourceAction(null)}
          />
        )}
        {manageAssetsOpen && (
          <ListSelectionModal
            title={signedInCopy.actions.manageAssets}
            visible
            data={manageOptions}
            onSelect={handleManageSelection}
            cancel={() => setManageAssetsOpen(false)}
          />
        )}
      </Portal>
      <FlatList
        data={assets}
        keyExtractor={item => item.coin.id}
        renderItem={renderAsset}
        refreshing={loading}
        onRefresh={onRefresh}
        ListHeaderComponent={header}
        ListEmptyComponent={
          <View style={{paddingVertical: theme.spacing.xl, alignItems: 'center'}}>
            <Text style={styles.rowTitle}>{signedInCopy.wallet.noAssets}</Text>
            <Text style={[styles.rowDescription, {textAlign: 'center'}]}>
              {signedInCopy.wallet.noAssetsDescription}
            </Text>
          </View>
        }
        ItemSeparatorComponent={() => <View style={styles.divider} />}
        contentContainerStyle={{
          flexGrow: 1,
          paddingHorizontal: theme.spacing.lg,
          paddingTop: theme.spacing.md,
          paddingBottom: theme.spacing.md,
        }}
      />
      <SignedInActionBar
        receiveDisabled={!receiveAvailable}
        sendOrConvertDisabled={!transferAvailable}
        onReceive={() => openAction('wallet-receive')}
        onSendOrConvert={() => openAction('wallet-transfer')}
      />
    </SafeAreaView>
  );
};

export default SignedInWalletHome;
