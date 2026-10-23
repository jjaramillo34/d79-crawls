// Registration analytics: estimates where registrants come from using the free-text "school" field.
// Nothing here is asked on the form, so every figure is an estimate and unknowns stay "Not identified".

export const BOROUGHS = ['Manhattan', 'The Bronx', 'Brooklyn', 'Queens', 'Staten Island'] as const;
export const NOT_IDENTIFIED = 'Not identified';

const BOROUGH_BY_LETTER: Record<string, string> = { M: 'Manhattan', X: 'The Bronx', K: 'Brooklyn', Q: 'Queens', R: 'Staten Island' };

// Geographic districts 1–32 → borough (75 and 79 are citywide, so no borough)
function boroughForDistrict(district: number): string | null {
  if (district >= 1 && district <= 6) return 'Manhattan';
  if (district >= 7 && district <= 12) return 'The Bronx';
  if ((district >= 13 && district <= 23) || district === 32) return 'Brooklyn';
  if (district >= 24 && district <= 30) return 'Queens';
  if (district === 31) return 'Staten Island';
  return null;
}

const KEYWORDS: [RegExp, string][] = [
  [/\bstaten\s+island\b/i, 'Staten Island'],
  [/\bbronx\b/i, 'The Bronx'],
  [/\bbrooklyn\b/i, 'Brooklyn'],
  [/\bqueens\b/i, 'Queens'],
  [/\b(manhattan|harlem)\b/i, 'Manhattan'],
];

/** School code like 24Q019 / 24Q19 / 06M319 (district, borough letter, school number). */
const DBN = /\b(\d{1,2})\s*([MXKQR])\s*(\d{2,3})\b/i;
/** Borough letter after a school number, e.g. "PS145K", "IS 230 X". */
const SCHOOL_WITH_LETTER = /\b(?:p\.?\s?s|i\.?\s?s|m\.?\s?s|j\.?\s?h\.?\s?s|h\.?\s?s)\.?\s*\d{1,3}\s*([MXKQR])\b/i;
const DISTRICT = /\b(?:district|dist\.?|d)\s*(\d{1,2})\b/i;

export function estimateBorough(school: string): string {
  const text = school || '';
  const dbn = text.match(DBN);
  if (dbn) return BOROUGH_BY_LETTER[dbn[2].toUpperCase()];
  const withLetter = text.match(SCHOOL_WITH_LETTER);
  if (withLetter) return BOROUGH_BY_LETTER[withLetter[1].toUpperCase()];
  for (const [pattern, borough] of KEYWORDS) {
    if (pattern.test(text)) return borough;
  }
  const district = text.match(DISTRICT);
  if (district) return boroughForDistrict(Number(district[1])) ?? NOT_IDENTIFIED;
  return NOT_IDENTIFIED;
}

export const SCHOOL_TYPES = [
  'High school / transfer',
  'Middle school',
  'Elementary school',
  'District 75',
  'Office or support role',
  'School code only',
  NOT_IDENTIFIED,
] as const;

export function estimateSchoolType(school: string): string {
  const text = school || '';
  if (/\b75\s*[MXKQR]\s*\d{2,3}\b|district\s*75|\bd75\b/i.test(text)) return 'District 75';
  if (/high\s*school|\bh\.?s\.?\b|academy|transfer|diploma|p-?tech|yabc|\bhs\d/i.test(text)) return 'High school / transfer';
  if (/\b(i\.?\s?s|m\.?\s?s|j\.?\s?h\.?\s?s)\.?\s*\d/i.test(text)) return 'Middle school';
  if (/\bp\.?\s?s\.?\s*\d/i.test(text)) return 'Elementary school';
  if (/office|superintend|district|ossp|dial|coordinator|counsel|psycholog|\bcbo\b|nycps|\bdoe\b|team|social\s*worker|parent|\bpit\b|in\s+training/i.test(text)) {
    return 'Office or support role';
  }
  if (DBN.test(text)) return 'School code only';
  return NOT_IDENTIFIED;
}

