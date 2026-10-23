// Name and email cleanup for registrations and the waitlist.
// scripts/normalize-names-emails.js has a copy of these rules for the one-time database fix; keep them in sync.

const ROMAN_NUMERALS = new Set(['II', 'III', 'IV', 'VI', 'VII', 'VIII', 'IX']);

function capitalizeParts(word: string) {
  // Capitalize after the start, hyphens and apostrophes: o'connor -> O'Connor, lewin-mckenzie -> Lewin-Mckenzie
  return word.toLowerCase().replace(/(^|[-'’])(\p{L})/gu, (_, sep: string, letter: string) => sep + letter.toUpperCase());
}

/**
 * Proper-cases a person's name. Only words typed all lowercase or ALL CAPS are changed;
 * words already in mixed case (McGillicuddy, DiMaggio) are kept as typed.
 */
export function toProperCaseName(name: string) {
  return name
    .trim()
    .replace(/\s+/g, ' ')
    .split(' ')
    .map(word => {
      if (ROMAN_NUMERALS.has(word.toUpperCase()) && word === word.toUpperCase()) return word;
      const isAllLower = word === word.toLowerCase();
      const isAllUpper = word === word.toUpperCase();
      return isAllLower || isAllUpper ? capitalizeParts(word) : word;
    })
    .join(' ');
}

export function normalizeEmailAddress(email: string) {
  return email.trim().toLowerCase();
}
