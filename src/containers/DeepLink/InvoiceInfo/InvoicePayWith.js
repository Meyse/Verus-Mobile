import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import BigNumber from 'bignumber.js';
import AppButton from '../../../components/AppButton';
import FadedScrollView from '../../../components/FadedScrollView';
import SkeletonLoader, {SkeletonBlock} from '../../../components/SkeletonLoader';
import {fontStyle} from '../../../globals/fonts';
import {useObjectSelector} from '../../../hooks/useObjectSelector';
import {useOnboardingTheme} from '../../../theme/onboarding';
import {AssetCoinLogo} from '../../../utils/CoinData/Graphics';
import {API_SEND} from '../../../utils/constants/intervalConstants';
import {getVerusPayInvoicePaymentDestination} from '../../../utils/deeplink/verusPayBurnChangePrice';
import {coinsToSats, truncateDecimal} from '../../../utils/math';
import {getSubWalletCardType} from '../../../utils/subwallet/cardPresentation';
import {useSendWizard} from '../../SendWizard/SendWizardContext';
import {SourceCardSheet} from '../../SendWizard/components/SelectionSheets';
import {
  ErrorMessage,
  WIZARD_CONTENT_INSET,
  WIZARD_CONTENT_TOP_INSET,
  WizardScreen,
} from '../../SendWizard/components/WizardUI';
import {useInvoiceFlow} from '../../SendWizard/invoiceFlow';
import {ADDRESS_TYPE, buildSendTarget} from '../../SendWizard/wizardUtils';
import InvoiceSlip from './InvoiceSlip';

// A card as Receive's "Choose a card" names it.
export const getPayFromLabel = wallet => {
  const cardType = getSubWalletCardType(wallet);
  return cardType === 'VerusID' || cardType === 'Address' ? wallet.name : cardType;
};

const formatCost = (amount, ticker, conversion) =>
  `${conversion ? '≈ ' : ''}${truncateDecimal(BigNumber(amount || 0), 8)} ${ticker}`;