/** Grouping key so "Brooklyn Frontiers High School " and "Brooklyn Frontiers HS" count as one. */
export function schoolKey(school: string) {
  return (school || '')
    .toLowerCase()
    .replace(/high\s*school/g, 'hs')
    .replace(/\bp\.\s?s\.?/g, 'ps')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .replace(/\b(ps|is|ms|hs)\s+0*(\d)/g, '$1 $2')
    .trim();
}

export interface AnalyticsRegistration {
  school: string;
  createdAt: Date;
  locationName: string;
}

export function buildAnalytics(registrations: AnalyticsRegistration[], locationNames: string[], timeZone = 'America/New_York') {
  const dayOf = (date: Date) => new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);

  // Sign-ups per day, including days with none between the first and last sign-up
  const perDay = new Map<string, number>();
  for (const reg of registrations) perDay.set(dayOf(reg.createdAt), (perDay.get(dayOf(reg.createdAt)) || 0) + 1);
  const days = [...perDay.keys()].sort();
  const timeline: { date: string; count: number }[] = [];
  if (days.length > 0) {
    for (let d = new Date(`${days[0]}T12:00:00Z`); d.toISOString().slice(0, 10) <= days[days.length - 1]; d.setUTCDate(d.getUTCDate() + 1)) {
      const date = d.toISOString().slice(0, 10);
      timeline.push({ date, count: perDay.get(date) || 0 });
    }
  }

  // Counts in a fixed order; `alwaysShow` rows appear even at zero
  const count = (values: string[], order: readonly string[], alwaysShow: readonly string[] = []) => {
    const counts = new Map<string, number>();
    for (const value of values) counts.set(value, (counts.get(value) || 0) + 1);
    return order
      .map(label => ({ label, count: counts.get(label) || 0 }))
      .filter(row => row.count > 0 || alwaysShow.includes(row.label));
  };

  const boroughs = registrations.map(reg => estimateBorough(reg.school));
  const byBorough = count(boroughs, [...BOROUGHS, NOT_IDENTIFIED], BOROUGHS);
  const bySchoolType = count(registrations.map(reg => estimateSchoolType(reg.school)), SCHOOL_TYPES);

  // Home borough × crawl location
  const matrix = [...BOROUGHS, NOT_IDENTIFIED].map(borough => ({
    borough,
    counts: locationNames.map(name => registrations.filter((reg, i) => boroughs[i] === borough && reg.locationName === name).length),
  })).filter(row => row.counts.some(n => n > 0));

  // Schools, grouped; shown with the most common spelling
  const groups = new Map<string, { spellings: Map<string, number>; count: number; locations: Map<string, number>; borough: string }>();
  registrations.forEach((reg, i) => {
    const key = schoolKey(reg.school) || '(blank)';
    const group = groups.get(key) ?? { spellings: new Map(), count: 0, locations: new Map(), borough: boroughs[i] };
    const spelling = (reg.school || '').trim() || '(blank)';
    group.spellings.set(spelling, (group.spellings.get(spelling) || 0) + 1);
    group.locations.set(reg.locationName, (group.locations.get(reg.locationName) || 0) + 1);
    group.count++;
    if (group.borough === NOT_IDENTIFIED && boroughs[i] !== NOT_IDENTIFIED) group.borough = boroughs[i];
    groups.set(key, group);
  });
  const schools = [...groups.values()]
    .map(group => ({
      name: [...group.spellings.entries()].sort((a, b) => b[1] - a[1])[0][0],
      count: group.count,
      borough: group.borough,
      locations: [...group.locations.entries()].sort((a, b) => b[1] - a[1]).map(([name, n]) => ({ name, count: n })),
    }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));

  const peak = timeline.reduce<{ date: string; count: number } | null>((best, day) => (!best || day.count > best.count ? day : best), null);

  return {
    total: registrations.length,
    schoolCount: schools.length,
    boroughIdentified: boroughs.filter(b => b !== NOT_IDENTIFIED).length,
    peakDay: peak && peak.count > 0 ? peak : null,
    timeline,
    byBorough,
    bySchoolType,
    matrix: { locations: locationNames, rows: matrix },
    schools,
  };
}
