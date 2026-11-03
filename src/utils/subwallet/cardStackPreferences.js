export const MAIN_CARD_ID = 'MAIN_WALLET';
export const PRIVATE_CARD_ID = 'PRIVATE_WALLET';

export const getCardStackPinLimit = compact => (compact ? 1 : 3);

// Undefined means the user has never changed pins. An explicit [] stays empty.
// Keep all live pins here, including pins above the current layout's limit.
export const getCardStackPins = (cards = [], pins) => {
  const ids = new Set(cards.map(card => card.id));
  return [...new Set(Array.isArray(pins) ? pins : [PRIVATE_CARD_ID])].filter(
    id => id !== MAIN_CARD_ID && ids.has(id),
  );
};

export const selectCardStackCard = (preferences = {}, cards, selectedId) => {
  const pins = getCardStackPins(cards, preferences.pins);
  return {
    ...preferences,
    selectedId,
    lastUsedId:
      selectedId !== MAIN_CARD_ID && !pins.includes(selectedId)
        ? selectedId
        : preferences.lastUsedId || null,
  };
};

export const toggleCardStackPin = ({
  preferences = {},
  cards = [],
  selectedId,
  cardId,
  compact,
}) => {
  if (cardId === MAIN_CARD_ID || !cards.some(card => card.id === cardId)) {
    return {preferences, result: 'unavailable'};
  }
  const pins = getCardStackPins(cards, preferences.pins);
  const pinned = pins.includes(cardId);
  if (!pinned && pins.length >= getCardStackPinLimit(compact)) {
    return {preferences, result: 'limit'};
  }
  // A successful edit prunes stale ids and saves an explicit ordered list.
  const next = {
    ...preferences,
    pins: pinned ? pins.filter(id => id !== cardId) : [...pins, cardId],
    lastUsedId:
      !pinned && preferences.lastUsedId === cardId
        ? null
        : preferences.lastUsedId || null,
  };
  if (
    selectedId &&
    selectedId !== MAIN_CARD_ID &&
    !next.pins.includes(selectedId)
  ) {
    next.lastUsedId = selectedId;
  }
  return {preferences: next, result: pinned ? 'unpinned' : 'pinned'};
};
