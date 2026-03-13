import { useEffect, useMemo, useRef, useState } from 'react';
import { Layers, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AreaMentionInput } from './AreaMentionInput';
import { useBrainAreas } from '@/hooks/useBrainAreas';
import { useDocumentsWithAreas } from '@/hooks/useDocuments';
import { useAuth } from '@/hooks/useAuth';
import { querySecondBrain } from '@/lib/ai';

interface ChatSource {
  document_id: string;
  title: string;
  areaNames: string[];
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  sources?: ChatSource[];
  timestamp: Date;
}

interface BrainChatProps {
  selectedAreaIds: string[];
  onSelectDocument: (id: string) => void;
}

// ---- Sub-components ----

function ThinkingBubble() {
  return (
    <div className="flex items-start gap-3">
      <div className="w-7 h-7 rounded-full bg-violet-900/50 border border-violet-700/50 flex items-center justify-center shrink-0">
        <Layers size={13} className="text-violet-400" />
      </div>
      <div className="flex items-center gap-1 px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="w-1.5 h-1.5 rounded-full bg-violet-500 animate-pulse"
            style={{ animationDelay: `${i * 200}ms` }}
          />
        ))}
      </div>
    </div>
  );
}

function EmptyChat() {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center px-8 gap-4">
      <div className="w-12 h-12 rounded-2xl bg-violet-900/30 border border-violet-800/40 flex items-center justify-center">
        <Layers size={22} className="text-violet-400" />
      </div>
      <div>
        <p className="text-sm font-medium text-zinc-400">Chat with your Second Brain</p>
        <p className="text-xs text-zinc-600 mt-1 leading-relaxed max-w-[260px]">
          Ask questions about your documents. Type <kbd className="px-1 py-0.5 rounded bg-zinc-800 text-zinc-400 font-mono text-[10px]">@</kbd> to scope your question to specific areas.
        </p>
      </div>
    </div>
  );
}

