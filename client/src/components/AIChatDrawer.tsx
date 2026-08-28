import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import {
  Sparkles,
  X,
  Send,
  Trash2,
  Bot,
  User,
  Building,
  ArrowRight,
  Loader2,
  HelpCircle,
  FileCheck2,
  MessageSquarePlus
} from 'lucide-react';
import { api } from '../api';
import { ChatMessage, Notice } from '../types';

interface AIChatDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  currentNotice: Notice | null;
  onApplyFilters?: (filters: any) => void;
  onOpenNoticeDetail?: (notice: Notice) => void;
}

export const AIChatDrawer: React.FC<AIChatDrawerProps> = ({
  isOpen,
  onClose,
  currentNotice,
  onApplyFilters,
  onOpenNoticeDetail
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const quickPrompts = currentNotice
    ? [
        `Vilka är de viktigaste kraven i "${currentNotice.title.slice(0, 35)}..."?`,
        'Ge 3 skarpa frågor vi bör ställa till upphandlaren under frågestunden.',
        'Hur bör vi strukturera vårt anbud för att vinna denna upphandling?'
      ]
    : [
        'Hitta upphandlingar för BIM-samordning och digital informationshantering i Sverige.',
        'Vilka krav ställs vanligtvis på BIM- och VDC-konsulter i offentliga upphandlingar?',
        'Skapa en bevakningsprofil för BIM, digitala tvillingar och projekteringsstöd.'
      ];

  useEffect(() => {
    if (isOpen) {
      loadHistory();
    }
  }, [isOpen]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const loadHistory = async () => {
    try {
      const res = await api.getChatHistory();
      if (res.success && res.messages) {
        setMessages(res.messages);
      }
    } catch (e) {
      console.error('Failed to load chat history:', e);
    }
  };

  const handleSend = async (textToSend?: string) => {
    const text = textToSend || input;
    if (!text.trim() || loading) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: text,
      context_notice_id: currentNotice?.id
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const res = await api.sendChatMessage(text, {
        currentNotice,
      });

      if (res.success && res.reply) {
        const assistantMsg: ChatMessage = {
          id: res.messageId || (Date.now() + 1).toString(),
          role: 'assistant',
          content: res.reply,
          context_notice_id: currentNotice?.id
        };
        setMessages(prev => [...prev, assistantMsg]);
      }
    } catch (err: any) {
      const errorMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `⚠️ Ett fel uppstod vid anslutning till MiniMax: ${err.message || 'Kunde inte generera svar.'}`
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  const handleClear = async () => {
    if (confirm('Vill du rensa chatthistoriken?')) {
      await api.clearChatHistory();
      setMessages([]);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden flex justify-end">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Drawer Panel */}
      <div className="relative w-full max-w-xl bg-white dark:bg-slate-900 shadow-2xl flex flex-col h-full border-l border-slate-200 dark:border-slate-800 z-10 transition-all">
        {/* Header */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-slate-850 dark:to-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-purple-500/20">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-slate-900 dark:text-white">MiniMax AI Copilot</h3>
                <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                  MiniMax-M3
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">Anbudsrådgivning & TED-analys</p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {messages.length > 0 && (
              <button
                onClick={handleClear}
                className="p-2 text-slate-400 hover:text-red-600 dark:hover:text-red-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                title="Rensa konversation"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Active Context Banner */}
        {currentNotice && (
          <div className="px-4 py-2.5 bg-blue-50 dark:bg-blue-950/40 border-b border-blue-100 dark:border-blue-900/50 flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 text-blue-900 dark:text-blue-200 truncate">
              <Building className="w-3.5 h-3.5 flex-shrink-0 text-blue-600 dark:text-blue-400" />
              <span className="font-semibold flex-shrink-0">I fokus:</span>
              <span className="truncate">{currentNotice.title}</span>
            </div>
            {onOpenNoticeDetail && (
              <button
                onClick={() => onOpenNoticeDetail(currentNotice)}
                className="text-blue-700 dark:text-blue-300 hover:underline font-medium flex-shrink-0 flex items-center gap-1"
              >
                Visa detaljer <ArrowRight className="w-3 h-3" />
              </button>
            )}
          </div>
        )}

        {/* Message Container */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-purple-100 dark:bg-purple-950/60 flex items-center justify-center text-purple-600 dark:text-purple-400">
                <Bot className="w-8 h-8" />
              </div>
              <div className="max-w-sm space-y-1">
                <h4 className="font-bold text-slate-900 dark:text-white">Hur kan jag hjälpa dig idag?</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Jag är kopplad till MiniMax-M3 och är expert på TED-upphandlingar, LOU och anbudsstrategier. Jag gissar aldrig – om uppgifter saknas i kungörelsen hänvisar jag till förfrågningsunderlaget i upphandlingsportalen.
                </p>
              </div>

              {/* Quick Prompt Cards */}
              <div className="w-full space-y-2 pt-2">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Förslag på frågor</p>
                {quickPrompts.map((prompt, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSend(prompt)}
                    className="w-full text-left p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-purple-300 dark:hover:border-purple-700 bg-slate-50/70 dark:bg-slate-850 hover:bg-purple-50/50 dark:hover:bg-purple-950/30 text-xs text-slate-700 dark:text-slate-300 transition-all flex items-center justify-between group"
                  >
                    <span className="truncate pr-2">{prompt}</span>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-purple-600 dark:group-hover:text-purple-400 flex-shrink-0" />
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <>
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {msg.role === 'assistant' && (
                    <div className="w-8 h-8 rounded-lg bg-purple-600 flex items-center justify-center text-white flex-shrink-0 mt-0.5">
                      <Sparkles className="w-4 h-4" />
                    </div>
                  )}

                  <div
                    className={`max-w-[85%] rounded-2xl p-3.5 text-sm leading-relaxed ${
                      msg.role === 'user'
                        ? 'bg-ted-600 text-white rounded-tr-none'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-tl-none prose dark:prose-invert prose-sm max-w-none'
                    }`}
                  >
                    {msg.role === 'user' ? (
                      <p className="whitespace-pre-wrap">{msg.content}</p>
                    ) : (
                      <ReactMarkdown
                        components={{
                          h1: ({node, ...props}) => <h1 className="text-base font-bold my-2 text-slate-900 dark:text-white" {...props} />,
                          h2: ({node, ...props}) => <h2 className="text-sm font-bold my-2 text-slate-900 dark:text-white" {...props} />,
                          h3: ({node, ...props}) => <h3 className="text-xs font-bold my-1 text-purple-600 dark:text-purple-400" {...props} />,
                          p: ({node, ...props}) => <p className="mb-2 last:mb-0 text-slate-800 dark:text-slate-200" {...props} />,
                          ul: ({node, ...props}) => <ul className="list-disc pl-4 space-y-1 mb-2" {...props} />,
                          ol: ({node, ...props}) => <ol className="list-decimal pl-4 space-y-1 mb-2" {...props} />,
                          li: ({node, ...props}) => <li className="text-xs" {...props} />,
                          strong: ({node, ...props}) => <strong className="font-semibold text-purple-700 dark:text-purple-300" {...props} />,
                          code: ({node, inline, ...props}: any) =>
                            inline ? (
                              <code className="px-1 py-0.5 bg-slate-200 dark:bg-slate-700 rounded text-xs" {...props} />
                            ) : (
                              <pre className="bg-slate-950 text-slate-200 p-2.5 rounded-lg text-xs overflow-x-auto my-2" {...props} />
                            )
                        }}
                      >
                        {msg.content}
                      </ReactMarkdown>
                    )}
                  </div>

                  {msg.role === 'user' && (
                    <div className="w-8 h-8 rounded-lg bg-slate-300 dark:bg-slate-700 flex items-center justify-center text-slate-700 dark:text-slate-300 flex-shrink-0 mt-0.5">
                      <User className="w-4 h-4" />
                    </div>
                  )}
                </div>
              ))}

              {loading && (
                <div className="flex gap-3 justify-start items-center">
                  <div className="w-8 h-8 rounded-lg bg-purple-600 flex items-center justify-center text-white flex-shrink-0 animate-pulse">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div className="bg-slate-100 dark:bg-slate-800 rounded-2xl rounded-tl-none p-3 text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-purple-600" />
                    <span>MiniMax tänker och formulerar svar...</span>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {/* Input Bar */}
        <div className="p-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={currentNotice ? `Ställ en fråga om ${currentNotice.title.slice(0, 20)}...` : 'Ställ en fråga om upphandlingar eller sökning...'}
              className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
              disabled={loading}
            />
            <button
              type="submit"
              disabled={!input.trim() || loading}
              className="p-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white shadow-md shadow-purple-500/20 transition-all"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
          <div className="flex items-center justify-between mt-2 px-1 text-[11px] text-slate-400">
            <span>Tryck Enter för att skicka</span>
            <span>Drivs av MiniMax-M3</span>
          </div>
        </div>
      </div>
    </div>
  );
};
