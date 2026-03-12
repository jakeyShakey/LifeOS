import { useState } from 'react';
import { ArrowRight, BookOpen, FileText, Globe, Loader2, Plus, Search, Type } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DocumentUploader } from '@/components/brain/DocumentUploader';
import { DocumentsList } from '@/components/brain/DocumentsList';
import { DocumentDetail } from '@/components/brain/DocumentDetail';
import { AreasSidebar } from '@/components/brain/AreasSidebar';
import { querySecondBrain } from '@/lib/ai';
import { useAuth } from '@/hooks/useAuth';
import type { KnowledgeSource } from '@/types';

const SOURCE_ICONS: Record<string, React.ElementType> = {
  pdf: FileText,
  url: Globe,
  text: Type,
};

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center h-full text-zinc-600 gap-3">
      <BookOpen size={32} className="text-zinc-700" />
      <div className="text-center">
        <p className="text-base font-medium text-zinc-500">Your Second Brain</p>
        <p className="text-sm mt-1">Upload documents, then ask questions about them.</p>
      </div>
    </div>
  );
}

interface RagAnswer {
  answer: string;
  sources: KnowledgeSource[];
}

export function BrainPage() {
  const { user } = useAuth();
  const [selectedDocumentId, setSelectedDocumentId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [uploaderExpanded, setUploaderExpanded] = useState(false);
  const [selectedAreaIds, setSelectedAreaIds] = useState<string[]>([]);

  const [ragQuery, setRagQuery] = useState('');
  const [ragLoading, setRagLoading] = useState(false);
  const [ragResult, setRagResult] = useState<RagAnswer | null>(null);
  const [ragError, setRagError] = useState<string | null>(null);

  const handleSelectArea = (areaId: string | null) => {
    if (areaId === null) {
      setSelectedAreaIds([]);
    } else {
      setSelectedAreaIds((prev) =>
        prev.includes(areaId) ? prev.filter((id) => id !== areaId) : [...prev, areaId]
      );
    }
  };

  const handleAsk = async () => {
    if (!ragQuery.trim() || !user) return;
    setRagLoading(true);
    setRagResult(null);
    setRagError(null);
    try {
      const result = await querySecondBrain(
        user.id,
        ragQuery.trim(),
        selectedAreaIds.length ? selectedAreaIds : undefined
      );
      setRagResult(result);
    } catch (err) {
      setRagError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setRagLoading(false);
    }
  };

  return (
    <div className="flex h-full overflow-hidden">
      {/* Areas sidebar (200px) */}
      <div className="w-[200px] shrink-0">
        <AreasSidebar
          selectedAreaIds={selectedAreaIds}
          onSelectArea={handleSelectArea}
        />
      </div>

      {/* Documents panel (288px) */}
      <aside className="w-72 shrink-0 border-r border-zinc-800 flex flex-col bg-zinc-950 overflow-hidden">
        {/* Header */}
        <div className="px-3 pt-4 pb-2 border-b border-zinc-800/50">
          <Button
            size="sm"
            className="w-full h-8 text-xs bg-violet-600 hover:bg-violet-500 text-white"
            onClick={() => setUploaderExpanded((v) => !v)}
          >
            <Plus size={13} className="mr-1" />
            {uploaderExpanded ? 'Cancel' : 'Add Document'}
          </Button>
        </div>

        {/* Uploader (collapsible) */}
        {uploaderExpanded && (
          <div className="px-3 py-3 border-b border-zinc-800/50">
            <DocumentUploader />
          </div>
        )}

        {/* Search */}
        <div className="px-3 py-2">
          <div className="relative">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-600" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search documents…"
              className="pl-8 h-8 text-xs bg-zinc-900 border-zinc-700 focus:border-violet-500/60"
            />
          </div>
        </div>

        {/* Documents list */}
        <div className="flex-1 overflow-y-auto py-2">
          <DocumentsList
            searchQuery={searchQuery}
            selectedDocumentId={selectedDocumentId}
            selectedAreaIds={selectedAreaIds}
            onSelectDocument={(id) => {
              setSelectedDocumentId(id);
              setUploaderExpanded(false);
            }}
          />
        </div>
      </aside>

      {/* Right panel (flex-1) */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* RAG query bar */}
        <div className="px-6 py-4 border-b border-zinc-800/50 bg-zinc-950/50">
          <div className="flex gap-2">
            <Input
              value={ragQuery}
              onChange={(e) => setRagQuery(e.target.value)}
              placeholder={
                selectedAreaIds.length
                  ? `Ask about ${selectedAreaIds.length} selected area${selectedAreaIds.length > 1 ? 's' : ''}…`
                  : 'Ask a question about your documents…'
              }
              className="flex-1 h-10 text-sm bg-zinc-900 border-zinc-700 focus:border-violet-500/60"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !ragLoading) handleAsk();
              }}
            />
            <Button
              onClick={handleAsk}
              disabled={!ragQuery.trim() || ragLoading}
              className="h-10 px-4 bg-violet-600 hover:bg-violet-500 text-white"
            >
              {ragLoading ? (
                <Loader2 size={15} className="animate-spin" />
              ) : (
                <ArrowRight size={15} />
              )}
            </Button>
          </div>

          {/* Answer */}
          {ragError && (
            <p className="mt-3 text-sm text-red-400">{ragError}</p>
          )}

          {ragResult && (
            <div className="mt-3 space-y-3">
              <p className="text-sm text-zinc-300 leading-relaxed whitespace-pre-wrap">
                {ragResult.answer}
              </p>
              {ragResult.sources.length > 0 && (
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs text-zinc-600">Sources:</span>
                  {ragResult.sources.map((src) => {
                    const Icon = SOURCE_ICONS[src.document_id] ?? FileText;
                    return (
                      <button
                        key={src.document_id}
                        onClick={() => setSelectedDocumentId(src.document_id)}
                        className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-zinc-800 hover:bg-zinc-700 border border-zinc-700/50 text-xs text-zinc-400 hover:text-zinc-300 transition-colors"
                      >
                        <Icon size={10} />
                        {src.title}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Document detail or empty state */}
        <div className="flex-1 overflow-hidden">
          {selectedDocumentId ? (
            <DocumentDetail
              key={selectedDocumentId}
              documentId={selectedDocumentId}
              onDelete={() => setSelectedDocumentId(null)}
            />
          ) : (
            <EmptyState />
          )}
        </div>
      </main>
    </div>
  );
}
