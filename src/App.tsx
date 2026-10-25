import { useState, useEffect, useCallback, useRef } from 'react';
import { BIBLE_BOOKS, DAILY_VERSES } from './data/bibleBooks';
import type { BibleBook } from './data/bibleBooks';
import { getCrossRefs } from './data/crossReferences';
import AIPanel from './components/AIPanel';

// ─── Types ──────────────────────────────────────────────────────────────────
type Theme = 'dark' | 'light' | 'sepia';
type FontFamily = 'serif' | 'sans';
type HighlightColor = 1 | 2 | 3;

interface Verse { verse: number; text: string; }
interface Chapter { chapter: number; verses: Verse[]; }
type BibleData = Record<string, Record<number, Chapter>>;

interface Bookmark {
  bookId: string; bookName: string;
  chapter: number; verse: number; text: string;
}
interface Highlight {
  bookId: string; chapter: number; verse: number; color: HighlightColor;
}
interface Toast { message: string; type: 'success' | 'info'; icon: string; }

// ─── Storage helpers ──────────────────────────────────────────────────────────
function loadLS<T>(key: string, fallback: T): T {
  try { return JSON.parse(localStorage.getItem(key) ?? '') ?? fallback; } catch { return fallback; }
}
function saveLS<T>(key: string, val: T) { localStorage.setItem(key, JSON.stringify(val)); }

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function App() {
  // Theme & Settings
  const [theme, setTheme] = useState<Theme>(() => loadLS('mq_theme', 'dark'));
  const [fontSize, setFontSize] = useState<number>(() => {
    const val = loadLS<number>('mq_font_size', 16);
    // Reset if old default was 18px
    if (val === 18) { localStorage.setItem('mq_font_size', JSON.stringify(16)); return 16; }
    return val;
  });
  const [lineHeight, setLineHeight] = useState<number>(() => {
    const val = loadLS('mq_line_height', 1.5);
    if (val >= 1.8) { saveLS('mq_line_height', 1.5); return 1.5; }
    return val;
  });
  const [fontFamily, setFontFamily] = useState<FontFamily>(() => loadLS('mq_font_family', 'serif'));
  const [showSettings, setShowSettings] = useState(false);

  // Data Loading
  const [bibleData, setBibleData] = useState<BibleData | null>(null);
  const [isLoadingBible, setIsLoadingBible] = useState(true);

  // Navigation
  const [testament, setTestament] = useState<'kakuu-moofaa' | 'kakuu-haaraa'>('kakuu-moofaa');
  const [activeBook, setActiveBook] = useState<BibleBook | null>(null);
  const [activeChapter, setActiveChapter] = useState<number>(1);
  const [bookSearch, setBookSearch] = useState('');

  // User Data
  const [bookmarks, setBookmarks] = useState<Bookmark[]>(() => loadLS('mq_bookmarks', []));
  const [highlights, setHighlights] = useState<Highlight[]>(() => loadLS('mq_highlights', []));

  // Search
  const [globalSearch, setGlobalSearch] = useState('');
  const [showSearchResults, setShowSearchResults] = useState(false);

  // UI
  const [toast, setToast] = useState<Toast | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const readerRef = useRef<HTMLDivElement>(null);

  // ─── AI State ────────────────────────────────────────────────────────────────
  const [aiPanelOpen, setAiPanelOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [aiApiKey, setAiApiKey] = useState<string>(() => {
    const stored = loadLS('mq_ai_key', '');
    return stored || '';
  });
  const [aiSelectedVerse, setAiSelectedVerse] = useState<{
    bookName: string; bookId: string; chapter: number; verse: number; text: string;
  } | null>(null);
  // Track which verse shows inline cross-refs
  const [expandedCrossRef, setExpandedCrossRef] = useState<string | null>(null);

  // Daily verse
  const dailyVerse = DAILY_VERSES[new Date().getDay() % DAILY_VERSES.length];

  // ─── Effects ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    saveLS('mq_theme', theme);
  }, [theme]);

  useEffect(() => {
    document.documentElement.style.setProperty('--font-size', `${fontSize}px`);
    document.documentElement.style.setProperty('--line-height', String(lineHeight));
    document.documentElement.style.setProperty('--font-serif',
      fontFamily === 'serif' ? "'Noto Serif', Georgia, serif" : "'Inter', sans-serif"
    );
    saveLS('mq_font_size', fontSize);
    saveLS('mq_line_height', lineHeight);
    saveLS('mq_font_family', fontFamily);
  }, [fontSize, lineHeight, fontFamily]);

  useEffect(() => { saveLS('mq_bookmarks', bookmarks); }, [bookmarks]);
  useEffect(() => { saveLS('mq_highlights', highlights); }, [highlights]);
  useEffect(() => { saveLS('mq_ai_key', aiApiKey); }, [aiApiKey]);

  // Load Bible Data
  useEffect(() => {
    fetch('./fullBible.json')
      .then(res => res.json())
      .then(data => { setBibleData(data); setIsLoadingBible(false); })
      .catch(() => setIsLoadingBible(false));
  }, []);

  // ─── Helpers ─────────────────────────────────────────────────────────────────
  const showToast = useCallback((message: string, type: Toast['type'] = 'success', icon = '✓') => {
    setToast({ message, type, icon });
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2500);
  }, []);

  const navigateChapter = useCallback((dir: 1 | -1) => {
    if (!activeBook) return;
    const next = activeChapter + dir;
    if (next >= 1 && next <= activeBook.chapters) setActiveChapter(next);
  }, [activeBook, activeChapter]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;
      if (e.key === 'ArrowRight' || e.key === 'l') navigateChapter(1);
      if (e.key === 'ArrowLeft' || e.key === 'h') navigateChapter(-1);
      if (e.key === 'Escape') {
        setShowSearchResults(false);
        setShowSettings(false);
        setGlobalSearch('');
        setAiPanelOpen(false);
        setExpandedCrossRef(null);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [navigateChapter]);

  // Scroll to top when chapter changes
  useEffect(() => {
    if (readerRef.current) readerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    setExpandedCrossRef(null);
  }, [activeBook, activeChapter]);

  const selectBook = (book: BibleBook) => {
    setActiveBook(book);
    setActiveChapter(1);
    setShowSearchResults(false);
    setGlobalSearch('');
    setExpandedCrossRef(null);
  };

  // Navigate to a specific verse (used by AI cross-refs)
  const navigateToVerse = useCallback((bookId: string, chapter: number, _verse: number) => {
    const book = BIBLE_BOOKS.find(b => b.id === bookId);
    if (!book) return;
    setTestament(book.testament);
    setActiveBook(book);
    setActiveChapter(chapter);
    setAiPanelOpen(false);
    setShowSearchResults(false);
    showToast(`${book.name} ${chapter}:${_verse} → bane`, 'success', '📖');
  }, [showToast]);

  // Open AI panel for a verse
  const openAiForVerse = (verse: Verse) => {
    if (!activeBook) return;
    setAiSelectedVerse({
      bookId: activeBook.id,
      bookName: activeBook.name,
      chapter: activeChapter,
      verse: verse.verse,
      text: verse.text,
    });
    setAiPanelOpen(true);
    setShowSettings(false);
  };

  // Get current chapter verses
  const getVerses = () => {
    if (!activeBook || !bibleData) return [];
    const bookData = bibleData[activeBook.id];
    if (bookData && bookData[activeChapter]) return bookData[activeChapter].verses;
    return [];
  };

  // Filter books
  const filteredBooks = BIBLE_BOOKS.filter(b =>
    b.testament === testament &&
    (bookSearch === '' ||
      b.name.toLowerCase().includes(bookSearch.toLowerCase()) ||
      b.englishName.toLowerCase().includes(bookSearch.toLowerCase()) ||
      b.abbreviation.toLowerCase().includes(bookSearch.toLowerCase()))
  );

  // Global search
  const searchResults: { book: BibleBook; chapter: number; verse: number; text: string }[] = [];
  if (globalSearch.trim().length >= 3 && bibleData) {
    const q = globalSearch.trim().toLowerCase();
    outer: for (const book of BIBLE_BOOKS) {
      const bookData = bibleData[book.id];
      if (!bookData) continue;
      for (const [chNum, chData] of Object.entries(bookData)) {
        for (const v of chData.verses) {
          if (v.text.toLowerCase().includes(q)) {
            searchResults.push({ book, chapter: Number(chNum), verse: v.verse, text: v.text });
            if (searchResults.length >= 100) break outer;
          }
        }
      }
    }
  }

  // Highlight / Bookmark state
  const getHighlight = (verse: number) =>
    highlights.find(h => h.bookId === activeBook?.id && h.chapter === activeChapter && h.verse === verse);
  const isBookmarked = (verse: number) =>
    bookmarks.some(b => b.bookId === activeBook?.id && b.chapter === activeChapter && b.verse === verse);

  const toggleHighlight = (verse: number, color: HighlightColor) => {
    if (!activeBook) return;
    const key = { bookId: activeBook.id, chapter: activeChapter, verse };
    const existing = highlights.find(h => h.bookId === key.bookId && h.chapter === key.chapter && h.verse === key.verse);
    if (existing?.color === color) {
      setHighlights(prev => prev.filter(h => !(h.bookId === key.bookId && h.chapter === key.chapter && h.verse === key.verse)));
    } else {
      setHighlights(prev => [
        ...prev.filter(h => !(h.bookId === key.bookId && h.chapter === key.chapter && h.verse === key.verse)),
        { ...key, color },
      ]);
    }
  };

  const toggleBookmark = (verse: number, text: string) => {
    if (!activeBook) return;
    if (isBookmarked(verse)) {
      setBookmarks(prev => prev.filter(b => !(b.bookId === activeBook.id && b.chapter === activeChapter && b.verse === verse)));
      showToast('Waraqaan haqame', 'info', '🗑️');
    } else {
      setBookmarks(prev => [...prev, {
        bookId: activeBook.id, bookName: activeBook.name,
        chapter: activeChapter, verse,
        text: text.substring(0, 60) + (text.length > 60 ? '…' : ''),
      }]);
      showToast('Waraqaan qabame!', 'success', '🔖');
    }
  };

  const copyVerse = (verse: number, text: string) => {
    if (!activeBook) return;
    navigator.clipboard.writeText(`"${text}" — ${activeBook.name} ${activeChapter}:${verse}`)
      .then(() => showToast('Barruu garagalfame!', 'success', '📋'));
  };

  const navigateToBookmark = (bm: Bookmark) => {
    const book = BIBLE_BOOKS.find(b => b.id === bm.bookId);
    if (book) { setTestament(book.testament); setActiveBook(book); setActiveChapter(bm.chapter); }
  };

  const highlightSearchText = (text: string, query: string) => {
    if (!query) return text;
    const idx = text.toLowerCase().indexOf(query.toLowerCase());
    if (idx < 0) return text;
    return text.slice(0, idx) + `<mark>${text.slice(idx, idx + query.length)}</mark>` + text.slice(idx + query.length);
  };

  const verses = getVerses();

  return (
    <div className={`app-container ${aiPanelOpen ? 'ai-panel-is-open' : ''}`}>
      {/* ──────── SIDEBAR ──────── */}
      <aside className={`sidebar ${!sidebarOpen ? 'collapsed' : ''}`}>
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon">📖</div>
          <div className="sidebar-logo-text">
            <h1>Macaafa Qulqulluu</h1>
            <p>Afaan Oromoo Bible</p>
          </div>
        </div>

        {/* AI Quick Access */}
        <button
          className={`sidebar-ai-btn ${aiPanelOpen ? 'active' : ''}`}
          onClick={() => { setAiPanelOpen(p => !p); setShowSettings(false); }}
        >
          <span className="sidebar-ai-icon">✦</span>
          <span>Ibsa AI</span>
          {aiPanelOpen && <span className="sidebar-ai-dot" />}
        </button>

        {/* Testament Tabs */}
        <div className="testament-tabs">
          <button
            className={`testament-tab ${testament === 'kakuu-moofaa' ? 'active' : ''}`}
            onClick={() => { setTestament('kakuu-moofaa'); setBookSearch(''); }}
          >Kakuu Moofaa</button>
          <button
            className={`testament-tab ${testament === 'kakuu-haaraa' ? 'active' : ''}`}
            onClick={() => { setTestament('kakuu-haaraa'); setBookSearch(''); }}
          >Kakuu Haaraa</button>
        </div>

        {/* Book Search */}
        <div className="sidebar-search">
          <span className="sidebar-search-icon">🔍</span>
          <input
            type="text"
            placeholder="Macaafa barbaadi..."
            value={bookSearch}
            onChange={e => setBookSearch(e.target.value)}
          />
        </div>

        {/* Book List */}
        <div className="book-list">
          {filteredBooks.length === 0 && (
            <div className="no-results">
              <div className="no-results-icon">🔍</div>
              <div>Kitaabni argamne hin jiru</div>
            </div>
          )}
          {filteredBooks.map(book => (
            <div key={book.id}>
              <div
                className={`book-item ${activeBook?.id === book.id ? 'active' : ''}`}
                onClick={() => selectBook(book)}
              >
                <span className="book-abbr">{book.abbreviation}</span>
                <span className="book-name">{book.name}</span>
                <span className="book-chapters-count">{book.chapters}</span>
              </div>
              {activeBook?.id === book.id && (
                <div className="chapter-grid-container">
                  <div className="chapter-grid-label">Boqonnaalee</div>
                  <div className="chapter-grid">
                    {Array.from({ length: book.chapters }, (_, i) => i + 1).map(ch => (
                      <button
                        key={ch}
                        className={`chapter-btn ${activeChapter === ch ? 'active' : ''}`}
                        onClick={() => setActiveChapter(ch)}
                      >{ch}</button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Bookmarks */}
        {bookmarks.length > 0 && (
          <div className="sidebar-bookmarks">
            <div className="sidebar-bookmarks-header">
              <span>🔖</span> Waraqaalee ({bookmarks.length})
            </div>
            {bookmarks.slice().reverse().slice(0, 8).map((bm, i) => (
              <div key={i} className="bookmark-item" onClick={() => navigateToBookmark(bm)}>
                <div className="bookmark-dot" />
                <div className="bookmark-text">{bm.bookName} {bm.chapter}:{bm.verse}</div>
                <button
                  className="bookmark-remove"
                  onClick={e => { e.stopPropagation(); setBookmarks(prev => prev.filter((_, idx) => idx !== bookmarks.length - 1 - i)); }}
                >✕</button>
              </div>
            ))}
          </div>
        )}
      </aside>

      {/* ──────── MAIN CONTENT ──────── */}
      <div className="main-content">
        {/* Header */}
        <header className="header">
          <button 
            className="header-btn" 
            onClick={() => setSidebarOpen(p => !p)}
            title="Sidebar Banaa/Cufaa"
            style={{ marginRight: '10px' }}
          >
            ☰
          </button>
          
          <div className="header-search">
            <span className="header-search-icon">🔍</span>
            <input
              type="text"
              placeholder="Macaafa Qulqulluu keessaa barbaadi... (3+ qubee)"
              value={globalSearch}
              onChange={e => { setGlobalSearch(e.target.value); setShowSearchResults(e.target.value.trim().length >= 3); }}
              onFocus={() => globalSearch.trim().length >= 3 && setShowSearchResults(true)}
            />
            {globalSearch && (
              <button className="header-search-clear" onClick={() => { setGlobalSearch(''); setShowSearchResults(false); }}>✕</button>
            )}
          </div>

          <div className="header-spacer" />

          {/* AI button in header */}
          <button
            className={`header-ai-btn ${aiPanelOpen ? 'active' : ''}`}
            onClick={() => { setAiPanelOpen(p => !p); setShowSettings(false); }}
            title="Ibsa AI"
          >
            <span className="header-ai-sparkle">✦</span>
            <span className="header-btn-label">AI</span>
          </button>

          {/* Theme Selector */}
          <div className="theme-selector">
            <button className={`theme-btn ${theme === 'dark' ? 'active' : ''}`} onClick={() => setTheme('dark')} title="Dukkana">🌙</button>
            <button className={`theme-btn ${theme === 'light' ? 'active' : ''}`} onClick={() => setTheme('light')} title="Ifaa">☀️</button>
            <button className={`theme-btn ${theme === 'sepia' ? 'active' : ''}`} onClick={() => setTheme('sepia')} title="Sepia">📜</button>
          </div>

          <button
            className={`header-btn ${showSettings ? 'active' : ''}`}
            onClick={() => setShowSettings(p => !p)}
            title="Qindaa'ina"
          >
            ⚙️ <span className="header-btn-label">Qindaa'ina</span>
          </button>
        </header>

        {/* Search Results */}
        {showSearchResults && (
          <div className="search-results-panel">
            <div className="search-results-header">
              <div className="search-results-title">Barbaacha: &quot;{globalSearch}&quot;</div>
              <div className="search-results-count">{searchResults.length} argame</div>
            </div>
            {searchResults.length === 0 ? (
              <div className="no-results">
                <div className="no-results-icon">🔍</div>
                <div>Waan barbaaddan hin argamne.</div>
              </div>
            ) : (
              searchResults.map((r, i) => (
                <div key={i} className="search-result-item" onClick={() => {
                  setTestament(r.book.testament); setActiveBook(r.book);
                  setActiveChapter(r.chapter); setShowSearchResults(false); setGlobalSearch('');
                }}>
                  <div className="search-result-ref">{r.book.name} {r.chapter}:{r.verse}</div>
                  <div className="search-result-text" dangerouslySetInnerHTML={{ __html: highlightSearchText(r.text, globalSearch) }} />
                </div>
              ))
            )}
          </div>
        )}

        {/* Main Reader */}
        <div className="reader-wrapper" ref={readerRef}>
          {isLoadingBible ? (
            <div className="welcome-screen">
              <div className="welcome-glow" style={{ animation: 'pulse 1.5s infinite' }}>⏳</div>
              <h2 className="welcome-title">Macaafa Qulqulluu Guutuu Fe'aa Jira...</h2>
              <p className="welcome-subtitle">Maaloo yeroo gabaabaaf obsaa.</p>
            </div>
          ) : !activeBook ? (
            <div className="welcome-screen">
              <div className="welcome-glow">📖</div>
              <h2 className="welcome-title">Baga Nagaan Dhufte!</h2>
              <p className="welcome-subtitle">Macaafa Qulqulluu Afaan Oromoo — Kakuu Moofaa fi Haaraa</p>

              <div className="daily-verse-card">
                <div className="daily-verse-label">Dubbifannaa Guyyaa Har&apos;aa</div>
                <p className="daily-verse-text">{dailyVerse.text}</p>
                <div className="daily-verse-ref">— {dailyVerse.book} {dailyVerse.chapter}:{dailyVerse.verse}</div>
              </div>

              {/* AI invite on welcome */}
              <div className="welcome-ai-invite" onClick={() => setAiPanelOpen(true)}>
                <span className="welcome-ai-sparkle">✦</span>
                <span>Ibsa AI — Macaafa Qulqulluu Afaan Oromoodhaan ibsi</span>
                <span className="welcome-ai-arrow">→</span>
              </div>

              <p className="welcome-hint">
                Macaafa filadhaa ➜ Boqonnaa filadhaa ➜ Dubbisuu jalqabi
                &nbsp;&nbsp;|&nbsp;&nbsp;
                <span className="kbd-shortcut"><kbd>←</kbd> <kbd>→</kbd></span> boqonnaa geeddari
              </p>
            </div>
          ) : (
            <div className="reader-content">
              <div className="chapter-header">
                <div className="chapter-book-name">
                  📖 &nbsp;{activeBook.testament === 'kakuu-moofaa' ? 'Kakuu Moofaa' : 'Kakuu Haaraa'}
                  &nbsp;·&nbsp; {activeBook.englishName}
                </div>
                <h2 className="chapter-title">{activeBook.name} {activeChapter}</h2>
                <div className="chapter-nav">
                  <button className="chapter-nav-btn" onClick={() => navigateChapter(-1)} disabled={activeChapter === 1}>← Dura</button>
                  <button className="chapter-nav-btn" onClick={() => navigateChapter(1)} disabled={activeChapter === activeBook.chapters}>Itti aanu →</button>
                  <span className="chapter-progress">{activeChapter} / {activeBook.chapters}</span>
                </div>
              </div>

              {/* Verses */}
              <div className="verses-container">
                {verses.filter(v => v.text && v.text.trim() !== '').map(v => {
                  const hl = getHighlight(v.verse);
                  const bm = isBookmarked(v.verse);
                  const crossRefs = getCrossRefs(activeBook.id, activeChapter, v.verse);
                  const verseKey = `${activeBook.id}:${activeChapter}:${v.verse}`;
                  const showCrossRef = expandedCrossRef === verseKey;
                  return (
                    <div key={v.verse} className={[
                      'verse',
                      hl ? `highlighted-${hl.color}` : '',
                      bm ? 'bookmarked' : '',
                      showCrossRef ? 'verse-expanded' : '',
                    ].join(' ').trim()}>
                      <span className="verse-num">{v.verse}</span>
                      <div className="verse-body">
                        <span className="verse-text">{v.text}</span>

                        {/* Cross-Reference inline chips */}
                        {crossRefs.length > 0 && (
                          <div className={`cross-ref-row ${showCrossRef ? 'open' : ''}`}>
                            <button
                              className="cross-ref-toggle"
                              onClick={() => setExpandedCrossRef(showCrossRef ? null : verseKey)}
                              title="Linkeroonni aayaa walqabatoo"
                            >
                              🔗 {crossRefs.length} linker {showCrossRef ? '▲' : '▼'}
                            </button>
                            {showCrossRef && (
                              <div className="cross-ref-chips">
                                {crossRefs.map((ref, i) => (
                                  <button
                                    key={i}
                                    className="cross-ref-chip"
                                    onClick={() => navigateToVerse(ref.bookId, ref.chapter, ref.verse)}
                                    title={ref.label}
                                  >
                                    📖 {BIBLE_BOOKS.find(b => b.id === ref.bookId)?.name ?? ref.bookId} {ref.chapter}:{ref.verse}
                                    <span className="cross-ref-label">{ref.label}</span>
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Verse actions */}
                      <div className="verse-actions">
                        {/* AI Button — primary & glowing */}
                        <button
                          className="verse-action-btn ai-verse-btn"
                          title="Ibsa AI — Ibsa fi Linkers"
                          onClick={() => openAiForVerse(v)}
                        >✦</button>
                        <button className="verse-action-btn highlight-gold" title="Warqee" onClick={() => toggleHighlight(v.verse, 1)}>🟡</button>
                        <button className="verse-action-btn highlight-green" title="Magariisa" onClick={() => toggleHighlight(v.verse, 2)}>🟢</button>
                        <button className="verse-action-btn highlight-blue" title="Cuquliisa" onClick={() => toggleHighlight(v.verse, 3)}>🔵</button>
                        <button className="verse-action-btn bookmark-btn" title="Waraqaa" onClick={() => toggleBookmark(v.verse, v.text)}>
                          {bm ? '🔖' : '📌'}
                        </button>
                        <button className="verse-action-btn copy-btn" title="Garagalchi" onClick={() => copyVerse(v.verse, v.text)}>📋</button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Bottom nav */}
              <div className="chapter-nav" style={{ marginTop: '40px', paddingTop: '20px', borderTop: '1px solid var(--clr-border)' }}>
                <button className="chapter-nav-btn" onClick={() => navigateChapter(-1)} disabled={activeChapter === 1}>← Boqonnaa Dursaa</button>
                <button className="chapter-nav-btn" onClick={() => navigateChapter(1)} disabled={activeChapter === activeBook.chapters}>Boqonnaa Itti Aanaa →</button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ──────── AI PANEL ──────── */}
      <AIPanel
        isOpen={aiPanelOpen}
        onClose={() => setAiPanelOpen(false)}
        selectedVerse={aiSelectedVerse}
        onNavigate={navigateToVerse}
        apiKey={aiApiKey}
        onApiKeyChange={key => setAiApiKey(key)}
      />

      {/* ──────── SETTINGS PANEL ──────── */}
      {showSettings && (
        <div className="settings-panel">
          <div className="settings-title">⚙️ &nbsp;Qindaa'ina</div>

          <div className="settings-group">
            <div className="settings-label">
              <span>Guddina Barruu</span>
              <span className="settings-value">{fontSize}px</span>
            </div>
            <input type="range" className="settings-slider" min={14} max={28} step={1}
              value={fontSize} onChange={e => setFontSize(Number(e.target.value))} />
          </div>

          <div className="settings-group">
            <div className="settings-label">
              <span>Fageenya Sarara</span>
              <span className="settings-value">{lineHeight}x</span>
            </div>
            <input type="range" className="settings-slider" min={1.0} max={2.4} step={0.1}
              value={lineHeight} onChange={e => setLineHeight(Number(e.target.value))} />
          </div>

          <div className="settings-group">
            <div className="settings-label">Gosa Barruu</div>
            <div className="font-family-btns">
              <button className={`font-family-btn ${fontFamily === 'serif' ? 'active' : ''}`}
                style={{ fontFamily: "'Noto Serif', serif" }} onClick={() => setFontFamily('serif')}>
                Noto Serif — Barruu Seenaa
              </button>
              <button className={`font-family-btn ${fontFamily === 'sans' ? 'active' : ''}`}
                style={{ fontFamily: "'Inter', sans-serif" }} onClick={() => setFontFamily('sans')}>
                Inter — Barruu Ammayyaa
              </button>
            </div>
          </div>

          {/* AI Key in settings */}
          <div className="settings-group">
            <div className="settings-label">
              <span>✦ Gemini API Key</span>
              <span className="settings-value" style={{ color: aiApiKey ? 'var(--clr-success)' : 'var(--clr-bookmark)' }}>
                {aiApiKey ? '✓ Active' : '✗ Hin jiru'}
              </span>
            </div>
            <input
              type="password"
              placeholder="AIza..."
              value={aiApiKey}
              onChange={e => setAiApiKey(e.target.value)}
              style={{
                width: '100%', padding: '8px 12px', background: 'var(--clr-surface-3)',
                border: '1px solid var(--clr-border)', borderRadius: '8px',
                color: 'var(--clr-text-primary)', fontFamily: 'var(--font-ui)', fontSize: '0.78rem',
                outline: 'none',
              }}
            />
            <p style={{ fontSize: '0.68rem', color: 'var(--clr-text-muted)', marginTop: '4px' }}>
              Key bilisaa: aistudio.google.com
            </p>
          </div>

          <div className="settings-group">
            <div className="settings-label">Xabala Gaaffii</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {[
                { keys: ['←', '→'], label: 'Boqonnaa geeddari' },
                { keys: ['Esc'], label: 'Cufaa / Geeddaraa' },
              ].map(({ keys, label }) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.78rem', color: 'var(--clr-text-secondary)' }}>{label}</span>
                  <div style={{ display: 'flex', gap: '3px' }}>
                    {keys.map(k => (
                      <kbd key={k} style={{
                        background: 'var(--clr-surface-3)', border: '1px solid var(--clr-border)',
                        borderRadius: '4px', padding: '2px 6px', fontSize: '0.7rem',
                        color: 'var(--clr-text-secondary)', fontFamily: 'var(--font-ui)',
                      }}>{k}</kbd>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="settings-group">
            <div className="settings-label">
              <span>🔖 Waraqaalee</span>
              <span className="settings-value">{bookmarks.length}</span>
            </div>
            {bookmarks.length > 0 && (
              <button
                style={{
                  background: 'var(--clr-surface-2)', border: '1px solid var(--clr-border)',
                  borderRadius: '8px', color: 'var(--clr-bookmark)', cursor: 'pointer',
                  padding: '8px 14px', fontSize: '0.78rem', fontFamily: 'var(--font-ui)',
                  width: '100%', textAlign: 'left', transition: 'all 150ms',
                }}
                onClick={() => { setBookmarks([]); showToast('Waraqaalee hundi haqaman', 'info', '🗑️'); }}
              >
                🗑️ Waraqaalee hunda haquu
              </button>
            )}
          </div>
        </div>
      )}

      {/* ──────── TOAST ──────── */}
      {toast && (
        <div className={`toast ${toast.type}`}>
          <span className="toast-icon">{toast.icon}</span>
          {toast.message}
        </div>
      )}
    </div>
  );
}
