import { useState, useRef, useEffect, useCallback } from 'react';
import { aiService, type AIMessage, parseAICrossRefs, type ParsedCrossRef } from '../aiService';
import { BIBLE_BOOKS } from '../data/bibleBooks';

interface AIPanelProps {
  isOpen: boolean;
  onClose: () => void;
  selectedVerse: { bookName: string; bookId: string; chapter: number; verse: number; text: string } | null;
  onNavigate: (bookId: string, chapter: number, verse: number) => void;
  apiKey: string;
  onApiKeyChange: (key: string) => void;
}

export default function AIPanel({ isOpen, onClose, selectedVerse, onNavigate, apiKey, onApiKeyChange }: AIPanelProps) {
  const [messages, setMessages] = useState<AIMessage[]>([]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [aiCrossRefs, setAiCrossRefs] = useState<ParsedCrossRef[]>([]);
  const [activeTab, setActiveTab] = useState<'chat' | 'explain' | 'refs'>('explain');
  const [localApiKey, setLocalApiKey] = useState(apiKey);
  const [showKeyInput, setShowKeyInput] = useState(!apiKey);
  const [streamingText, setStreamingText] = useState('');
  const abortRef = useRef<AbortController | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingText]);

  // Init AI when key changes
  useEffect(() => {
    if (apiKey) {
      aiService.initialize(apiKey);
      setShowKeyInput(false);
    }
  }, [apiKey]);

  // Auto-explain when a new verse is selected and panel opens
  useEffect(() => {
    if (isOpen && selectedVerse && apiKey && activeTab === 'explain') {
      handleExplainVerse();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedVerse?.bookId, selectedVerse?.chapter, selectedVerse?.verse, isOpen]);

  const handleExplainVerse = useCallback(async () => {
    if (!selectedVerse || !apiKey) return;
    if (isStreaming) { abortRef.current?.abort(); }

    setIsStreaming(true);
    setStreamingText('');
    setAiCrossRefs([]);

    const abort = new AbortController();
    abortRef.current = abort;
    let full = '';

    try {
      await aiService.explainVerse(
        selectedVerse.bookName,
        selectedVerse.chapter,
        selectedVerse.verse,
        selectedVerse.text,
        (chunk) => {
          full += chunk;
          setStreamingText(full);
        },
        abort.signal
      );
      const refs = parseAICrossRefs(full);
      setAiCrossRefs(refs);
      setMessages(prev => [
        ...prev.filter(m => m.verseRef !== `${selectedVerse.bookId}:${selectedVerse.chapter}:${selectedVerse.verse}`),
        {
          role: 'ai',
          content: full,
          timestamp: Date.now(),
          verseRef: `${selectedVerse.bookId}:${selectedVerse.chapter}:${selectedVerse.verse}`,
        },
      ]);
    } catch (e: any) {
      console.error('AI Explain Error:', e);
      if (!abort.signal.aborted) {
        setStreamingText(`Dogoggora: ${e?.message || 'Wajjin wal-quunnamuu hin danda\'amne. API key sirreessi.'}`);
      }
    } finally {
      setIsStreaming(false);
      setStreamingText('');
    }
  }, [selectedVerse, apiKey, isStreaming]);

  const handleSendMessage = async () => {
    if (!input.trim() || isStreaming || !apiKey) return;

    const userMsg: AIMessage = { role: 'user', content: input.trim(), timestamp: Date.now() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsStreaming(true);
    setStreamingText('');

    const abort = new AbortController();
    abortRef.current = abort;
    let full = '';

    try {
      await aiService.askQuestion(
        userMsg.content,
        selectedVerse ? {
          bookName: selectedVerse.bookName,
          chapter: selectedVerse.chapter,
          verse: selectedVerse.verse,
          text: selectedVerse.text,
        } : null,
        messages,
        (chunk) => {
          full += chunk;
          setStreamingText(full);
        },
        abort.signal
      );
      const refs = parseAICrossRefs(full);
      setAiCrossRefs(prev => {
        const existing = new Set(prev.map(r => `${r.bookId}:${r.chapter}:${r.verse}`));
        return [...prev, ...refs.filter(r => !existing.has(`${r.bookId}:${r.chapter}:${r.verse}`))];
      });
      setMessages(prev => [...prev, { role: 'ai', content: full, timestamp: Date.now() }]);
    } catch (e: any) {
      console.error('AI Chat Error:', e);
      if (!abort.signal.aborted) {
        setMessages(prev => [...prev, {
          role: 'ai', content: `Dogoggora uumame: ${e?.message || 'Ammas yaali.'}`, timestamp: Date.now(),
        }]);
      }
    } finally {
      setIsStreaming(false);
      setStreamingText('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleSaveKey = () => {
    if (localApiKey.trim()) {
      onApiKeyChange(localApiKey.trim());
      aiService.initialize(localApiKey.trim());
      setShowKeyInput(false);
    }
  };

  const handleCrossRefClick = (ref: ParsedCrossRef) => {
    onNavigate(ref.bookId, ref.chapter, ref.verse);
  };

  // Render AI text with clickable cross-refs
  const renderAIText = (content: string) => {
    const parts: Array<{ type: 'text' | 'ref'; content: string; ref?: ParsedCrossRef }> = [];
    const regex = /\[([^\]]+?)\s+(\d+):(\d+)\]/g;
    let last = 0;
    let match;

    while ((match = regex.exec(content)) !== null) {
      if (match.index > last) {
        parts.push({ type: 'text', content: content.slice(last, match.index) });
      }
      const bookName = match[1];
      const chapter = parseInt(match[2]);
      const verse = parseInt(match[3]);
      const bookId = BIBLE_BOOKS.find(b =>
        b.name.toLowerCase().includes(bookName.toLowerCase()) ||
        b.englishName.toLowerCase().includes(bookName.toLowerCase()) ||
        b.id === bookName.toLowerCase()
      )?.id;

      if (bookId) {
        const book = BIBLE_BOOKS.find(b => b.id === bookId)!;
        parts.push({
          type: 'ref',
          content: `${book.name} ${chapter}:${verse}`,
          ref: { bookId, bookName: book.name, chapter, verse, displayText: `${book.name} ${chapter}:${verse}` },
        });
      } else {
        parts.push({ type: 'text', content: match[0] });
      }
      last = match.index + match[0].length;
    }
    if (last < content.length) {
      parts.push({ type: 'text', content: content.slice(last) });
    }

    return parts.map((p, i) => {
      if (p.type === 'ref' && p.ref) {
        return (
          <span
            key={i}
            className="ai-crossref-chip"
            onClick={() => handleCrossRefClick(p.ref!)}
            title={`Bane → ${p.content}`}
          >
            📖 {p.content} ↗
          </span>
        );
      }
      return <span key={i}>{p.content}</span>;
    });
  };

  const displayMessages = selectedVerse
    ? messages.filter(m => m.role === 'user' || m.verseRef === `${selectedVerse.bookId}:${selectedVerse.chapter}:${selectedVerse.verse}` || !m.verseRef)
    : messages;

  return (
    <div className={`ai-panel ${isOpen ? 'open' : ''}`}>
      {/* ── Header ── */}
      <div className="ai-panel-header">
        <div className="ai-panel-header-left">
          <div className="ai-logo">
            <span className="ai-logo-icon">✦</span>
            <span className="ai-logo-text">Ibsa AI</span>
          </div>
          {selectedVerse && (
            <div className="ai-verse-badge">
              {selectedVerse.bookName} {selectedVerse.chapter}:{selectedVerse.verse}
            </div>
          )}
        </div>
        <div className="ai-panel-header-actions">
          <button
            className="ai-header-btn"
            onClick={() => setShowKeyInput(p => !p)}
            title="API Key"
          >⚙</button>
          <button className="ai-header-btn ai-close-btn" onClick={onClose}>✕</button>
        </div>
      </div>

      {/* ── API Key Setup ── */}
      {showKeyInput && (
        <div className="ai-key-setup">
          <div className="ai-key-title">🔑 Gemini API Key</div>
          <p className="ai-key-desc">
            Key bilisaa argachuuf{' '}
            <span
              className="ai-key-link"
              onClick={() => window.open('https://aistudio.google.com/app/apikey', '_blank')}
            >
              aistudio.google.com
            </span>{' '}
            ilaalaa.
          </p>
          <div className="ai-key-input-row">
            <input
              type="password"
              placeholder="AIza..."
              value={localApiKey}
              onChange={e => setLocalApiKey(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSaveKey()}
              className="ai-key-input"
            />
            <button className="ai-key-save-btn" onClick={handleSaveKey}>
              Galchi
            </button>
          </div>
        </div>
      )}

      {/* ── Tabs ── */}
      <div className="ai-tabs">
        <button className={`ai-tab ${activeTab === 'explain' ? 'active' : ''}`} onClick={() => setActiveTab('explain')}>
          ✦ Ibsa
        </button>
        <button className={`ai-tab ${activeTab === 'chat' ? 'active' : ''}`} onClick={() => setActiveTab('chat')}>
          💬 Gaafii
        </button>
        <button className={`ai-tab ${activeTab === 'refs' ? 'active' : ''}`} onClick={() => setActiveTab('refs')}>
          🔗 Linkers {aiCrossRefs.length > 0 && <span className="ai-badge">{aiCrossRefs.length}</span>}
        </button>
      </div>

      {/* ── Content ── */}
      <div className="ai-panel-body">

        {/* EXPLAIN TAB */}
        {activeTab === 'explain' && (
          <div className="ai-explain-tab">
            {!apiKey ? (
              <div className="ai-no-key">
                <div className="ai-no-key-icon">🔑</div>
                <p>API Key galchi ibsa argachuuf</p>
              </div>
            ) : !selectedVerse ? (
              <div className="ai-no-verse">
                <div className="ai-no-verse-icon">✦</div>
                <p>Aayaa filadhu — ✨ cuqaasi ibsa argadhu</p>
              </div>
            ) : (
              <>
                {/* Verse card */}
                <div className="ai-verse-card">
                  <div className="ai-verse-card-ref">{selectedVerse.bookName} {selectedVerse.chapter}:{selectedVerse.verse}</div>
                  <div className="ai-verse-card-text">"{selectedVerse.text}"</div>
                </div>

                {/* Re-explain button */}
                <button
                  className={`ai-explain-btn ${isStreaming ? 'loading' : ''}`}
                  onClick={handleExplainVerse}
                  disabled={isStreaming}
                >
                  {isStreaming ? (
                    <><span className="ai-spinner" /> Ibsaa jira...</>
                  ) : (
                    <>✦ AI Ibsa Haaromsi</>
                  )}
                </button>

                {/* Streaming response */}
                {(streamingText || displayMessages.find(m => m.role === 'ai' && m.verseRef === `${selectedVerse.bookId}:${selectedVerse.chapter}:${selectedVerse.verse}`)) && (
                  <div className="ai-response-card">
                    <div className="ai-response-header">
                      <span className="ai-response-logo">✦ Ibsa AI</span>
                      {isStreaming && <span className="ai-typing-dot" />}
                    </div>
                    <div className="ai-response-text">
                      {isStreaming
                        ? renderAIText(streamingText)
                        : renderAIText(
                          displayMessages.find(m => m.role === 'ai' && m.verseRef === `${selectedVerse.bookId}:${selectedVerse.chapter}:${selectedVerse.verse}`)?.content ?? ''
                        )
                      }
                      {isStreaming && <span className="ai-cursor" />}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* CHAT TAB */}
        {activeTab === 'chat' && (
          <div className="ai-chat-tab">
            {!apiKey ? (
              <div className="ai-no-key">
                <div className="ai-no-key-icon">🔑</div>
                <p>API Key galchi dubbachuuf</p>
              </div>
            ) : (
              <>
                <div className="ai-messages">
                  {messages.length === 0 && (
                    <div className="ai-chat-welcome">
                      <div className="ai-chat-welcome-icon">✦</div>
                      <p>Macaafa Qulqulluu waa'ee gaafii kaasi. Afaan Oromoodhaan deebii si kenna!</p>
                      <div className="ai-suggested-questions">
                        {[
                          'Yohaannis 3:16 maali?',
                          'Nageenyaan jiraachuuf maal godhuu qaba?',
                          'Faaruu 23 ibsi',
                          'Amantiin maal jechuudha?',
                        ].map(q => (
                          <button key={q} className="ai-suggestion-btn" onClick={() => { setInput(q); inputRef.current?.focus(); }}>
                            {q}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {messages.map((msg, i) => (
                    <div key={i} className={`ai-message ${msg.role}`}>
                      {msg.role === 'ai' && (
                        <div className="ai-message-logo">✦</div>
                      )}
                      <div className="ai-message-bubble">
                        {msg.role === 'ai' ? renderAIText(msg.content) : msg.content}
                      </div>
                    </div>
                  ))}

                  {isStreaming && activeTab === 'chat' && (
                    <div className="ai-message ai">
                      <div className="ai-message-logo">✦</div>
                      <div className="ai-message-bubble">
                        {renderAIText(streamingText)}
                        <span className="ai-cursor" />
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>

                <div className="ai-chat-input-area">
                  {messages.length > 0 && (
                    <button className="ai-clear-btn" onClick={() => setMessages([])}>🗑 Haquu</button>
                  )}
                  <div className="ai-input-row">
                    <input
                      ref={inputRef}
                      type="text"
                      className="ai-chat-input"
                      placeholder="Gaafii kaasi... (Afaan Oromoo)"
                      value={input}
                      onChange={e => setInput(e.target.value)}
                      onKeyDown={handleKeyDown}
                      disabled={isStreaming}
                    />
                    <button
                      className={`ai-send-btn ${isStreaming ? 'loading' : ''}`}
                      onClick={isStreaming ? () => abortRef.current?.abort() : handleSendMessage}
                      disabled={!input.trim() && !isStreaming}
                    >
                      {isStreaming ? '■' : '▶'}
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* REFS / LINKERS TAB */}
        {activeTab === 'refs' && (
          <div className="ai-refs-tab">
            <div className="ai-refs-header">
              <span>🔗 Linkers AI Argame</span>
              <span className="ai-refs-count">{aiCrossRefs.length} argame</span>
            </div>
            {aiCrossRefs.length === 0 ? (
              <div className="ai-no-refs">
                <div className="ai-no-refs-icon">🔗</div>
                <p>AI ibsa ykn gaafii kaasii — linkeroonni aayaa walqabatoo argama</p>
              </div>
            ) : (
              <div className="ai-refs-list">
                {aiCrossRefs.map((ref, i) => (
                  <div
                    key={i}
                    className="ai-ref-item"
                    onClick={() => handleCrossRefClick(ref)}
                  >
                    <div className="ai-ref-icon">📖</div>
                    <div className="ai-ref-content">
                      <div className="ai-ref-name">{ref.displayText}</div>
                      <div className="ai-ref-hint">Cuqaasi banu →</div>
                    </div>
                    <div className="ai-ref-arrow">↗</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
