import React, {useEffect, useMemo, useState} from 'react';
import {ScrollView, View} from 'react-native';
import {Text} from 'react-native-paper';
import {SafeAreaView} from 'react-native-safe-area-context';
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
import {
  createAlert,
  resolveAlert,
} from '../../../actions/actions/alert/dispatchers/alert';
import {useObjectSelector} from '../../../hooks/useObjectSelector';
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

  useEffect(() => {
    if (!wrongNetwork) return;
    createAlert(
      details.isTestnet() ? 'Testnet invoice' : 'Mainnet invoice',
      `This invoice was created for ${
        details.isTestnet() ? 'testnet' : 'mainnet'
      }, but you are using a ${
        isTestAccount ? 'testnet' : 'mainnet'
      } wallet. Please sign out, select a ${
        details.isTestnet() ? 'testnet' : 'mainnet'
      } wallet, and retry this invoice to continue.`,
      [
        {
          text: 'OK',
          onPress: () => {
            cancel();
            resolveAlert(true);
          },
        },
      ],
      {cancelable: false},
    );
  }, [wrongNetwork, details]);

  const unlockWallet = async () => {
    const allowList = details.isTestnet()
      ? accounts.filter(
          account =>
            account.testnetOverrides?.[coinObj.mainnet_id] === coinObj.id,
        )
      : accounts.filter(
          account => account.testnetOverrides?.[coinObj.id] == null,
        );
    if (allowList.length === 0) {
      createAlert(
        'Cannot continue',
        `No ${
          details.isTestnet() ? 'testnet' : 'mainnet'
        } wallets found for this invoice.`,
      );
      return;
    }

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

  const renderInvoice = ({
    selectedSource,
    onChooseSource,
    onReviewPayment,
  } = {}) => (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.screen}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
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
      </ScrollView>
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
        <AppButton
          disabled={wrongNetwork}
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
    </SafeAreaView>
  );

  return signedIn && !wrongNetwork ? (
    <InvoicePaymentConfiguration {...props} renderInvoice={renderInvoice} />
  ) : (
    renderInvoice()
  );
};

export default InvoiceInfo;
