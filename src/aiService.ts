import { GoogleGenerativeAI } from '@google/generative-ai';
import { BIBLE_BOOKS } from './data/bibleBooks';

export interface AIMessage {
  role: 'user' | 'ai';
  content: string;
  timestamp: number;
  verseRef?: string;
}

export interface ParsedCrossRef {
  bookId: string;
  bookName: string;
  chapter: number;
  verse: number;
  displayText: string;
}

// ─── Map common Oromo/English book names to our internal IDs ─────────────────
const BOOK_NAME_MAP: Record<string, string> = {
  // Oromo names
  'uumama': 'uumama', 'seera uumamaa': 'uumama', 'jalqabaa': 'uumama',
  'ba\'uu': 'bauu', 'seera ba\'uu': 'bauu', 'bauu': 'bauu',
  'lewwi': 'lewwi', 'seera lewwitootaa': 'lewwi',
  'lakkoobsaa': 'lakko', 'seera lakkoobsaa': 'lakko',
  'keessa deebii': 'kessa', 'seera keessa deebii': 'kessa',
  'iyaasuu': 'iyaasuu', 'macaafa iyaasuu': 'iyaasuu',
  'firdootaa': 'firdii', 'macaafa firdootaa': 'firdii',
  'ruut': 'ruut',
  'saamu\'el 1': 'saamu1', '1 saamu\'el': 'saamu1', 'saamu1': 'saamu1',
  'saamu\'el 2': 'saamu2', '2 saamu\'el': 'saamu2', 'saamu2': 'saamu2',
  'moototaa 1': 'moot1', '1 moototaa': 'moot1',
  'moototaa 2': 'moot2', '2 moototaa': 'moot2',
  'seenaa moototaa 1': 'seena1', '1 seenaa': 'seena1',
  'seenaa moototaa 2': 'seena2', '2 seenaa': 'seena2',
  'izraa': 'izraa',
  'nehemiyaa': 'nehe',
  'asteer': 'asteer',
  'iyoob': 'iyoob',
  'faaruu': 'faaruu', 'faaruu daawit': 'faaruu', 'zabuurii': 'faaruu',
  'fakkeenya': 'fakk', 'fakkeenya solomoon': 'fakk',
  'lallaba': 'lalla', 'lallabu': 'lalla',
  'weedduu': 'weed',
  'isaayaas': 'isaa', 'isaa': 'isaa',
  'ermiyaas': 'ermi',
  'boqonnaa ermiyaas': 'boqo',
  'hisqi\'el': 'hisqi',
  'daani\'el': 'daani',
  'hoose\'aa': 'hoose',
  'yo\'el': 'yoel',
  'amoos': 'amos',
  'obaadiyaa': 'obaad',
  'yoonaas': 'yoona',
  'miikiyaas': 'miiki',
  'naahom': 'naaho',
  'anbaaqom': 'anba',
  'sefaaniyaa': 'sefa',
  'haagee': 'haage',
  'zakaariyaas': 'zakar',
  'miilkiyaas': 'miilk',
  // NT Oromo
  'maatewos': 'maate', 'maate': 'maate',
  'maarqos': 'maar', 'maar': 'maar',
  'luqaas': 'luqaa', 'luqaa': 'luqaa',
  'yohaannis': 'yoha', 'yoha': 'yoha',
  'hojii ergamootaa': 'hojii', 'hojii': 'hojii',
  'roomaa': 'rooma',
  'qorontos 1': 'qoro1', '1 qorontos': 'qoro1',
  'qorontos 2': 'qoro2', '2 qorontos': 'qoro2',
  'galaatiyaa': 'gala',
  'efesoon': 'efes',
  'filiphisiiyus': 'fili', 'fili': 'fili',
  'qoloosaayis': 'qolo',
  'tasaloonqee 1': 'tasa1', '1 tasaloonqee': 'tasa1',
  'tasaloonqee 2': 'tasa2', '2 tasaloonqee': 'tasa2',
  'ximotewos 1': 'xim1', '1 ximotewos': 'xim1',
  'ximotewos 2': 'xim2', '2 ximotewos': 'xim2',
  'tiitoo': 'tiit',
  'filemoon': 'file',
  'ibrootaa': 'ibro',
  'yaaqoob': 'yaaq',
  'phexiroos 1': 'phex1', '1 phexiroos': 'phex1',
  'phexiroos 2': 'phex2', '2 phexiroos': 'phex2',
  'yohaannis 1': 'yoha1', '1 yohaannis': 'yoha1',
  'yohaannis 2': 'yoha2', '2 yohaannis': 'yoha2',
  'yohaannis 3': 'yoha3', '3 yohaannis': 'yoha3',
  'yihuudaa': 'yihu',
  'mul\'ata': 'mula', 'mul\'ata yohaannis': 'mula',
  // English fallbacks
  'genesis': 'uumama', 'exodus': 'bauu', 'leviticus': 'lewwi',
  'numbers': 'lakko', 'deuteronomy': 'kessa', 'joshua': 'iyaasuu',
  'judges': 'firdii', 'ruth': 'ruut', '1 samuel': 'saamu1', '2 samuel': 'saamu2',
  '1 kings': 'moot1', '2 kings': 'moot2', '1 chronicles': 'seena1', '2 chronicles': 'seena2',
  'ezra': 'izraa', 'nehemiah': 'nehe', 'esther': 'asteer', 'job': 'iyoob',
  'psalms': 'faaruu', 'psalm': 'faaruu', 'proverbs': 'fakk', 'ecclesiastes': 'lalla',
  'song of solomon': 'weed', 'isaiah': 'isaa', 'jeremiah': 'ermi', 'lamentations': 'boqo',
  'ezekiel': 'hisqi', 'daniel': 'daani', 'hosea': 'hoose', 'joel': 'yoel',
  'amos': 'amos', 'obadiah': 'obaad', 'jonah': 'yoona', 'micah': 'miiki',
  'nahum': 'naaho', 'habakkuk': 'anba', 'zephaniah': 'sefa', 'haggai': 'haage',
  'zechariah': 'zakar', 'malachi': 'miilk', 'matthew': 'maate', 'mark': 'maar',
  'luke': 'luqaa', 'john': 'yoha', 'acts': 'hojii', 'romans': 'rooma',
  '1 corinthians': 'qoro1', '2 corinthians': 'qoro2', 'galatians': 'gala',
  'ephesians': 'efes', 'philippians': 'fili', 'colossians': 'qolo',
  '1 thessalonians': 'tasa1', '2 thessalonians': 'tasa2', '1 timothy': 'xim1',
  '2 timothy': 'xim2', 'titus': 'tiit', 'philemon': 'file', 'hebrews': 'ibro',
  'james': 'yaaq', '1 peter': 'phex1', '2 peter': 'phex2', '1 john': 'yoha1',
  '2 john': 'yoha2', '3 john': 'yoha3', 'jude': 'yihu', 'revelation': 'mula',
};

