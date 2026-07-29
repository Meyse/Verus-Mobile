export const GIFT_CARD_DISPLAY_STATUS_READY = 'ready';
export const GIFT_CARD_DISPLAY_STATUS_PENDING = 'pending';
export const GIFT_CARD_DISPLAY_STATUS_NOT_FUNDED = 'not-funded';
export const GIFT_CARD_DISPLAY_STATUS_REDEEMED = 'redeemed';

const MATERIAL_PALETTES = [
  {
    id: 'indigo_twilight',
    top: '#5068E8',
    middle: '#3549B9',
    bottom: '#17245E',
    accent: '#9CC8FF',
  },
  {
    id: 'ocean_ink',
    top: '#287EA7',
    middle: '#1F567F',
    bottom: '#142A4C',
    accent: '#8FE1DB',
  },
  {
    id: 'violet_night',
    top: '#7659D8',
    middle: '#5140A8',
    bottom: '#27215E',
    accent: '#E2B8FF',
  },
  {
    id: 'teal_midnight',
    top: '#238A83',
    middle: '#21606E',
    bottom: '#172D4D',
    accent: '#A7E7C6',
  },
];

const getStableHash = value => {
  const stableValue = String(value || 'gift-card');
  let hash = 2166136261;

  for (let index = 0; index < stableValue.length; index += 1) {
    hash ^= stableValue.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
};

const getConfirmedContents = card => {
  const contents = [];

  for (const system of card?.status?.systems || []) {
    for (const currency of system.currencies || []) {
      contents.push({
        type: 'currency',
        value: String(currency.amount),
        label: currency.display?.name || currency.currencyId,
      });
    }

    for (const identity of system.identities || []) {
      contents.push({
        type: 'identity',
        value: identity.fullyQualifiedName || identity.identityAddress,
        label: 'VerusID',
      });
    }
  }

  return contents;
};

const isPendingFunding = entry =>
  entry?.status === 'pending' || entry?.pending === true;

export const getGiftCardDisplayStatus = card => {
  if (card?.status?.state === 'redeemed' || card?.status?.redeemed) {
    return GIFT_CARD_DISPLAY_STATUS_REDEEMED;
  }

  if ((card?.fundingHistory || []).some(isPendingFunding)) {
    return GIFT_CARD_DISPLAY_STATUS_PENDING;
  }

  if (
    card?.status?.state === 'funded' ||
    card?.status?.hasClaims === true ||
    getConfirmedContents(card).length > 0
  ) {
    return GIFT_CARD_DISPLAY_STATUS_READY;
  }

  return GIFT_CARD_DISPLAY_STATUS_NOT_FUNDED;
};

const getStatusLabel = status => {
  if (status === GIFT_CARD_DISPLAY_STATUS_REDEEMED) return 'Redeemed';
  if (status === GIFT_CARD_DISPLAY_STATUS_PENDING) return 'Pending';
  if (status === GIFT_CARD_DISPLAY_STATUS_READY) return 'Ready';
  return 'Not funded';
};

export const getGiftCardDisplayStatusLabel = card =>
  getStatusLabel(getGiftCardDisplayStatus(card));

export const getGiftCardPresentation = card => {
  const confirmedContents = getConfirmedContents(card);
  const pendingCount = (card?.fundingHistory || []).filter(
    isPendingFunding,
  ).length;
  const status = getGiftCardDisplayStatus(card);
  const materialHash = getStableHash(card?.id || card?.label);

  let primaryContent = confirmedContents[0] || null;

  if (!primaryContent) {
    if (status === GIFT_CARD_DISPLAY_STATUS_NOT_FUNDED) {
      primaryContent = {
        type: 'empty',
        value: 'Ready to fund',
        label: 'No contents yet',
      };
    } else {
      primaryContent = {
        type: 'empty',
        value: 'No confirmed contents',
        label: 'Pending funding is kept separate',
      };
    }
  }

  return {
    label: card?.label || 'Gift card',
    status,
    statusLabel: getStatusLabel(status),
    primaryContent,
    confirmedContents,
    confirmedItemCount: confirmedContents.length,
    additionalConfirmedCount: Math.max(confirmedContents.length - 1, 0),
    protectionLabel: card?.encrypted
      ? 'Claim password required'
      : 'Spendable link',
    hasPending: pendingCount > 0,
    pendingCount,
    material: {
      ...MATERIAL_PALETTES[materialHash % MATERIAL_PALETTES.length],
      seed: materialHash,
    },
  };
};
