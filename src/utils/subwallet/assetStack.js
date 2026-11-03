// Input is already in balance order. Every visible shape counts toward the cap.
export const buildAssetStack = (cards, selectedId, compact) => {
  const cap = compact ? 4 : 6;
  const front = cards.find(card => card.wallet.id === selectedId);
  if (!front) return [];
  const others = cards.filter(card => card !== front);
  const visible = others.slice(0, others.length < cap ? cap - 1 : cap - 2);
  const hidden = others.slice(visible.length);
  return [
    ...(hidden.length ? [{key: 'more', hidden}] : []),
    ...visible.reverse().map(card => ({key: card.wallet.id, card})),
    {key: front.wallet.id, card: front},
  ];
};
