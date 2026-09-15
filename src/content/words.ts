/**
 * ============================================================
 *  HEBREW WORD LIST — safe to edit by hand.
 *  Add an entry and it is live. The level is derived from the
 *  number of letters, so you never assign one:
 *      2-3 letters -> level 1
 *      4 letters   -> level 2
 *      5+ letters  -> level 3
 *  Keep `icon` to a single emoji that a 6-year-old recognises
 *  without being told the word.
 * ============================================================
 */

export interface WordEntry {
  word: string;
  icon: string;
}

export const WORDS: WordEntry[] = [
  // ---------- קצרות (2-3 אותיות) ----------
  { word: "אבא", icon: "👨" },
  { word: "אמא", icon: "👩" },
  { word: "יד", icon: "✋" },
  { word: "פה", icon: "👄" },
  { word: "אף", icon: "👃" },
  { word: "עין", icon: "👁️" },
  { word: "שן", icon: "🦷" },
  { word: "רגל", icon: "🦵" },
  { word: "לב", icon: "❤️" },
  { word: "כלב", icon: "🐕" },
  { word: "דג", icon: "🐟" },
  { word: "פרה", icon: "🐄" },
  { word: "סוס", icon: "🐎" },
  { word: "צב", icon: "🐢" },
  { word: "דב", icon: "🐻" },
  { word: "גמל", icon: "🐪" },
  { word: "עוף", icon: "🐔" },
  { word: "עץ", icon: "🌳" },
  { word: "פרח", icon: "🌸" },
  { word: "עלה", icon: "🍃" },
  { word: "שמש", icon: "☀️" },
  { word: "ירח", icon: "🌙" },
  { word: "ענן", icon: "☁️" },
  { word: "גשם", icon: "🌧️" },
  { word: "שלג", icon: "❄️" },
  { word: "הר", icon: "⛰️" },
  { word: "ים", icon: "🌊" },
  { word: "אש", icon: "🔥" },
  { word: "קשת", icon: "🌈" },
  { word: "בית", icon: "🏠" },
  { word: "דלת", icon: "🚪" },
  { word: "כסא", icon: "🪑" },
  { word: "ספה", icon: "🛋️" },
  { word: "נר", icon: "🕯️" },
  { word: "ספר", icon: "📕" },
  { word: "לחם", icon: "🍞" },
  { word: "מים", icon: "💧" },
  { word: "חלב", icon: "🥛" },
  { word: "תה", icon: "🍵" },
  { word: "גזר", icon: "🥕" },
  { word: "חסה", icon: "🥬" },
  { word: "תות", icon: "🍓" },

  // ---------- בינוניות (4 אותיות) ----------
  { word: "חתול", icon: "🐱" },
  { word: "ארנב", icon: "🐰" },
  { word: "עכבר", icon: "🐭" },
  { word: "זברה", icon: "🦓" },
  { word: "נמלה", icon: "🐜" },
  { word: "פרפר", icon: "🦋" },
  { word: "אריה", icon: "🦁" },
  { word: "דובי", icon: "🧸" },
  { word: "תנין", icon: "🐊" },
  { word: "תפוח", icon: "🍎" },
  { word: "בננה", icon: "🍌" },
  { word: "עוגה", icon: "🍰" },
  { word: "תפוז", icon: "🍊" },
  { word: "אננס", icon: "🍍" },
  { word: "ביצה", icon: "🥚" },
  { word: "מזלג", icon: "🍴" },
  { word: "כפית", icon: "🥄" },
  { word: "צלחת", icon: "🍽️" },
  { word: "כובע", icon: "🧢" },
  { word: "מעיל", icon: "🧥" },
  { word: "שמלה", icon: "👗" },
  { word: "מיטה", icon: "🛏️" },
  { word: "חלון", icon: "🪟" },
  { word: "מקרר", icon: "🧊" },
  { word: "מחשב", icon: "💻" },
  { word: "כדור", icon: "⚽" },
  { word: "אוטו", icon: "🚗" },
  { word: "רכבת", icon: "🚂" },
  { word: "מטוס", icon: "✈️" },
  { word: "סירה", icon: "⛵" },
  { word: "מסוק", icon: "🚁" },
  { word: "כוכב", icon: "⭐" },
  { word: "ילדה", icon: "👧" },

  // ---------- ארוכות (5-6 אותיות) ----------
  { word: "גבינה", icon: "🧀" },
  { word: "ציפור", icon: "🐦" },
  { word: "דבורה", icon: "🐝" },
  { word: "גלידה", icon: "🍦" },
  { word: "שוקולד", icon: "🍫" },
  { word: "סוכריה", icon: "🍬" },
  { word: "עוגיה", icon: "🍪" },
  { word: "מלפפון", icon: "🥒" },
  { word: "ענבים", icon: "🍇" },
  { word: "אבטיח", icon: "🍉" },
  { word: "לימון", icon: "🍋" },
  { word: "דובדבן", icon: "🍒" },
  { word: "שולחן", icon: "🪑" },
  { word: "טלפון", icon: "📱" },
  { word: "חולצה", icon: "👕" },
  { word: "נעליים", icon: "👟" },
  { word: "תמונה", icon: "🖼️" },
  { word: "בקבוק", icon: "🍼" },
  { word: "מכונית", icon: "🚙" },
  { word: "צוללת", icon: "🛥️" },
  { word: "שמיים", icon: "🌤️" },
  { word: "כוכבים", icon: "✨" },
  { word: "פסנתר", icon: "🎹" },
  { word: "גיטרה", icon: "🎸" },
  { word: "תופים", icon: "🥁" },
  { word: "עיפרון", icon: "✏️" },
  { word: "מחברת", icon: "📓" },
  { word: "ילקוט", icon: "🎒" },
  { word: "מסיבה", icon: "🎉" },
];

/** Every Hebrew letter, including the five final forms. Used for decoys. */
export const ALEFBET = "אבגדהוזחטיכךלמםנןסעפףצץקרשת".split("");

/** 2-3 letters -> 1, 4 -> 2, 5+ -> 3. */
export function wordLevel(word: string): number {
  if (word.length <= 3) return 1;
  if (word.length === 4) return 2;
  return 3;
}

export function wordsAtLevel(level: number): WordEntry[] {
  const pool = WORDS.filter((w) => wordLevel(w.word) === level);
  return pool.length > 0 ? pool : WORDS;
}
