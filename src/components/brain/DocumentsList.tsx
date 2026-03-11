import { useMemo } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { FileText, Globe, Type } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useDocuments } from '@/hooks/useDocuments';
import type { Document } from '@/types';

interface DocumentsListProps {
  searchQuery: string;
  selectedDocumentId: string | null;
  onSelectDocument: (id: string) => void;
}

const SOURCE_CONFIG: Record<string, { icon: React.ElementType; color: string; label: string }> = {
  pdf: { icon: FileText, color: 'bg-violet-500/20 text-violet-400', label: 'PDF' },
  url: { icon: Globe, color: 'bg-blue-500/20 text-blue-400', label: 'URL' },
  text: { icon: Type, color: 'bg-zinc-700 text-zinc-400', label: 'Text' },
};

function DocumentCard({
  doc,
  isSelected,
  onClick,
}: {
  doc: Document;
  isSelected: boolean;
  onClick: () => void;
}) {
  const config = SOURCE_CONFIG[doc.source_type] ?? SOURCE_CONFIG.text;
  const Icon = config.icon;
  const relTime = doc.created_at
    ? formatDistanceToNow(new Date(doc.created_at), { addSuffix: true })
    : '';

  return (
    <div
      onClick={onClick}
      className={cn(
        'px-3 py-2.5 rounded-md cursor-pointer border transition-colors select-none',
        isSelected
          ? 'bg-violet-500/10 border-violet-500/30 text-zinc-100'
          : 'bg-zinc-900/50 border-zinc-800/50 hover:bg-zinc-800/60 hover:border-zinc-700/50 text-zinc-300',
      )}
    >
      <div className="flex items-center gap-2">
        <Icon size={13} className="shrink-0 text-zinc-500" />
        <p className="text-sm font-medium truncate flex-1">{doc.title}</p>
        <span className={cn('text-xs px-1.5 py-0.5 rounded-full shrink-0', config.color)}>
          {config.label}
        </span>
      </div>
      <p className="text-xs text-zinc-600 mt-1 ml-5">{relTime}</p>
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="px-3 py-2.5 rounded-md border border-zinc-800/50 bg-zinc-900/50 animate-pulse">
      <div className="flex items-center gap-2">
        <div className="h-3 w-3 bg-zinc-700 rounded" />
        <div className="h-3.5 w-3/4 bg-zinc-700 rounded" />
      </div>
      <div className="h-3 w-1/3 bg-zinc-800 rounded mt-2 ml-5" />
    </div>
  );
}

export function DocumentsList({
  searchQuery,
  selectedDocumentId,
  onSelectDocument,
}: DocumentsListProps) {
  const { data: documents, isLoading, isError, refetch } = useDocuments();

  const filtered = useMemo(() => {
    if (!documents) return [];
    if (!searchQuery.trim()) return documents;
    const q = searchQuery.toLowerCase();
    return documents.filter((d) => d.title.toLowerCase().includes(q));
  }, [documents, searchQuery]);

  if (isLoading) {
    return (
      <div className="flex flex-col gap-2 px-2">
        {[...Array(3)].map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <div className="px-3 text-sm text-zinc-500">
        Failed to load.{' '}
        <button
          onClick={() => refetch()}
          className="text-violet-400 hover:text-violet-300 underline"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!filtered.length) {
    return (
      <div className="px-3 py-4 text-sm text-zinc-600 italic">
        {searchQuery ? 'No matching documents.' : 'No documents yet.'}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1.5 px-2">
      {filtered.map((doc) => (
        <DocumentCard
          key={doc.id}
          doc={doc}
          isSelected={selectedDocumentId === doc.id}
          onClick={() => onSelectDocument(doc.id)}
        />
      ))}
    </div>
  );
}
