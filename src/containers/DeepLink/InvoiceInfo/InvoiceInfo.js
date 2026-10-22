import React, {useEffect, useMemo, useState} from 'react';
import {View} from 'react-native';
import {Text} from 'react-native-paper';
import {SafeAreaView} from 'react-native-safe-area-context';
import {DeepLinkReviewScrollView} from '../components/RequestReview';
import {useSelector} from 'react-redux';
import {primitives} from 'verusid-ts-client';
import BigNumber from 'bignumber.js';
import AppButton from '../../../components/AppButton';
import SafeBottomActionStack from '../../../components/SafeBottomActionStack';
import {
  getFriendlyNameMap,
  getIdentity,
} from '../../../utils/api/channels/verusid/callCreators';
import {blocksToTime, satsToCoins, unixToDate} from '../../../utils/math';
import {getSystemNameFromSystemId} from '../../../utils/CoinData/CoinData';
import {CoinDirectory} from '../../../utils/CoinData/CoinDirectory';
import {
  requestWalletUnlock,
  WALLET_UNLOCK_CANCELLED,
} from '../../../actions/actionDispatchers';
import {createAlert} from '../../../actions/actions/alert/dispatchers/alert';
import {formatCurrency} from 'react-native-format-currency';
import AcknowledgeSheet from '../../../components/AcknowledgeSheet';
import {useObjectSelector} from '../../../hooks/useObjectSelector';
import {API_GET_FIATPRICE} from '../../../utils/constants/intervalConstants';
import {USD} from '../../../utils/constants/currencies';
import {getCurrencyDisplay} from '../../SendWizard/wizardUtils';
import InvoicePayFlow from './InvoicePayFlow';
import DeepLinkRequestSourceCard from '../components/RequestReview/DeepLinkRequestSourceCard';
import DeepLinkRequestSheetScaffold from '../components/RequestReview/DeepLinkRequestSheetScaffold';
import DeepLinkVerusIdDetailsSheet from '../components/RequestReview/DeepLinkVerusIdDetailsSheet';
import InvoicePaymentConfiguration from '../InvoicePaymentConfiguration/InvoicePaymentConfiguration';
import {
  InvoiceCopyRow,
  InvoiceRow,
  InvoiceSourceRow,
  useInvoiceStyles,
} from './InvoicePaymentParts';

