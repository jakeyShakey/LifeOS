import { useState } from 'react';
import { ArrowLeft, Plus, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DocumentUploader } from '@/components/brain/DocumentUploader';
import { DocumentsList } from '@/components/brain/DocumentsList';
import { DocumentDetail } from '@/components/brain/DocumentDetail';
import { AreasSidebar } from '@/components/brain/AreasSidebar';
import { BrainChat } from '@/components/brain/BrainChat';

export function BrainPage() {
  const [selectedDocumentId, setSelectedDocumentId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [uploaderExpanded, setUploaderExpanded] = useState(false);
  const [selectedAreaIds, setSelectedAreaIds] = useState<string[]>([]);

  const handleSelectArea = (areaId: string | null) => {
    if (areaId === null) {
      setSelectedAreaIds([]);
    } else {
      setSelectedAreaIds((prev) =>
        prev.includes(areaId) ? prev.filter((id) => id !== areaId) : [...prev, areaId]
      );
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
        {selectedDocumentId ? (
          <div className="flex flex-col h-full overflow-hidden">
            <div className="px-4 py-2 border-b border-zinc-800/50 shrink-0">
              <button
                onClick={() => setSelectedDocumentId(null)}
                className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
              >
                <ArrowLeft size={13} />
                Back to chat
              </button>
            </div>
            <DocumentDetail
              key={selectedDocumentId}
              documentId={selectedDocumentId}
              onDelete={() => setSelectedDocumentId(null)}
            />
          </div>
        ) : (
          <BrainChat
            selectedAreaIds={selectedAreaIds}
            onSelectDocument={(id) => {
              setSelectedDocumentId(id);
              setUploaderExpanded(false);
            }}
          />
        )}
      </main>
    </div>
  );
}
