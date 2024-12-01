const lc = (string) => string?.toLowerCase();

const maxChars = (string, max) => string.length <= max ? string : `${string.slice(0, (max - 1))}…`;

export {
  lc,
  maxChars,
};
