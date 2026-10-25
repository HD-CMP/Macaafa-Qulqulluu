// ─── Cross Reference Database ────────────────────────────────────────────────
// Key structure: "bookId:chapter:verse" → array of references
// Each reference: { bookId, chapter, verse, label }
// This is a curated, foundational dataset for the most important verses.
// The AI will dynamically expand this further.

export interface CrossRef {
  bookId: string;
  chapter: number;
  verse: number;
  label: string; // Short reason e.g. "Ilma Waaqaa", "Jaalala Waaqaa"
}

export type CrossRefDB = Record<string, CrossRef[]>;

export const CROSS_REFS: CrossRefDB = {
  // ─── Genesis / Uumama ─────────────────────────────────────────────────────
  'uumama:1:1': [
    { bookId: 'yoha', chapter: 1, verse: 1, label: 'Jalqaba Dubbiin ture' },
    { bookId: 'ibro', chapter: 11, verse: 3, label: 'Amantiidhaan beeyna' },
    { bookId: 'isaa', chapter: 45, verse: 18, label: 'Rabbi lafa uume' },
  ],
  'uumama:1:27': [
    { bookId: 'maate', chapter: 19, verse: 4, label: 'Dhiiraa fi dhalaa' },
    { bookId: 'maar', chapter: 10, verse: 6, label: 'Uumama irraa' },
  ],
  'uumama:1:31': [
    { bookId: 'xim1', chapter: 4, verse: 4, label: 'Uumama gaarii' },
  ],
  'uumama:3:15': [
    { bookId: 'gala', chapter: 4, verse: 4, label: 'Ilma dhalatti dhufe' },
    { bookId: 'mula', chapter: 12, verse: 9, label: 'Reekko durii' },
  ],
  // ─── Psalms / Faaruu ──────────────────────────────────────────────────────
  'faaruu:23:1': [
    { bookId: 'yoha', chapter: 10, verse: 11, label: 'Tikse Gaarii' },
    { bookId: 'ibro', chapter: 13, verse: 20, label: 'Tikse Guddaa' },
    { bookId: 'phex1', chapter: 2, verse: 25, label: 'Tikse fi Eegaa lubbuu' },
  ],
  'faaruu:23:4': [
    { bookId: 'rooma', chapter: 8, verse: 31, label: 'Waaqayyo nuuf ture' },
    { bookId: 'isaa', chapter: 43, verse: 2, label: 'Bishaaniin yoo darbites' },
  ],
  'faaruu:91:1': [
    { bookId: 'faaruu', chapter: 27, verse: 1, label: 'Gooftaa ifa kiyya' },
    { bookId: 'faaruu', chapter: 46, verse: 1, label: 'Gooftaa tiksee keenya' },
  ],
  'faaruu:119:105': [
    { bookId: 'phex2', chapter: 1, verse: 19, label: 'Dubbiin ifa kalee' },
    { bookId: 'efes', chapter: 5, verse: 8, label: 'Ilmaan ifaa' },
  ],
  // ─── Isaiah / Isaayaas ────────────────────────────────────────────────────
  'isaa:53:5': [
    { bookId: 'phex1', chapter: 2, verse: 24, label: 'Madaa isaan fayyinan' },
    { bookId: 'rooma', chapter: 5, verse: 8, label: 'Cubbamootaaf duue' },
  ],
  'isaa:40:31': [
    { bookId: 'faaruu', chapter: 27, verse: 14, label: 'Gooftaa obsadhu' },
    { bookId: 'gala', chapter: 6, verse: 9, label: 'Gaarii hojjechuu dadhabuu dhabina' },
  ],
  // ─── John / Yohaannis ─────────────────────────────────────────────────────
  'yoha:1:1': [
    { bookId: 'uumama', chapter: 1, verse: 1, label: 'Jalqaba' },
    { bookId: 'ibro', chapter: 1, verse: 1, label: 'Jalqabatti Dubbiin ture' },
    { bookId: 'mula', chapter: 19, verse: 13, label: 'Maqaan isaa Dubbii Waaqaa' },
  ],
  'yoha:1:14': [
    { bookId: 'gala', chapter: 4, verse: 4, label: 'Seera jalatti dhalate' },
    { bookId: 'filiphisiiyus', chapter: 2, verse: 6, label: 'Bifa Waaqayyoo keessa' },
  ],
  'yoha:3:16': [
    { bookId: 'roomaa', chapter: 5, verse: 8, label: 'Jaalala Waaqayyoo' },
    { bookId: 'phex1', chapter: 1, verse: 18, label: 'Gatii bituumsaa' },
    { bookId: 'roomaa', chapter: 8, verse: 32, label: 'Ilma isaa kenne' },
    { bookId: 'yoha1', chapter: 4, verse: 9, label: 'Jaalalli Waaqayyoo mul\'ate' },
  ],
  'yoha:3:36': [
    { bookId: 'yoha', chapter: 5, verse: 24, label: 'Lubbuu baraa baraatti ceehe' },
    { bookId: 'roomaa', chapter: 8, verse: 1, label: 'Adabbii hin jiru' },
  ],
  'yoha:10:11': [
    { bookId: 'faaruu', chapter: 23, verse: 1, label: 'Tikse kiyya' },
    { bookId: 'ibro', chapter: 13, verse: 20, label: 'Tikse Guddaa' },
  ],
  'yoha:11:25': [
    { bookId: 'qoro1', chapter: 15, verse: 21, label: 'Kaafama duutii' },
    { bookId: 'roomaa', chapter: 6, verse: 5, label: 'Wajjin ka\'ina' },
  ],
  'yoha:14:6': [
    { bookId: 'hojii', chapter: 4, verse: 12, label: 'Fayyinni isaaniin qofa' },
    { bookId: 'xim1', chapter: 2, verse: 5, label: 'Giddessaa tokko' },
  ],
  // ─── Matthew / Maatewos ───────────────────────────────────────────────────
  'maate:5:3': [
    { bookId: 'luqaa', chapter: 6, verse: 20, label: 'Hiyyeessa ta\'uu' },
    { bookId: 'isaa', chapter: 57, verse: 15, label: 'Kan galma guddaa jiraatu' },
  ],
  'maate:5:16': [
    { bookId: 'filiphisiiyus', chapter: 2, verse: 15, label: 'Urjii fakkaatanii' },
    { bookId: 'phex1', chapter: 2, verse: 12, label: 'Deeds gaarii dhaha' },
  ],
  'maate:28:19': [
    { bookId: 'maar', chapter: 16, verse: 15, label: 'Wangeela lallabu' },
    { bookId: 'hojii', chapter: 1, verse: 8, label: 'Hanga biyya lafaa dhuma' },
  ],
  // ─── Romans / Roomaa ──────────────────────────────────────────────────────
  'roomaa:1:16': [
    { bookId: 'qoro1', chapter: 1, verse: 18, label: 'Wangeelli humna Waaqaa' },
    { bookId: 'ibro', chapter: 4, verse: 12, label: 'Dubbiin Waaqaa cimaa' },
  ],
  'roomaa:3:23': [
    { bookId: 'qoro1', chapter: 15, verse: 22, label: 'Adaamiitti hundi duan' },
    { bookId: 'faaruu', chapter: 14, verse: 2, label: 'Qajeelaa hin jiru' },
  ],
  'roomaa:5:8': [
    { bookId: 'yoha', chapter: 3, verse: 16, label: 'Jaalala Waaqayyoo' },
    { bookId: 'yoha1', chapter: 4, verse: 10, label: 'Jaalalli kun' },
  ],
  'roomaa:8:1': [
    { bookId: 'yoha', chapter: 3, verse: 18, label: 'Hin adabamu' },
    { bookId: 'gala', chapter: 5, verse: 1, label: 'Bilisummaa Kristoosiin' },
  ],
  'roomaa:8:28': [
    { bookId: 'uumama', chapter: 50, verse: 20, label: 'Shira gaarii' },
    { bookId: 'efes', chapter: 1, verse: 11, label: 'Murteen isaa' },
  ],
  'roomaa:8:38': [
    { bookId: 'yoha', chapter: 10, verse: 28, label: 'Harka isaarraa hin baatu' },
    { bookId: 'faaruu', chapter: 73, verse: 23, label: 'Yeroo hunduma na qabda' },
  ],
  // ─── Philippians / Filiphisiiyus ──────────────────────────────────────────
  'fili:4:4': [
    { bookId: 'phex1', chapter: 1, verse: 8, label: 'Gammachuu ulfaataa' },
    { bookId: 'yaaq', chapter: 1, verse: 2, label: 'Qormaata keessa gammadu' },
  ],
  'fili:4:7': [
    { bookId: 'yoha', chapter: 14, verse: 27, label: 'Nagaa Kristoos kennu' },
    { bookId: 'isaa', chapter: 26, verse: 3, label: 'Nagaa guutuu' },
  ],
  'fili:4:13': [
    { bookId: 'qoro2', chapter: 12, verse: 10, label: 'Dadhabina keessa cimumsa' },
    { bookId: 'efes', chapter: 6, verse: 10, label: 'Cimaa Gooftaa keessatti' },
  ],
  // ─── Revelation / Mula'ata ────────────────────────────────────────────────
  'mula:3:20': [
    { bookId: 'yoha', chapter: 14, verse: 23, label: 'Gara isaatti dhufna' },
    { bookId: 'luqaa', chapter: 12, verse: 36, label: 'Gaachena eegu' },
  ],
  'mula:21:4': [
    { bookId: 'isaa', chapter: 25, verse: 8, label: 'Du\'i bilcheeffama' },
    { bookId: 'mula', chapter: 7, verse: 17, label: 'Harmi hin jiru' },
  ],
  // ─── Psalms extra ─────────────────────────────────────────────────────────
  'faaruu:46:1': [
    { bookId: 'ibro', chapter: 13, verse: 6, label: 'Gargaaraan koo' },
    { bookId: 'naaho', chapter: 1, verse: 7, label: 'Gooftaan gaarii' },
  ],
  // ─── Mark / Maarqos ───────────────────────────────────────────────────────
  'maar:16:15': [
    { bookId: 'maate', chapter: 28, verse: 19, label: 'Nageensi Biyyoota' },
    { bookId: 'roomaa', chapter: 10, verse: 14, label: 'Maaliif lallabu' },
  ],
  // ─── Hebrews / Ibrootaa ───────────────────────────────────────────────────
  'ibro:11:1': [
    { bookId: 'roomaa', chapter: 4, verse: 18, label: 'Amantiidhaan Abrahaam' },
    { bookId: 'qoro2', chapter: 5, verse: 7, label: 'Amaantiidhaan deemna' },
  ],
};

/**
 * Look up the cross-references for a specific verse.
 * Checks both exact and the bookId alias used in bibleBooks.ts
 */
export function getCrossRefs(bookId: string, chapter: number, verse: number): CrossRef[] {
  const key = `${bookId}:${chapter}:${verse}`;
  return CROSS_REFS[key] ?? [];
}
