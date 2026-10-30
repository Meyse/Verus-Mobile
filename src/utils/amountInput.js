// Edit the displayed decimal text. Amount and fee arithmetic stays with callers.
export const editAmountInput = (
  value,
  selection,
  key,
  decimalSeparator = '.',
  maxLength = Infinity,
) => {
  const start = Math.max(0, Math.min(selection?.start ?? value.length, value.length));
  const end = Math.max(start, Math.min(selection?.end ?? start, value.length));
  const unchanged = {value, selection: {start, end}};

  if (key === 'delete') {
    const from = start === end ? Math.max(0, start - 1) : start;
    return {
      value: value.slice(0, from) + value.slice(end),
      selection: {start: from, end: from},
    };
  }

  const inserted = key === 'decimal' ? decimalSeparator : key;
  if (key !== 'decimal' && !/^\d$/.test(inserted)) return unchanged;
  const remaining = value.slice(0, start) + value.slice(end);
  if (key === 'decimal' && /[.,]/.test(remaining)) return unchanged;
  const next = value.slice(0, start) + inserted + value.slice(end);
  if (next.length > maxLength) return unchanged;
  const cursor = start + inserted.length;
  return {value: next, selection: {start: cursor, end: cursor}};
};

export const getAmountDecimalSeparator = () => {
  try {
    return new Intl.NumberFormat().format(1.1).includes(',') ? ',' : '.';
  } catch (_) {
    return '.';
  }
};
