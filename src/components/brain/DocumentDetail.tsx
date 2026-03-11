import { ExternalLink, FileText, Globe, Hash, Layers, Trash2, Type } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Button } from '@/components/ui/button';
import { useDocument, useDeleteDocument } from '@/hooks/useDocuments';

interface DocumentDetailProps {
  documentId: string;
  onDelete: () => void;
}

const SOURCE_ICONS: Record<string, React.ElementType> = {
  pdf: FileText,
  url: Globe,
  text: Type,
};

export function DocumentDetail({ documentId, onDelete }: DocumentDetailProps) {
  const { data, isLoading, isError } = useDocument(documentId);
  const deleteDocument = useDeleteDocument();

  if (isLoading) {
    return (
      <div className="p-6 space-y-4 animate-pulse">
        <div className="h-5 w-1/2 bg-zinc-800 rounded" />
        <div className="h-3 w-1/4 bg-zinc-800 rounded" />
        <div className="space-y-2 mt-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-16 bg-zinc-900 rounded-md" />
          ))}
        </div>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="p-6 text-sm text-zinc-500">Failed to load document details.</div>
    );
  }

  const Icon = SOURCE_ICONS[data.source_type] ?? Type;
  const relTime = data.created_at
    ? formatDistanceToNow(new Date(data.created_at), { addSuffix: true })
    : '';

  const handleDelete = () => {
    if (window.confirm(`Delete "${data.title}"? This cannot be undone.`)) {
      deleteDocument.mutate(documentId, { onSuccess: onDelete });
    }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-zinc-800/50 flex items-start gap-3">
        <Icon size={18} className="text-zinc-500 mt-0.5 shrink-0" />
        <div className="flex-1 min-w-0">
          <h2 className="text-base font-semibold text-zinc-100 truncate">{data.title}</h2>
          <div className="flex items-center gap-3 mt-1 flex-wrap">
            <span className="text-xs text-zinc-500">{relTime}</span>
            <span className="flex items-center gap-1 text-xs text-zinc-500">
              <Layers size={11} />
              {data.chunks.length} chunks
            </span>
            {data.source_type === 'url' && data.url && (
              <a
                href={data.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-xs text-violet-400 hover:text-violet-300"
              >
                <ExternalLink size={11} />
                Source
              </a>
            )}
          </div>
        </div>
        <Button
          size="sm"
          variant="ghost"
          onClick={handleDelete}
          disabled={deleteDocument.isPending}
          className="text-zinc-500 hover:text-red-400 hover:bg-red-400/10 shrink-0"
        >
          <Trash2 size={14} />
        </Button>
      </div>

      {/* Chunks */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-2">
        <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-3">
          Document chunks
        </p>
        {data.chunks.map((chunk) => (
          <div
            key={chunk.id}
            className="p-3 rounded-md bg-zinc-900/50 border border-zinc-800/50"
          >
            <div className="flex items-center gap-1.5 mb-1.5">
              <Hash size={10} className="text-zinc-600" />
              <span className="text-xs text-zinc-600">{chunk.chunk_index}</span>
            </div>
            <p className="text-xs text-zinc-400 leading-relaxed">
              {chunk.content.slice(0, 200)}
              {chunk.content.length > 200 && (
                <span className="text-zinc-600">…</span>
              )}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