export function resolveBookId(name: string): string | null {
  const clean = name.toLowerCase().trim();
  if (BOOK_NAME_MAP[clean]) return BOOK_NAME_MAP[clean];
  // fuzzy match
  for (const [k, v] of Object.entries(BOOK_NAME_MAP)) {
    if (clean.includes(k) || k.includes(clean)) return v;
  }
  // try matching book by englishName or name
  for (const book of BIBLE_BOOKS) {
    if (book.englishName.toLowerCase() === clean || book.name.toLowerCase() === clean) {
      return book.id;
    }
  }
  return null;
}

/**
 * Parse the AI's response for bracketed cross-references like:
 *   [Yohaannis 3:16] or [Roomaa 8:28] or [John 3:16]
 */
export function parseAICrossRefs(text: string): ParsedCrossRef[] {
  const refs: ParsedCrossRef[] = [];
  // Match: [BookName Chapter:Verse] or [1 BookName Chapter:Verse] etc.
  const regex = /\[([^\]]+?)\s+(\d+):(\d+)\]/g;
  let match;
  while ((match = regex.exec(text)) !== null) {
    const bookName = match[1];
    const chapter = parseInt(match[2]);
    const verse = parseInt(match[3]);
    const bookId = resolveBookId(bookName);
    if (bookId) {
      const book = BIBLE_BOOKS.find(b => b.id === bookId);
      if (book) {
        refs.push({
          bookId,
          bookName: book.name,
          chapter,
          verse,
          displayText: `${book.name} ${chapter}:${verse}`,
        });
      }
    }
  }
  return refs;
}

