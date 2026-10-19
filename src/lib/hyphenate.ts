// Headings have automatic hyphenation turned off (it broke ordinary words like
// "monitoring" across lines). A few German and Hungarian words are still wider
// than a phone screen at heading size, so they get a soft hyphen at a natural
// joint. It shows only when the word actually has to break.
// Add a word here when the overflow scan finds a new one.
const SHY = '­';
const WORD_JOINER = '⁠';

const BREAK_POINTS = [
  'Hochverfügbarkeits|architekturen',
  'Geschäfts|kritische',
  'Geodaten|infrastruktur',
  'Datenschutz|erklärung',
  'Ausfall|sicherheit',
  'rendszer|tervezés',
];

const replacements = BREAK_POINTS.map((word) => [word.replace('|', ''), word.replace('|', SHY)]);

export function hyphenate(text: string): string;
export function hyphenate(text: string | undefined): string | undefined;
export function hyphenate(text: string | undefined): string | undefined {
  if (!text) return text;
  let out = text;
  for (const [plain, soft] of replacements) out = out.replaceAll(plain, soft);
  // Keep Hungarian suffixes on product names together ("PostGIS-t", "QGIS-ben")
  return out.replace(/([A-Z]{2,})-(?=[a-záéíóöőúüű])/g, `$1-${WORD_JOINER}`);
}