const InvoiceInfo = props => {
  const {styles, compact} = useInvoiceStyles();
  const {
    detailsBufferString,
    invoiceVersion,
    isSigned,
    sigtime,
    cancel,
    signerFqn,
    signerSystemID,
    currencyDefinition,
    amountDisplay,
    destinationDisplay,
    coinObj,
    chainInfo,
    acceptedSystemsDefinitions,
    next,
    response,
    detailIndex,
  } = props;
  const details = useMemo(() => {
    const invoice = new primitives.VerusPayInvoiceDetails();
    invoice.fromBuffer(
      Buffer.from(detailsBufferString, 'hex'),
      0,
      new primitives.BigNumber(invoiceVersion),
    );
    return invoice;
  }, [detailsBufferString, invoiceVersion]);
  const signedIn = useSelector(state => state.authentication.signedIn);
  const accounts = useObjectSelector(state => state.authentication.accounts);
  const isTestAccount = useSelector(
    state =>
      state.authentication.activeAccount &&
      Object.keys(state.authentication.activeAccount.testnetOverrides || {})
        .length > 0,
  );
  const [sheet, setSheet] = useState(null);
  const [identitySheet, setIdentitySheet] = useState(null);
  const [wrongNetworkVisible, setWrongNetworkVisible] = useState(false);
  const activeCoins = useObjectSelector(state => state.coins.activeCoinsForUser);
  const allSubWallets = useObjectSelector(state => state.coinMenus.allSubWallets);
  const rates = useObjectSelector(state => state.ledger.rates);
  const displayCurrency = useObjectSelector(
    state => state.settings.generalWalletSettings.displayCurrency || USD,
  );
  const isBurn = details.isBurnChangePrice();
  const wrongNetwork =
    signedIn && Boolean(isTestAccount) !== details.isTestnet();
  const signerIdentityID =
    props.signerIdentityID ||
    (isSigned ? props.request?.signature?.identityID?.toIAddress() : null);
  const requesterLabel = signerFqn || signerIdentityID || 'Unknown signer';
  const signerChain = isSigned
    ? getSystemNameFromSystemId(signerSystemID)
    : null;
  const currency = currencyDefinition.fullyqualifiedname;
  const anyAmount = details.acceptsAnyAmount() || amountDisplay == null;
  const expiry = details.expires()
    ? blocksToTime(details.expiryheight.toNumber() - chainInfo.longestchain)
    : null;
  const networks = Object.values(acceptedSystemsDefinitions?.definitions || {});
  const otherNetworks = acceptedSystemsDefinitions?.remainingSystems || [];

  // A testnet invoice in a mainnet wallet, or the other way round.
  useEffect(() => {
    if (wrongNetwork) setWrongNetworkVisible(true);
  }, [wrongNetwork]);
  const invoiceNetwork = details.isTestnet() ? 'testnet' : 'mainnet';
  const allowList = details.isTestnet()
    ? (accounts || []).filter(
        account =>
          account.testnetOverrides?.[coinObj.mainnet_id] === coinObj.id,
      )
    : (accounts || []).filter(
        account => account.testnetOverrides?.[coinObj.id] == null,
      );
  // Signed out with no wallet for the invoice network: Unlock is disabled and
  // the footer says why.
  const noInvoiceNetworkWallet = !signedIn && allowList.length === 0;

  const unlockWallet = async () => {
    if (allowList.length === 0) return;

    try {
      await requestWalletUnlock({
        reason: 'invoice-request',
        title: 'Unlock wallet to continue',
        requestLabel: 'Invoice',
        accountHashes: allowList.map(account => account.accountHash),
        networkLabel: details.isTestnet() ? 'Testnet' : 'Mainnet',
      });
    } catch (e) {
      if (e?.code !== WALLET_UNLOCK_CANCELLED) {
        createAlert('Cannot continue', e?.message || 'Unable to unlock wallet.');
      }
    }
  };

  const openRequester = () => {
    const systemId = CoinDirectory.getBasicCoinObj(signerChain).system_id;
    setIdentitySheet({
      loadVerusId: async () => {
        const result = await getIdentity(systemId, signerIdentityID);
        if (result.error) throw new Error(result.error.message);
        return result.result;
      },
      loadFriendlyNames: identity => getFriendlyNameMap(systemId, identity),
    });
  };

  // The facts the payer's slip, Confirm and Sent show (InvoicePayFlow).
  const requestedCoin = activeCoins.find(
    coin => coin.currency_id === details.requestedcurrencyid,
  );
  const ticker =
    requestedCoin?.display_ticker ||
    getCurrencyDisplay(details.requestedcurrencyid, currency).ticker;
  const rate = requestedCoin
    ? (allSubWallets?.[requestedCoin.id] || [])
        .map(wallet => wallet.api_channels?.[API_GET_FIATPRICE])
        .map(channel => rates?.[channel]?.[requestedCoin.id]?.[displayCurrency])
        .find(value => value != null)
    : null;
  const invoiceFacts = {
    details,
    amountDisplay: anyAmount ? null : amountDisplay,
    ticker,
    currencyId: details.requestedcurrencyid,
    currencyFqn: currency,
    currencyName: currency,
    coinId: requestedCoin?.id || details.requestedcurrencyid,
    signer: isSigned ? requesterLabel : null,
    destinationDisplay: details.acceptsAnyDestination() ? null : destinationDisplay,
    acceptsConversion: details.acceptsConversion(),
    anyAmount,
    anyDestination: details.acceptsAnyDestination(),
    expiry,
    tag: details.isTagged() ? details.tag.toXAddress() : null,
    fiat:
      rate != null && !anyAmount
        ? formatCurrency({
            amount: BigNumber(amountDisplay).multipliedBy(rate).toFixed(2),
            code: displayCurrency,
          })[0]
        : null,
  };

  const renderSheets = () => (
    <>
      <DeepLinkRequestSheetScaffold
        title={sheet === 'networks' ? 'Supported networks' : 'Invoice details'}
        visible={sheet != null}
        onClose={() => setSheet(null)}>
        {sheet === 'networks' ? (
          <>
            {networks.map(network => (
              <InvoiceRow
                key={network.currencyid}
                label={network.fullyqualifiedname}
              />
            ))}
            {otherNetworks.map(network => (
              <InvoiceCopyRow
                key={network}
                label="Network ID"
                value={network}
              />
            ))}
          </>
        ) : (
          <>
            <InvoiceRow label="Currency" value={currency} />
            <InvoiceRow
              label="Supported networks"
              onPress={() => setSheet('networks')}
            />
            <InvoiceCopyRow
              label={isBurn ? 'Burn output address' : 'Destination'}
              value={
                !details.acceptsAnyDestination()
                  ? details.destination.getAddressString()
                  : null
              }
            />
            {isSigned && (
              <InvoiceRow label="Signed" value={unixToDate(sigtime)} />
            )}
            {!!expiry && (
              <InvoiceRow label="Approximate expiry" value={expiry} />
            )}
            {details.acceptsConversion() && !isBurn && (
              <>
                <InvoiceRow label="Conversion" value="Supported" />
                <InvoiceRow
                  label="Maximum estimated slippage"
                  value={`${satsToCoins(BigNumber(details.maxestimatedslippage))
                    .times(100)
                    .toString()}%`}
                />
              </>
            )}
            <InvoiceRow
              label="Amount"
              value={anyAmount ? 'You choose' : `${amountDisplay} ${currency}`}
            />
          </>
        )}
      </DeepLinkRequestSheetScaffold>
      {identitySheet && (
        <DeepLinkVerusIdDetailsSheet
          {...identitySheet}
          visible
          onClose={() => setIdentitySheet(null)}
        />
      )}
      <AcknowledgeSheet
        confirmLabel="Close"
        message={`This invoice is for ${invoiceNetwork}. Your open wallet is on ${
          isTestAccount ? 'testnet' : 'mainnet'
        }. Open a ${invoiceNetwork} wallet and scan it again.`}
        onAcknowledged={cancel}
        onClose={() => setWrongNetworkVisible(false)}
        title={details.isTestnet() ? 'Testnet invoice' : 'Mainnet invoice'}
        visible={wrongNetworkVisible}
      />
    </>
  );

  const renderInvoice = ({
    selectedSource,
    onChooseSource,
    onReviewPayment,
  } = {}) => (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.screen}>
      <DeepLinkReviewScrollView
        showScrollCue
        style={styles.scroll}
        contentContainerStyle={styles.content}>
        <Text accessibilityRole="header" style={styles.title}>
          {isBurn ? 'Review burn request' : 'Pay invoice'}
        </Text>
        {isSigned ? (
          <DeepLinkRequestSourceCard
            style={compact ? styles.compactRequester : undefined}
            requesterLabel={requesterLabel}
            onPressRequester={
              signerChain && signerIdentityID ? openRequester : undefined
            }
            metadataRows={[
              {label: 'Signed', value: unixToDate(sigtime)},
              {label: 'Network', value: signerChain || coinObj.display_ticker},
            ]}
          />
        ) : (
          <View style={styles.notice}>
            <Text style={styles.selectionTitle}>Unsigned invoice</Text>
            <Text style={styles.subtitle}>
              This invoice does not include a signer identity.
            </Text>
          </View>
        )}
        <Text selectable style={styles.amount}>
          {anyAmount ? `Amount in ${currency}` : `${amountDisplay} ${currency}`}
        </Text>
        {isBurn && (
          <View style={styles.notice}>
            <Text style={styles.text}>
              This permanently removes the amount from circulation. The burn
              output address does not receive it.
            </Text>
          </View>
        )}
        <InvoiceRow
          label={isBurn ? 'Burn output' : 'To'}
          value={
            details.acceptsAnyDestination()
              ? isBurn
                ? 'Your own address'
                : 'You choose'
              : destinationDisplay
          }
        />
        {!!expiry && (
          <InvoiceRow label="Expires in" value={`About ${expiry}`} />
        )}
        <InvoiceRow
          label="Invoice details"
          onPress={() => setSheet('details')}
        />
      </DeepLinkReviewScrollView>
      <SafeBottomActionStack horizontalSpacing={24} style={styles.footer}>
        {selectedSource && (
          <>
            {!compact && <Text style={styles.footnote}>Pay from</Text>}
            <InvoiceSourceRow
              selected
              title={`${selectedSource.option.conversion ? '≈ ' : ''}${
                anyAmount ? '' : `${selectedSource.option.amount} `
              }${selectedSource.option.coinObj.display_ticker} · ${
                selectedSource.option.wallet.name
              }`}
              detail={
                selectedSource.option.conversion
                  ? `Convert to ${currency} · ${selectedSource.networkLabel}`
                  : undefined
              }
              onPress={onChooseSource}
            />
          </>
        )}
        {noInvoiceNetworkWallet && (
          <Text style={styles.footnote}>
            {`This invoice needs a ${invoiceNetwork} wallet. Add one, then open the invoice again.`}
          </Text>
        )}
        <AppButton
          disabled={wrongNetwork || noInvoiceNetworkWallet}
          onPress={
            signedIn
              ? selectedSource
                ? onReviewPayment
                : onChooseSource
              : unlockWallet
          }>
          {signedIn
            ? selectedSource
              ? isBurn
                ? 'Review burn'
                : 'Review payment'
              : 'Choose how to pay'
            : 'Unlock wallet'}
        </AppButton>
        <AppButton variant="secondary" onPress={cancel}>
          Cancel
        </AppButton>
      </SafeBottomActionStack>
      {renderSheets()}
    </SafeAreaView>
  );

  if (!signedIn || wrongNetwork) return renderInvoice();
  // Burn invoices keep their own review in the old send window.
  if (isBurn) {
    return <InvoicePaymentConfiguration {...props} renderInvoice={renderInvoice} />;
  }

  const onPaid = next != null ? () => next(response, [detailIndex]) : cancel;
  return (
    <>
      <InvoicePaymentConfiguration
        {...props}
        renderFlow={({cards, loading, conversionError, retryConversions}) => (
          <InvoicePayFlow
            flow={{
              invoice: invoiceFacts,
              cards,
              loading,
              conversionError,
              onRetryConversions: retryConversions,
              onExit: cancel,
              onPaid,
              onOpenDetails: () => setSheet('details'),
              onOpenRequester:
                signerChain && signerIdentityID ? openRequester : undefined,
            }}
          />
        )}
      />
      {renderSheets()}
    </>
  );
};

export default InvoiceInfo;
