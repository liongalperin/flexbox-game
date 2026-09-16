/* ============================================================================
 * environments.js — the operating environment behind each level
 * ----------------------------------------------------------------------------
 * Ten scenes, one per level, in a fixed order. The photographs live in
 * assets/maps/ (see the CREDITS.md there); this module only decides which
 * scene a level is flown over.
 *
 * The order is deliberate rather than random: it escalates from a calm home
 * airbase to the most hostile conditions, so the setting intensifies in step
 * with the puzzles — level 1 is a single centring task at base, level 10 is a
 * three-property capstone over an active volcano.
 * ==========================================================================*/

export const ENVIRONMENTS = [
  { id: 'airbase',  he: 'בסיס חיל האוויר', en: 'Air Force base' },   /*  1 — home base, clear skies   */
  { id: 'city',     he: 'עיר', en: 'City' },              /*  2 — civilian, familiar       */
  { id: 'sea',      he: 'ים פתוח', en: 'Open sea' },          /*  3 — open water, no landmarks */
  { id: 'desert',   he: 'מדבר', en: 'Desert' },             /*  4 — remote, heat             */
  { id: 'jungle',   he: 'ג׳ונגל', en: 'Jungle' },      /*  5 — dense, obscured          */
  { id: 'mountain', he: 'רכס הרים', en: 'Mountain range' },         /*  6 — altitude, hard terrain   */
  { id: 'arctic',   he: 'אזור ארקטי', en: 'Arctic zone' },       /*  7 — extreme cold             */
  { id: 'night',    he: 'מבצע לילה', en: 'Night operation' },        /*  8 — low visibility           */
  { id: 'storm',    he: 'סופה', en: 'Storm' },             /*  9 — turbulence, lightning    */
  { id: 'volcano',  he: 'הר געש', en: 'Volcanic zone' },      /* 10 — most hostile             */
];

/**
 * The scene for a 1-based level number. Levels beyond the list wrap around,
 * so an eleventh level would still render rather than fall through to nothing.
 */
export function environmentForLevel(levelNumber) {
  const n = Number(levelNumber);
  if (!Number.isFinite(n) || n < 1) return ENVIRONMENTS[0];
  return ENVIRONMENTS[(Math.floor(n) - 1) % ENVIRONMENTS.length];
}