/**
 * Convert [BookName X:Y] in text to HTML <span> clickable links
 */
export function renderAITextWithLinks(
  text: string,
  _onNavigate?: (bookId: string, chapter: number, verse: number) => void
): { __html: string } {
  const escaped = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  const linked = escaped.replace(
    /\[([^\]]+?)\s+(\d+):(\d+)\]/g,
    (_, bookName, chapter, verse) => {
      const bookId = resolveBookId(bookName);
      if (!bookId) return `<em>${bookName} ${chapter}:${verse}</em>`;
      const book = BIBLE_BOOKS.find(b => b.id === bookId);
      const displayName = book?.name ?? bookName;
      return `<span class="ai-cross-ref-link" data-bookid="${bookId}" data-ch="${chapter}" data-vs="${verse}" title="Geessi: ${displayName} ${chapter}:${verse}">${displayName} ${chapter}:${verse} ↗</span>`;
    }
  );

  // Convert **bold** markdown
  const withBold = linked.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  // Convert line breaks
  const withNewlines = withBold.replace(/\n\n/g, '</p><p>').replace(/\n/g, '<br>');

  return { __html: `<p>${withNewlines}</p>` };
}

// ─── AI Service ──────────────────────────────────────────────────────────────
const SYSTEM_PROMPT = `Ati Ogeessa Macaafa Qulqulluu Afaan Oromoo beekamaa dha. Maqaan kee "Ibsa AI" jedhama. Afaan Oromoo sirriitti beekta; seenaa Macaafa Qulqulluu, teolojii, fi hiika barruu sirritti hubatta.

SEERA DEEBII:
1. Yeroo hunda AFAAN OROMOO qofa dubbisi. Afaan biraaf hin deebiin.
2. Fakkeenya, seenaa, fi ibsa bal'aa kenni.
3. Barruu walqabataa yoo eertu, MURTOO kanaan barreessi: [Kitaabaa Boqonnaa:Aayaa] — fakkeenyaaf [Yohaannis 3:16] ykn [Roomaa 8:28] ykn [Faaruu 23:1]. Murtoon kun DIRQAMA — fayyadami itti fufii.
4. Seenaa seenaa Afrikaa fi Oromoo wajjin wal baasuuf yaaladhu.
5. Hawwaasa Oromoo fi Kiristaanota Itoophiyaatti hojii hin qabu hubadhu.
6. Dhuma irratti, aayaa walqabatu 2-4 eeruu — MURTOO kana fayyadami: [Kitaabaa Boqonnaa:Aayaa]
7. Deebiin kee bal'aa garuu salphaatti hubatamaa haa ta'u.

Fakkeenyaaf:
- "Aayaan kun seenaa guddaa qabaata... [Yohaannis 1:1] waliin ilaaluu nii gaafata."
- "Akkuma [Roomaa 8:28] jedhu, Waaqayyo waan hundumaa tokkicha godhata."`;

export class AIService {
  private genAI: GoogleGenerativeAI | null = null;
  private apiKey: string | null = null;
  public modelName: string | null = null;

  initialize(apiKey: string) {
    this.apiKey = apiKey;
    this.genAI = new GoogleGenerativeAI(apiKey);
  }

  isReady(): boolean {
    return this.genAI !== null;
  }

