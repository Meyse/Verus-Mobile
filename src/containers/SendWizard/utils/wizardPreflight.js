// Wizard preflight: channel-aware destination build and preflight routing (no legacy modal)
import BigNumber from "bignumber.js";
import { ethers } from "ethers";
import {
  TransferDestination,
  fromBase58Check,
  R_ADDRESS_VERSION,
  I_ADDRESS_VERSION,
  DEST_ETH,
  DEST_PKH,
  DEST_ID,
} from "verus-typescript-primitives";
import { coinsToSats } from "../../../utils/math";
import { preflightSend } from "../../../utils/api/routers/preflightSend";
import { preflightConvertOrCrossChain } from "../../../utils/api/routers/preflightConvertOrCrossChain";
import { getIdentity } from "../../../utils/api/routers/getIdentity";
import { API_SEND } from "../../../utils/constants/intervalConstants";

/**
 * Build a TransferDestination (or equivalent) from user input.
 */
const buildDestination = async (coinObj, activeUser, channelId, addr) => {
  let keyhash = addr;

  // Resolve VerusID suffix
  if (addr.endsWith("@")) {
    const identityRes = await getIdentity(coinObj, activeUser, channelId, addr);
    if (identityRes.error) {
      throw new Error(
        `Failed to get information about ${addr}. Try using the i-address of this VerusID.`
      );
    }
    keyhash = identityRes.result.identity.identityaddress;
  }

  // ETH-style address
  const keyhashIsEth = () => {
    try {
      return ethers.isAddress(keyhash);
    } catch (e) {
      return false;
    }
  };

  if (keyhashIsEth()) {
    return new TransferDestination({
      destination_bytes: Buffer.from(keyhash.substring(2), "hex"),
      type: DEST_ETH,
    });
  }

  const { hash, version } = fromBase58Check(keyhash);

  // Accept any P2PKH-like version as PKH; reserve ID for explicit I-address
  const type = version === I_ADDRESS_VERSION ? DEST_ID : DEST_PKH;

  return new TransferDestination({
    destination_bytes: hash,
    type,
  });
};

/**
 * Wizard-native preflight. Returns { err, result, meta }.
 */
export const wizardPreflight = async (wizardState, activeAccount) => {
  const {
    sourceCoin,
    sourceSubWallet,
    destCurrency,
    destNetwork,
    amount,
    recipient,
    memo,
    selectedPath,
  } = wizardState;

  if (!sourceCoin || !sourceSubWallet) {
    throw new Error("Select a source asset first.");
  }
  if (!destCurrency || !destNetwork) {
    throw new Error("Select a destination currency/network.");
  }
  if (!selectedPath) {
    throw new Error("Select a route before continuing.");
  }
  if (!recipient || !amount || Number(amount) <= 0) {
    throw new Error("Enter a valid recipient and amount.");
  }

  const channelId = sourceSubWallet.api_channels?.[API_SEND];
  if (!channelId) {
    throw new Error("No send channel available for this wallet.");
  }

  const destCurrencyId =
    destCurrency.currency_id || destCurrency.currencyid || destCurrency.id;
  // Try to normalize destNetwork for same-chain detection (handles iaddr system ids)
  const destNetNorm = destNetwork;
  const isDirect =
    sourceCoin.currency_id === destCurrencyId &&
    (destNetNorm === sourceCoin.system_id ||
      destNetNorm === sourceCoin.id ||
      selectedPath?.pathId === "same-network");

  // Direct/native send
  if (isDirect) {
    const amtBn = BigNumber(amount);
    return await preflightSend(
      sourceCoin,
      activeAccount,
      recipient,
      amtBn,
      channelId,
      { memo }
    );
  }

  // Convert / cross-chain / export
  const exportTo =
    selectedPath?.exportto?.currencyid || 
    (typeof selectedPath?.exportto === 'string' ? selectedPath.exportto : null);
  const via = 
    selectedPath?.via?.currencyid || 
    (typeof selectedPath?.via === 'string' ? selectedPath.via : null);
  // mapping must be a string (currency id), not a boolean
  const mapping =
    selectedPath?.mapping?.currencyid || 
    (typeof selectedPath?.mapping === 'string' ? selectedPath.mapping : null);
  const preconvert = !!selectedPath?.preconvert;
  const isMapping = !!selectedPath?.isMapping || !!selectedPath?.mapping;

  // For mapped sends (same asset bridged to another chain), don't set convertTo
  // Only set convertTo for actual currency conversions, and ensure it's a valid Verus currency ID (starts with 'i')
  let convertTo = null;
  if (!isMapping && destCurrencyId !== sourceCoin.currency_id) {
    // Only use destCurrencyId if it looks like a Verus currency ID (i-address), not an ETH contract
    if (typeof destCurrencyId === 'string' && destCurrencyId.startsWith('i')) {
      convertTo = destCurrencyId;
    }
  }

  const destination = await buildDestination(
    sourceCoin,
    activeAccount,
    channelId,
    recipient
  );

  const output = {
    currency: sourceCoin.currency_id,
    convertto: convertTo || undefined,
    exportto: exportTo || undefined,
    via: via || undefined,
    mapto: mapping || undefined,
    preconvert,
    address: destination,
    satoshis: coinsToSats(BigNumber(amount)).toString(),
  };

  // Strip nullish
  Object.keys(output).forEach((k) => {
    if (output[k] == null) delete output[k];
  });

  return await preflightConvertOrCrossChain(
    sourceCoin,
    activeAccount,
    channelId,
    output
  );
};