// The first step of an invoice payment: the slip that was scanned, then every
// way to pay it with what it costs. Owner-approved option A (2026-10-21).
// One row per currency and basket; a currency on several cards opens
// "Choose a card". With only one way to pay, the step is skipped.
const InvoicePayWith = () => {
  const navigation = useNavigation();
  const theme = useOnboardingTheme();
  const flow = useInvoiceFlow();
  const {state, setAmount, setRecipient, setSource} = useSendWizard();
  const activeAccount = useObjectSelector(
    stateValue => stateValue.authentication.activeAccount,
  );
  const [cardGroup, setCardGroup] = useState(null);
  const [cardSheetVisible, setCardSheetVisible] = useState(false);
  const [payError, setPayError] = useState(null);
  const skipped = useRef(false);
  const {cards = [], conversionError, invoice, loading, onRetryConversions} = flow;

  const groups = useMemo(() => {
    const byKey = new Map();
    cards.forEach(card => {
      const {coinObj, via, conversion, amount} = card.option;
      const key = `${coinObj.id}|${via || ''}|${conversion ? 1 : 0}`;
      if (!byKey.has(key)) {
        byKey.set(key, {key, coin: coinObj, via, conversion, amount, cards: []});
      }
      byKey.get(key).cards.push(card);
    });
    return [...byKey.values()];
  }, [cards]);
  const direct = groups.filter(group => !group.conversion);
  const converted = groups.filter(group => group.conversion);

  const pay = useCallback(
    (card, {replace = false} = {}) => {
      const {option} = card;
      const coin = option.coinObj;
      const wallet = option.wallet;
      const channel = wallet.api_channels?.[API_SEND];
      let destination;
      try {
        destination = getVerusPayInvoicePaymentDestination(
          invoice.details,
          activeAccount,
          coin,
          wallet,
        );
      } catch (destinationError) {
        setPayError(destinationError.message);
        return;
      }
      setPayError(null);

      const sourceNetworkId = channel?.split('.')[2] || coin.system_id || coin.id;
      const sendTarget = buildSendTarget({}, coin, sourceNetworkId);
      const directRoute = sendTarget.routes[0];
      const target = option.conversion
        ? {
            id: invoice.currencyId,
            coinId: invoice.coinId,
            transactionCurrency: invoice.currencyId,
            fullyqualifiedname: invoice.currencyFqn,
            convertToFqn: invoice.currencyFqn,
            name: invoice.currencyName,
            ticker: invoice.ticker,
            isConversion: true,
            routes: [],
          }
        : sendTarget;
      const route = option.conversion || option.exportTo
        ? {
            ...directRoute,
            key: `invoice:${option.viaCurrencyId || 'direct'}:${option.exportTo || 'local'}`,
            exportTo: option.exportTo || null,
            exportToFqn: option.exportTo || null,
            via: option.viaCurrencyId || null,
            viaFqn: option.via || null,
            isCrossChain: Boolean(option.exportTo),
            addressType: ADDRESS_TYPE.VERUS,
          }
        : directRoute;
      const severalCards =
        groups.find(group => group.cards.includes(card))?.cards.length > 1;

      setSource(
        {
          sourceCoin: coin,
          sourceSubWallet: wallet,
          sourceBalance: String(card.balanceDisplay === '-' ? 0 : card.balanceDisplay),
          channel,
          payFromLabel: severalCards ? getPayFromLabel(wallet) : null,
        },
        target,
        route,
      );
      if (!invoice.anyAmount) {
        const amount = BigNumber(option.amount);
        setAmount(
          amount.toFixed(),
          coinsToSats(amount).toString(),
          null,
          amount.toFixed(),
          false,
        );
      }
      setRecipient(destination);

      const next = invoice.anyAmount
        ? 'SendWizardAmount'
        : invoice.anyDestination
        ? 'SendWizardRecipient'
        : 'SendWizardConfirm';
      if (replace) navigation.replace(next);
      else navigation.navigate(next);
    },
    [activeAccount, groups, invoice, navigation, setAmount, setRecipient, setSource],
  );

  // Nothing to choose: one card, no conversion. Confirm takes this step's place.
  useEffect(() => {
    if (skipped.current || loading || conversionError) return;
    if (invoice.acceptsConversion || cards.length !== 1) return;
    skipped.current = true;
    pay(cards[0], {replace: true});
  }, [cards, conversionError, invoice.acceptsConversion, loading, pay]);

  const choose = group => {
    if (group.cards.length === 1) pay(group.cards[0]);
    else {
      setCardGroup(group);
      setCardSheetVisible(true);
    }
  };

  const renderGroup = group => {
    const ticker = group.coin.display_ticker;
    const balance = group.cards.reduce(
      (total, card) =>
        total.plus(card.balanceDisplay === '-' ? 0 : BigNumber(card.balanceDisplay)),
      BigNumber(0),
    );
    const from =
      group.cards.length > 1
        ? `${group.cards.length} cards`
        : getPayFromLabel(group.cards[0].option.wallet);
    const detail = [
      from,
      group.via ? `via ${group.via}` : null,
      `Balance ${truncateDecimal(balance, 4)} ${ticker}`,
    ]
      .filter(Boolean)
      .join(' · ');

    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Pay with ${group.coin.display_name}, ${
          invoice.anyAmount ? '' : formatCost(group.amount, ticker, group.conversion)
        }, ${detail}`}
        key={group.key}
        onPress={() => choose(group)}
        style={({pressed}) => [styles.row, pressed && styles.pressed]}>
        <View style={styles.logo}>
          <AssetCoinLogo coinId={group.coin.id} size={38} />
        </View>
        <View style={styles.copy}>
          <View style={styles.titleRow}>
            <Text numberOfLines={1} style={[styles.name, {color: theme.colors.textPrimary}]}>
              {group.coin.display_name}
            </Text>
            {invoice.anyAmount ? null : (
              <Text style={[styles.cost, {color: theme.colors.textPrimary}]}>
                {formatCost(group.amount, ticker, group.conversion)}
              </Text>
            )}
          </View>
          <Text style={[styles.detail, {color: theme.colors.textSecondary}]}>
            {detail}
          </Text>
        </View>
      </Pressable>
    );
  };

  const groupTitle = title => (
    <Text style={[styles.groupTitle, {color: theme.colors.textSecondary}]}>
      {title}
    </Text>
  );

  return (
    <WizardScreen scroll={false}>
      <FadedScrollView
        containerStyle={styles.viewport}
        contentContainerStyle={styles.content}
        fadeBackgroundColor={theme.colors.background}>
        <View style={styles.slip}>
          <InvoiceSlip
            amount={invoice.amountDisplay ?? 'Any amount'}
            destination={invoice.destinationDisplay}
            fiat={invoice.fiat}
            signer={invoice.signer}
            unit={invoice.amountDisplay == null ? '' : invoice.ticker}
          />
        </View>
        {payError ? <ErrorMessage>{payError}</ErrorMessage> : null}
        {loading && groups.length === 0 ? (
          <SkeletonLoader accessibilityLabel="Finding ways to pay">
            {[0, 1].map(index => (
              <View key={index} style={styles.row}>
                <SkeletonBlock height={38} radius={19} width={38} />
                <View style={[styles.copy, styles.skeletonCopy]}>
                  <SkeletonBlock height={16} width="55%" />
                  <SkeletonBlock height={13} width="75%" />
                </View>
              </View>
            ))}
          </SkeletonLoader>
        ) : groups.length === 0 && !conversionError ? (
          <View style={styles.empty}>
            <Text style={[styles.emptyTitle, {color: theme.colors.textPrimary}]}>
              No way to pay this invoice
            </Text>
            <Text style={[styles.emptyBody, {color: theme.colors.textSecondary}]}>
              None of your cards has enough of a currency this invoice accepts.
            </Text>
          </View>
        ) : (
          <>
            {direct.length ? groupTitle('Pay directly') : null}
            {direct.map(renderGroup)}
            {converted.length || conversionError ? groupTitle('Pay with conversion') : null}
            {converted.map(renderGroup)}
            {conversionError ? (
              <View>
                <ErrorMessage>Conversion options didn’t load.</ErrorMessage>
                <AppButton onPress={onRetryConversions} variant="text">
                  Try again
                </AppButton>
              </View>
            ) : null}
          </>
        )}
      </FadedScrollView>
      <SourceCardSheet
        cards={(cardGroup?.cards || []).map(card => ({
          card: card.option.wallet,
          coin: card.option.coinObj,
          balance: card.balanceDisplay === '-' ? '0' : card.balanceDisplay,
          invoiceCard: card,
        }))}
        description="Choose the card to pay from."
        selectedId={state.sourceSubWallet?.id}
        visible={cardSheetVisible}
        onClose={() => setCardSheetVisible(false)}
        onClosed={() => setCardGroup(null)}
        onSelect={source => pay(source.invoiceCard)}
      />
    </WizardScreen>
  );
};

const styles = StyleSheet.create({
  viewport: {flex: 1},
  content: {paddingTop: WIZARD_CONTENT_TOP_INSET, paddingBottom: 24},
  slip: {marginHorizontal: WIZARD_CONTENT_INSET, marginBottom: 8},
  groupTitle: {
    paddingHorizontal: WIZARD_CONTENT_INSET,
    paddingTop: 18,
    paddingBottom: 2,
    fontSize: 14,
    lineHeight: 20,
    ...fontStyle('semiBold'),
  },
  row: {
    paddingHorizontal: WIZARD_CONTENT_INSET,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
  },
  pressed: {opacity: 0.7},
  logo: {width: 38, height: 38, marginRight: 16},
  copy: {flex: 1, minWidth: 0},
  skeletonCopy: {gap: 8},
  titleRow: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'},
  name: {flexShrink: 1, fontSize: 17, lineHeight: 22, ...fontStyle('semiBold')},
  cost: {marginLeft: 12, fontSize: 16, lineHeight: 22, ...fontStyle('semiBold')},
  detail: {marginTop: 4, fontSize: 14, lineHeight: 20, ...fontStyle('regular')},
  empty: {paddingHorizontal: 24, paddingTop: 32, alignItems: 'center'},
  emptyTitle: {fontSize: 17, lineHeight: 22, textAlign: 'center', ...fontStyle('semiBold')},
  emptyBody: {fontSize: 15, lineHeight: 22, textAlign: 'center', marginTop: 8, ...fontStyle('regular')},
});

export default InvoicePayWith;
