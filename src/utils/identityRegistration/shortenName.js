// Shortens a long VerusID name in the middle for a sheet title, keeping its start
// and its ending (".VRSCTEST@", or the parent and "@"). One "…" replaces the cut.
// "name?" fits one line of the 21/27 sheet title at 360 dp, so a long name
// never breaks inside and "?" never stands alone ("Delete" takes the first).
export const NAME_TITLE_BUDGET = 20;
const TAIL_CAP = 12;
const NO_DOT_TAIL = 6;

export const shortenNameForTitle = (name, fallback = 'registration', budget = NAME_TITLE_BUDGET) => {
  if (!name || typeof name !== 'string') return fallback;
  if (name.length <= budget) return name;
  const dot = name.lastIndexOf('.');
  const tail = dot > 0 ? name.slice(Math.max(dot, name.length - TAIL_CAP)) : name.slice(-NO_DOT_TAIL);
  const head = name.slice(0, budget - 1 - tail.length);
  return `${head}…${tail}`;
};
