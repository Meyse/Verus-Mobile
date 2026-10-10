export const convertFqnToDisplayFormat = fqn => {
  return fqn.replace('.VRSC@', '@');
};

// Lets a long VerusID name wrap after a dot instead of inside a name part.
// Display only: the inserted zero-width spaces must not reach copied text.
export const withNameBreaks = name =>
  typeof name === 'string' ? name.replace(/\./g, '.\u200B') : name;
