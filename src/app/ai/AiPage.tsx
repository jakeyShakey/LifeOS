import { useEffect, useRef, useState } from 'react';
import { Bot, Plus, Trash2, Send, MessageSquare } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { Button } from '@/components/ui/button';
import { useConversations, useConversation } from '@/hooks/useConversations';
import type { AiConversation, AiMessage } from '@/types';

// ---- Sub-components ----

function ThinkingBubble() {
  return (
    <div className="flex items-start gap-3">
      <div className="w-7 h-7 rounded-full bg-violet-900/50 border border-violet-700/50 flex items-center justify-center shrink-0">
        <Bot size={13} className="text-violet-400" />
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

interface ToolChip {
  toolName: string;
  summary: string;
}

function ToolChips({ chips }: { chips: ToolChip[] }) {
  if (chips.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1 mt-1.5">
      {chips.map((chip, i) => (
        <span
          key={i}
          className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] bg-violet-900/30 border border-violet-800/40 text-violet-400"
        >
          <Bot size={9} />
          {chip.summary}
        </span>
      ))}
    </div>
  );
}

function MessageBubble({ message }: { message: AiMessage }) {
  const isUser = message.role === 'user';
  const toolCalls = Array.isArray(message.tool_calls)
    ? (message.tool_calls as unknown as ToolChip[])
    : [];

  if (isUser) {
    return (
      <div className="flex justify-end">
        <div className="max-w-[75%] px-3 py-2 rounded-xl bg-violet-600/20 border border-violet-700/30 text-sm text-zinc-200 leading-relaxed whitespace-pre-wrap">
          {message.content}
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-3">
      <div className="w-7 h-7 rounded-full bg-violet-900/50 border border-violet-700/50 flex items-center justify-center shrink-0 mt-0.5">
        <Bot size={13} className="text-violet-400" />
      </div>
      <div className="flex-1 min-w-0">
        {message.content ? (
          <div className="prose prose-invert prose-sm max-w-none prose-p:leading-relaxed prose-p:my-1 prose-li:my-0 prose-headings:text-zinc-200 prose-a:text-violet-400 prose-code:text-violet-300 prose-code:bg-zinc-800 prose-code:px-1 prose-code:rounded prose-pre:bg-zinc-900 prose-pre:border prose-pre:border-zinc-700">
            <ReactMarkdown>{message.content}</ReactMarkdown>
          </div>
        ) : (
          <span className="text-zinc-600 italic text-sm">Processing...</span>
        )}
        <ToolChips chips={toolCalls} />
      </div>
    </div>
  );
}

function EmptyChatState() {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center px-8 gap-4">
      <div className="w-12 h-12 rounded-2xl bg-violet-900/30 border border-violet-800/40 flex items-center justify-center">
        <Bot size={22} className="text-violet-400" />
      </div>
      <div>
        <p className="text-sm font-medium text-zinc-400">Chat with your AI Agent</p>
        <p className="text-xs text-zinc-600 mt-1 leading-relaxed max-w-[280px]">
          Ask me to manage your notes, calendar, reminders, or search your Second Brain. I can read and write everything.
        </p>
      </div>
      <div className="flex flex-col gap-1.5 text-left w-full max-w-[260px]">
        {[
          'What notes do I have about React?',
          "What's on my calendar tomorrow?",
          'Remind me to call the dentist at 9am',
          'Search my brain for machine learning',
        ].map((suggestion) => (
          <div
            key={suggestion}
            className="px-3 py-2 rounded-lg bg-zinc-800/50 border border-zinc-700/40 text-xs text-zinc-500"
          >
            {suggestion}
          </div>
        ))}
      </div>
    </div>
  );
}

function NoConversationSelected() {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center px-8 gap-3">
      <MessageSquare size={32} className="text-zinc-700" />
      <p className="text-sm text-zinc-500">Select a conversation or create a new one</p>
    </div>
  );
}

// ---- Chat area ----

