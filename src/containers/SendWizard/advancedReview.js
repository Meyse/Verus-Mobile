import BigNumber from 'bignumber.js';
import {coinsToSats, satsToCoins, truncateDecimal} from '../../utils/math';
import {ERC20, ETH} from '../../utils/constants/intervalConstants';
import {ETH_CONTRACT_ADDRESS} from '../../utils/constants/web3Constants';

// Upstream's slippage threshold on its Confirm (ConvertOrCrossChainSendConfirm).
const SLIPPAGE_WARNING_THRESHOLD = 0.05;

// The facts of the old Confirm of the manual conversion and cross-chain form
// (ConvertOrCrossChainSendConfirm), read from the same prepared transaction
// and computed the same way. The Advanced form's Confirm draws them with the
// wizard's rows (PR 266 pick ADV). Nothing here changes the transaction.
export const getAdvancedReview = ({preflight, balances, coinObj, priceEstimate}) => {
  const {output, validation, names, deltas, source, estimate, submittedsats, converterdef} = preflight;
  const {fees, sent} = validation;
  const {currency, satoshis, address, convertto, exportto, via, preconvert, burn, mapto} = output;
  const ethereum = coinObj.proto === ETH || coinObj.proto === ERC20;
  // A copy: the prepared transaction keeps its own names.
  const nameMap = new Map(names instanceof Map ? names : Object.entries(names || {}));
  // The Ethereum preflight names the network's coin "ETH". On Sepolia the
  // wallet calls it gETH, as the amount and the wizard's Confirm do.
  if (ethereum && coinObj.network === 'sepolia') nameMap.set(ETH_CONTRACT_ADDRESS, 'gETH');
  const name = id => (nameMap.has(id) ? nameMap.get(id) : id);

  const sentAmount = satsToCoins(BigNumber(sent[currency] ? sent[currency] : 0));
  const destination = address.getAddressString();
  const recipient = nameMap.has(destination)
    ? `${nameMap.get(destination)}@ (${destination})`
    : destination;

  // The conversion fee taken from the amount: 0.025%, or 0.05% via a basket.
  const feeMultiplier = convertto != null && via != null
    ? BigNumber(0.0005)
    : convertto != null
    ? BigNumber(0.00025)
    : BigNumber(0);
  const conversionFee = BigNumber(
    truncateDecimal(satsToCoins(BigNumber(satoshis)).multipliedBy(feeMultiplier), 8),
  );

  const amounts = (map, showZero = false) =>
    Object.entries(map || {})
      .map(([id, value]) => ({id, name: name(id), amount: satsToCoins(BigNumber(value))}))
      .filter(item => showZero || !item.amount.isZero());

  const remaining = {};
  const deltaEntries = deltas instanceof Map ? [...deltas.entries()] : Object.entries(deltas || {});
  deltaEntries.forEach(([key, value]) => {
    const delta = BigNumber(value);
    if (balances && Object.prototype.hasOwnProperty.call(balances, key) && !delta.isZero()) {
      remaining[key] = coinsToSats(BigNumber(balances[key])).plus(delta).toString();
    }
  });

  // A quick estimate that differs from the prepared one by more than 5%.
  const quick = priceEstimate != null && estimate != null
    ? sentAmount.multipliedBy(priceEstimate.price)
    : null;
  const accurate = estimate != null ? BigNumber(estimate.estimatedcurrencyout) : null;
  const highSlippage = Boolean(
    quick && accurate && quick.isFinite() && accurate.isFinite() && !accurate.isZero() &&
      quick.minus(accurate).abs().dividedBy(accurate).isGreaterThan(SLIPPAGE_WARNING_THRESHOLD),
  );

  const isConversion = convertto != null && convertto.length > 0;
  const isExport = exportto != null && exportto.length > 0;
  const estimated = estimate != null
    ? `${estimate.estimatedcurrencyout} ${name(convertto)}`
    : priceEstimate
    ? `${Number(sentAmount.multipliedBy(priceEstimate.price).toFixed(8))} ${name(convertto)}`
    : null;

  return {
    burn: burn === true,
    preconvert: Boolean(preconvert),
    isConversion,
    isExport,
    currencyName: name(currency),
    sentAmount,
    // The preflight lowers a flexible amount when the fee does not fit.
    enteredAmount:
      submittedsats != null && String(submittedsats) !== String(satoshis)
        ? satsToCoins(BigNumber(submittedsats))
        : null,
    source,
    recipient,
    convertTo: isConversion
      ? via != null && via.length > 0
        ? `${name(convertto)} via ${name(via)}`
        : name(convertto)
      : null,
    convertToName: isConversion ? name(convertto) : null,
    estimated: isConversion ? estimated : null,
    // A conversion (not a pre-conversion) with no estimate: the old form
    // warned it, and so does the wizard's Confirm.
    noEstimate: isConversion && !preconvert && estimated == null,
    highSlippage,
    // A currency whose controller can mint (proof protocol 2).
    centralized:
      converterdef != null && converterdef.proofprotocol === 2
        ? converterdef.fullyqualifiedname
        : null,
    arrives:
      preconvert || burn === true
        ? null
        : ethereum && isConversion && !isExport
        ? '40-90 minutes'
        : isExport
        ? '20-90 minutes'
        : isConversion
        ? '2-10 minutes'
        : '1-5 minutes',
    toNetwork: isExport ? name(exportto) : null,
    // A transfer without a conversion can still name the converter it is
    // imported through; with a conversion "Convert to" names it.
    via: !isConversion && via != null && via.length > 0 ? name(via) : null,
    // Only an Ethereum card sends "Receive as" (the bridge's mapping).
    receiveAs: mapto != null && mapto.length > 0 ? name(mapto) : null,
    alsoSent: amounts(sent).filter(item => item.id !== currency),
    fees: amounts(fees),
    feesLabel: ethereum ? 'Maximum fees' : 'Fees',
    conversionFee: conversionFee.isZero() ? null : `${conversionFee.toString()} ${name(currency)}`,
    remaining: amounts(remaining, true),
  };
};