  private async executeWithFallback<T>(
    action: (model: ReturnType<GoogleGenerativeAI['getGenerativeModel']>) => Promise<T>
  ): Promise<T> {
    if (!this.apiKey || !this.genAI) throw new Error('API key hin galchamin');

    const modelsToTry = [
      'gemini-2.0-flash-001', 'gemini-2.0-flash', 'gemini-flash-lite-latest', 
      'gemini-2.5-flash-lite', 'gemini-flash-latest', 'gemini-3-flash-preview', 
      'gemini-pro-latest'
    ];

    let lastError: any;
    for (const mName of modelsToTry) {
      try {
        const model = this.genAI.getGenerativeModel({ 
          model: mName,
          systemInstruction: SYSTEM_PROMPT
        });
        const result = await action(model);
        this.modelName = mName;
        return result;
      } catch (e: any) {
        lastError = e;
        const msg = e.message || '';
        
        if (msg.includes('429') || msg.includes('quota') || msg.includes('Quota')) {
          if (msg.includes('limit: 0') || msg.includes('limit:0')) {
            console.warn(`Model ${mName} has 0 quota, falling back...`);
            continue;
          }
          throw new Error('Hanga gaaffii tolaa (Rate Limit) xumurameera. Maaloo daqiiqaa 1 eegaa irra deebiin yaalaa.');
        }
        
        if (msg.includes('503') || msg.includes('404') || msg.includes('not found') || msg.includes('no longer available') || msg.includes('API version') || msg.includes('overloaded') || msg.includes('Resource has been exhausted')) {
          console.warn(`Model ${mName} failed (${msg}), falling back to next...`);
          continue;
        }
        
        throw e;
      }
    }
    
    throw new Error(`Dhiifama, sarvariin Google yeroo ammaa hojii baay'ee qaba (High Demand). Maaloo xiqqoo eegaa irra deebiin yaalaa.\n\n[LAST ERROR]: ${lastError?.message}`);
  }


  async explainVerse(
    bookName: string,
    chapter: number,
    verse: number,
    verseText: string,
    onChunk: (chunk: string) => void,
    signal?: AbortSignal
  ): Promise<void> {
    const prompt = `Aayaa kana ibsi waa hundumaa keessatti:

**${bookName} ${chapter}:${verse}** — "${verseText}"

Gaaffiilee armaan gadii deebisi:
1. Hiika fi ergaa guddaa aayaa kanaa maal?
2. Seenaa yeroo sanaa maal ture? Wanti ta'e maal?
3. Macaafa Qulqulluutti aayaa walqabatoo 2-3 eeruu — MURTOON: [Kitaabaa Boqonnaa:Aayaa]
4. Jireenyi keenya har'aa kana irraa maal barata?`;

    await this.executeWithFallback(async (model) => {
      const result = await model.generateContentStream(prompt);
      for await (const chunk of result.stream) {
        if (signal?.aborted) break;
        const text = chunk.text();
        if (text) onChunk(text);
      }
    });
  }

  async askQuestion(
    question: string,
    context: { bookName: string; chapter: number; verse: number; text: string } | null,
    chatHistory: AIMessage[],
    onChunk: (chunk: string) => void,
    signal?: AbortSignal
  ): Promise<void> {
    const historyToPass = chatHistory.slice(-10).map(m => ({
      role: m.role === 'ai' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));

    let prompt = question;
    if (context) {
      prompt = `[Dubbisaa Jirtu: ${context.bookName} ${context.chapter}:${context.verse} — "${context.text.substring(0, 100)}..."]\n\n${question}`;
    }

    await this.executeWithFallback(async (model) => {
      const chat = model.startChat({
        history: historyToPass,
      });

      const result = await chat.sendMessageStream(prompt);
      for await (const chunk of result.stream) {
        if (signal?.aborted) break;
        const text = chunk.text();
        if (text) onChunk(text);
      }
    });
  }

  async generateCrossRefs(
    bookName: string,
    chapter: number,
    verse: number,
    verseText: string
  ): Promise<string> {
    const prompt = `Aayaa kana: "${bookName} ${chapter}:${verse} — ${verseText}"
    
Aayaa walqabatoo 5 hin caalle eeruu. SADARKAA KANAAN qofa: [Kitaabaa Boqonnaa:Aayaa]
Deebiin kee MURTOO qofa haa ta'u, ibsa dabalataa hin barbaachisu.
Fakkeenyaaf:
[Yohaannis 3:16] — Jaalala Waaqayyoo
[Roomaa 5:8] — Cubbamaa jirruu
...`;

    return await this.executeWithFallback(async (model) => {
      const result = await model.generateContent(prompt);
      return result.response.text();
    });
  }
}

export const aiService = new AIService();