function ChatArea({ conversationId }: { conversationId: string }) {
  const { messages, isLoading: messagesLoading, sendMessage } = useConversation(conversationId);
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [optimisticUserMessage, setOptimisticUserMessage] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isSending, optimisticUserMessage]);

  async function handleSend() {
    const text = input.trim();
    if (!text || isSending) return;

    setInput('');
    setOptimisticUserMessage(text);
    setIsSending(true);
    try {
      await sendMessage(text);
    } finally {
      setIsSending(false);
      setOptimisticUserMessage(null);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  }

  if (messagesLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-5 h-5 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
        {messages.length === 0 && !isSending && !optimisticUserMessage ? (
          <EmptyChatState />
        ) : (
          <>
            {messages.map((msg) => (
              <MessageBubble key={msg.id} message={msg} />
            ))}
            {optimisticUserMessage && (
              <div className="flex justify-end">
                <div className="max-w-[75%] px-3 py-2 rounded-xl bg-violet-600/20 border border-violet-700/30 text-sm text-zinc-200 leading-relaxed whitespace-pre-wrap">
                  {optimisticUserMessage}
                </div>
              </div>
            )}
            {isSending && <ThinkingBubble />}
          </>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="shrink-0 px-4 pb-4 pt-2 border-t border-zinc-800/50">
        <div className="flex gap-2 items-end">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isSending}
            placeholder="Ask me anything... (Enter to send, Shift+Enter for newline)"
            rows={1}
            className="flex-1 resize-none bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-violet-500 focus:border-violet-500 disabled:opacity-50 leading-relaxed"
            style={{ minHeight: '44px', maxHeight: '120px' }}
            onInput={(e) => {
              const el = e.currentTarget;
              el.style.height = 'auto';
              el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
            }}
          />
          <Button
            onClick={() => void handleSend()}
            disabled={!input.trim() || isSending}
            size="sm"
            className="h-11 w-11 p-0 bg-violet-600 hover:bg-violet-500 text-white shrink-0"
          >
            <Send size={14} />
          </Button>
        </div>
      </div>
    </div>
  );
}

// ---- Conversation list ----

function ConversationList({
  conversations,
  selectedId,
  onSelect,
  onDelete,
  onCreate,
}: {
  conversations: AiConversation[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onCreate: () => void;
}) {
  function formatDate(dateStr: string | null): string {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  return (
    <div className="flex flex-col h-full">
      <div className="px-3 py-3 border-b border-zinc-800/50">
        <Button
          onClick={onCreate}
          size="sm"
          className="w-full bg-violet-600 hover:bg-violet-500 text-white gap-2 h-8 text-xs"
        >
          <Plus size={12} />
          New conversation
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto py-1">
        {conversations.length === 0 ? (
          <p className="text-xs text-zinc-600 text-center py-8 px-3">No conversations yet</p>
        ) : (
          conversations.map((conv) => (
            <div
              key={conv.id}
              className={[
                'group flex items-center gap-2 px-3 py-2 cursor-pointer transition-colors',
                selectedId === conv.id
                  ? 'bg-violet-950/30 border-l-2 border-violet-500 pl-[10px]'
                  : 'hover:bg-zinc-800/50',
              ].join(' ')}
              onClick={() => onSelect(conv.id)}
            >
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-zinc-300 truncate">{conv.title}</p>
                <p className="text-[10px] text-zinc-600">{formatDate(conv.updated_at)}</p>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(conv.id);
                }}
                className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-zinc-700/50 transition-all"
              >
                <Trash2 size={11} className="text-zinc-500 hover:text-red-400" />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// ---- Main page ----

export default function AiPage() {
  const { conversations, isLoading, createConversation, deleteConversation } = useConversations();
  const [selectedConvId, setSelectedConvId] = useState<string | null>(null);

  // Auto-select first conversation on load
  useEffect(() => {
    if (!isLoading && conversations.length > 0 && !selectedConvId) {
      setSelectedConvId(conversations[0].id);
    }
  }, [isLoading, conversations, selectedConvId]);

  async function handleCreate() {
    const conv = await createConversation();
    setSelectedConvId(conv.id);
  }

  async function handleDelete(id: string) {
    await deleteConversation(id);
    if (selectedConvId === id) {
      const remaining = conversations.filter((c) => c.id !== id);
      setSelectedConvId(remaining.length > 0 ? remaining[0].id : null);
    }
  }

  return (
    <div className="flex h-full">
      {/* Sidebar */}
      <div className="w-64 h-full border-r border-zinc-800/50 bg-zinc-900/50 shrink-0 flex flex-col">
        <div className="px-4 py-3 border-b border-zinc-800/50 shrink-0">
          <div className="flex items-center gap-2">
            <Bot size={15} className="text-violet-400" />
            <span className="text-sm font-semibold text-zinc-200">AI Agent</span>
          </div>
        </div>
        <div className="flex-1 overflow-hidden">
          <ConversationList
            conversations={conversations}
            selectedId={selectedConvId}
            onSelect={setSelectedConvId}
            onDelete={(id) => void handleDelete(id)}
            onCreate={() => void handleCreate()}
          />
        </div>
      </div>

      {/* Main area */}
      <div className="flex-1 min-w-0 h-full">
        {selectedConvId ? (
          <ChatArea key={selectedConvId} conversationId={selectedConvId} />
        ) : (
          <NoConversationSelected />
        )}
      </div>
    </div>
  );
}
