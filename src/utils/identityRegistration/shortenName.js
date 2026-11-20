// Shortens a long VerusID name in the middle for a sheet title, keeping its start
// and its ending (".VRSCTEST@", or the parent and "@"). One "…" replaces the cut.
// "name?" fits one line of the 21/27 sheet title at 360 dp, so a long name
// never breaks inside and "?" never stands alone ("Delete" takes the first).
// The "…" never touches a ".": at least two characters of the name stand
// between them, so "…." does not read as four dots.
export const NAME_TITLE_BUDGET = 20;
const TAIL_CAP = 12;
const NO_DOT_TAIL = 6;
const MIN_BESIDE_DOT = 2;

// Characters before the first "." of `text`, or its length without one.
const leadingRun = text => {
  const dot = text.indexOf('.');
  return dot < 0 ? text.length : dot;
};

// Characters after the last "." of `text`, or its length without one.
const trailingRun = text => text.length - 1 - text.lastIndexOf('.');

export const shortenNameForTitle = (name, fallback = 'registration', budget = NAME_TITLE_BUDGET) => {
  if (!name || typeof name !== 'string') return fallback;
  if (name.length <= budget) return name;
  const dot = name.lastIndexOf('.');
  let tailStart = dot > 0 ? Math.max(dot, name.length - TAIL_CAP) : name.length - NO_DOT_TAIL;

  // The ending starts with at least two characters before its first ".",
  // and leaves room for two characters of the start.
  const maxTail = budget - 1 - MIN_BESIDE_DOT;
  while (
    tailStart > 0 &&
    name.length - tailStart < maxTail &&
    name.slice(tailStart).includes('.') &&
    leadingRun(name.slice(tailStart)) < MIN_BESIDE_DOT
  ) tailStart -= 1;
  // A name of one-letter parts may not allow two; the "…" still never
  // stands directly before a ".".
  if (name[tailStart] === '.') tailStart += 1;
  const tail = name.slice(tailStart);

  // The start ends with at least two characters after its last ".".
  let head = name.slice(0, Math.max(0, budget - 1 - tail.length));
  while (head.includes('.') && trailingRun(head) < MIN_BESIDE_DOT) {
    head = head.slice(0, head.lastIndexOf('.'));
  }

  return `${head}…${tail}`;
};