function SourcesSection({
  sources,
  onSelectDocument,
}: {
  sources: ChatSource[];
  onSelectDocument: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);

  if (sources.length === 0) return null;

  return (
    <div className="mt-2">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1 text-xs text-zinc-600 hover:text-zinc-400 transition-colors"
      >
        {open ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
        {sources.length} source{sources.length !== 1 ? 's' : ''}
      </button>
      {open && (
        <div className="mt-1.5 flex flex-col gap-1">
          {sources.map((src) => (
            <button
              key={src.document_id}
              onClick={() => onSelectDocument(src.document_id)}
              className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-zinc-800/60 hover:bg-zinc-800 border border-zinc-700/40 text-left transition-colors group"
            >
              <Layers size={11} className="text-zinc-600 group-hover:text-violet-400 shrink-0" />
              <span className="text-xs text-zinc-400 group-hover:text-zinc-300 truncate">
                {src.title}
              </span>
              {src.areaNames.length > 0 && (
                <div className="flex gap-1 ml-auto shrink-0">
                  {src.areaNames.slice(0, 2).map((name) => (
                    <span
                      key={name}
                      className="text-[10px] px-1.5 py-0.5 rounded-full bg-violet-900/40 text-violet-400 border border-violet-800/40"
                    >
                      {name}
                    </span>
                  ))}
                </div>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function ChatBubble({
  message,
  onSelectDocument,
}: {
  message: ChatMessage;
  onSelectDocument: (id: string) => void;
}) {
  const isUser = message.role === 'user';

  if (isUser) {
    return (
      <div className="flex justify-end">
        <div className="max-w-[75%] px-3 py-2 rounded-xl bg-violet-600/20 border border-violet-700/30 text-sm text-zinc-200 leading-relaxed">
          {message.content}
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-3">
      <div className="w-7 h-7 rounded-full bg-violet-900/50 border border-violet-700/50 flex items-center justify-center shrink-0 mt-0.5">
        <Layers size={13} className="text-violet-400" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm text-zinc-300 leading-relaxed whitespace-pre-wrap">
          {message.content}
        </div>
        {message.sources && (
          <SourcesSection sources={message.sources} onSelectDocument={onSelectDocument} />
        )}
      </div>
    </div>
  );
}

// ---- Main component ----

export function BrainChat({ selectedAreaIds, onSelectDocument }: BrainChatProps) {
  const { user } = useAuth();
  const { data: areas = [] } = useBrainAreas();
  const { data: allDocsWithAreas = [] } = useDocumentsWithAreas();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [mentionAreaIds, setMentionAreaIds] = useState<string[]>([]);
  const [currentPlainText, setCurrentPlainText] = useState('');
  const [inputKey, setInputKey] = useState(0);
  const bottomRef = useRef<HTMLDivElement>(null);

  const effectiveAreaIds = useMemo(() => {
    const merged = new Set([...selectedAreaIds, ...mentionAreaIds]);
    return merged.size > 0 ? Array.from(merged) : undefined;
  }, [selectedAreaIds, mentionAreaIds]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  async function handleSubmit() {
    const text = currentPlainText.trim();
    if (!text || isLoading || !user) return;

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: text,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputKey((k) => k + 1);
    setMentionAreaIds([]);
    setCurrentPlainText('');
    setIsLoading(true);

    try {
      const result = await querySecondBrain(user.id, text, effectiveAreaIds);

      // Enrich sources with area names
      const enrichedSources: ChatSource[] = result.sources.map((src) => {
        const doc = allDocsWithAreas.find((d) => d.id === src.document_id);
        return {
          document_id: src.document_id,
          title: src.title,
          areaNames: doc?.areas.map((a) => a.name) ?? [],
        };
      });

      const assistantMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: result.answer,
        sources: enrichedSources,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      const errorMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: err instanceof Error ? err.message : 'Something went wrong. Please try again.',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-zinc-800/50 shrink-0">
        <div className="flex items-center gap-2">
          <Layers size={14} className="text-violet-400" />
          <span className="text-sm font-medium text-zinc-300">Brain Chat</span>
          <span className="text-xs text-zinc-600">· answers from your documents</span>
        </div>
        {messages.length > 0 && (
          <button
            onClick={() => setMessages([])}
            className="flex items-center gap-1.5 text-xs text-zinc-600 hover:text-zinc-400 transition-colors"
          >
            <Trash2 size={12} />
            Clear
          </button>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
        {messages.length === 0 && !isLoading ? (
          <EmptyChat />
        ) : (
          <>
            {messages.map((msg) => (
              <ChatBubble
                key={msg.id}
                message={msg}
                onSelectDocument={onSelectDocument}
              />
            ))}
            {isLoading && <ThinkingBubble />}
          </>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input area */}
      <div className="shrink-0 px-4 pb-4 pt-2 border-t border-zinc-800/50">
        {effectiveAreaIds && effectiveAreaIds.length > 0 && (
          <div className="flex items-center gap-1.5 mb-2 flex-wrap">
            <span className="text-xs text-zinc-600">Scoped to:</span>
            {effectiveAreaIds.map((id) => {
              const area = areas.find((a) => a.id === id);
              if (!area) return null;
              return (
                <span
                  key={id}
                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs bg-zinc-800 border border-zinc-700 text-zinc-400"
                >
                  <span
                    className="w-1.5 h-1.5 rounded-full"
                    style={{ backgroundColor: area.color ?? '#6d28d9' }}
                  />
                  {area.name}
                </span>
              );
            })}
          </div>
        )}
        <div className="flex gap-2 items-end">
          <div className="flex-1">
            <AreaMentionInput
              key={inputKey}
              areas={areas}
              disabled={isLoading}
              onChange={({ plainText, selectedAreaIds: pillIds }) => {
                setCurrentPlainText(plainText);
                setMentionAreaIds(pillIds);
              }}
              onSubmit={handleSubmit}
            />
          </div>
          <Button
            onClick={handleSubmit}
            disabled={!currentPlainText.trim() || isLoading}
            size="sm"
            className="h-10 px-3 bg-violet-600 hover:bg-violet-500 text-white shrink-0"
          >
            <Layers size={14} />
          </Button>
        </div>
      </div>
    </div>
  );
}
