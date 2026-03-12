import { useState } from 'react';
import { Plus, Check, Pencil, Trash2, Layers } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useBrainAreas, useCreateArea, useUpdateArea, useDeleteArea } from '@/hooks/useBrainAreas';
import { useDocumentsWithAreas } from '@/hooks/useDocuments';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
} from '@/components/ui/context-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import type { BrainArea } from '@/types';

interface AreasSidebarProps {
  selectedAreaIds: string[];
  onSelectArea: (areaId: string | null) => void;
}

const DEFAULT_COLOR = '#8b5cf6';

function AreaRow({
  area,
  isSelected,
  docCount,
  onSelect,
  onRename,
  onColorChange,
  onDelete,
}: {
  area: BrainArea;
  isSelected: boolean;
  docCount: number;
  onSelect: () => void;
  onRename: (name: string) => void;
  onColorChange: (color: string) => void;
  onDelete: () => void;
}) {
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState(area.name);
  const [showDeleteAlert, setShowDeleteAlert] = useState(false);

  const handleRenameSubmit = () => {
    if (renameValue.trim() && renameValue.trim() !== area.name) {
      onRename(renameValue.trim());
    }
    setIsRenaming(false);
  };

  return (
    <>
      <ContextMenu>
        <ContextMenuContent className="w-44">
          <ContextMenuItem onClick={() => { setRenameValue(area.name); setIsRenaming(true); }}>
            <Pencil size={13} className="mr-2" />
            Rename
          </ContextMenuItem>
          <ContextMenuItem asChild>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="color"
                value={area.color ?? DEFAULT_COLOR}
                className="sr-only"
                onChange={(e) => onColorChange(e.target.value)}
              />
              <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: area.color ?? DEFAULT_COLOR }} />
              Change color
            </label>
          </ContextMenuItem>
          <ContextMenuSeparator />
          <ContextMenuItem
            className="text-red-400 focus:text-red-300"
            onClick={() => setShowDeleteAlert(true)}
          >
            <Trash2 size={13} className="mr-2" />
            Delete area
          </ContextMenuItem>
        </ContextMenuContent>

        <div
          onClick={onSelect}
          className={cn(
            'group flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer text-sm transition-colors select-none',
            isSelected ? 'bg-violet-500/15 text-zinc-200' : 'text-zinc-400 hover:bg-zinc-800/60',
          )}
        >
          {/* Color dot */}
          <span
            className="w-2 h-2 rounded-full shrink-0"
            style={{ backgroundColor: area.color ?? DEFAULT_COLOR }}
          />

          {/* Name */}
          {isRenaming ? (
            <input
              autoFocus
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              onBlur={handleRenameSubmit}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleRenameSubmit();
                if (e.key === 'Escape') { setRenameValue(area.name); setIsRenaming(false); }
                e.stopPropagation();
              }}
              onClick={(e) => e.stopPropagation()}
              className="flex-1 bg-zinc-700 text-zinc-100 text-xs rounded px-1 outline-none min-w-0"
            />
          ) : (
            <span className="flex-1 truncate text-xs">{area.name}</span>
          )}

          {/* Doc count */}
          <span className="text-xs text-zinc-600 shrink-0">{docCount}</span>
        </div>
      </ContextMenu>

      <AlertDialog open={showDeleteAlert} onOpenChange={setShowDeleteAlert}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete "{area.name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              The area will be removed from all documents. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => { onDelete(); setShowDeleteAlert(false); }}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export function AreasSidebar({ selectedAreaIds, onSelectArea }: AreasSidebarProps) {
  const { data: areas } = useBrainAreas();
  const { data: allDocs } = useDocumentsWithAreas();
  const createArea = useCreateArea();
  const updateArea = useUpdateArea();
  const deleteArea = useDeleteArea();

  const [showNewForm, setShowNewForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState(DEFAULT_COLOR);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    await createArea.mutateAsync({ name: newName.trim(), color: newColor });
    setNewName('');
    setNewColor(DEFAULT_COLOR);
    setShowNewForm(false);
  };

  const getDocCount = (areaId: string) =>
    (allDocs ?? []).filter((d) => d.areas.some((a) => a.id === areaId)).length;

  const allSelected = selectedAreaIds.length === 0;

  return (
    <div className="flex flex-col h-full border-r border-zinc-800 bg-zinc-950 overflow-hidden">
      {/* Header */}
      <div className="px-3 pt-4 pb-2 border-b border-zinc-800/50">
        <div className="flex items-center gap-1.5 text-xs font-medium text-zinc-500 uppercase tracking-wider">
          <Layers size={11} />
          Areas
        </div>
      </div>

      <div className="flex-1 overflow-y-auto py-2 px-2 space-y-0.5">
        {/* All Areas row */}
        <div
          onClick={() => onSelectArea(null)}
          className={cn(
            'flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer text-xs transition-colors select-none',
            allSelected ? 'bg-violet-500/15 text-zinc-200' : 'text-zinc-400 hover:bg-zinc-800/60',
          )}
        >
          {allSelected && <Check size={11} className="shrink-0 text-violet-400" />}
          {!allSelected && <span className="w-[11px]" />}
          <span className="flex-1">All Areas</span>
          <span className="text-zinc-600">{(allDocs ?? []).length}</span>
        </div>

        {/* Area rows */}
        {(areas ?? []).map((area) => (
          <AreaRow
            key={area.id}
            area={area}
            isSelected={selectedAreaIds.includes(area.id)}
            docCount={getDocCount(area.id)}
            onSelect={() => onSelectArea(area.id)}
            onRename={(name) => updateArea.mutate({ id: area.id, name })}
            onColorChange={(color) => updateArea.mutate({ id: area.id, color })}
            onDelete={() => deleteArea.mutate(area.id)}
          />
        ))}
      </div>

      {/* New area form */}
      <div className="border-t border-zinc-800/50 px-2 py-2">
        {showNewForm ? (
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5">
              <input
                type="color"
                value={newColor}
                onChange={(e) => setNewColor(e.target.value)}
                className="w-5 h-5 rounded cursor-pointer border-0 bg-transparent p-0"
              />
              <input
                autoFocus
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleCreate();
                  if (e.key === 'Escape') { setShowNewForm(false); setNewName(''); }
                }}
                placeholder="Area name…"
                className="flex-1 text-xs bg-zinc-800 text-zinc-200 rounded px-2 py-1 outline-none placeholder:text-zinc-600"
              />
            </div>
            <div className="flex gap-1">
              <button
                onClick={handleCreate}
                disabled={!newName.trim() || createArea.isPending}
                className="flex-1 text-xs py-1 rounded bg-violet-600 hover:bg-violet-500 text-white disabled:opacity-50 transition-colors"
              >
                Create
              </button>
              <button
                onClick={() => { setShowNewForm(false); setNewName(''); }}
                className="text-xs px-2 py-1 rounded text-zinc-500 hover:text-zinc-300 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowNewForm(true)}
            className="flex items-center gap-1.5 text-xs text-zinc-600 hover:text-zinc-400 transition-colors w-full py-1"
          >
            <Plus size={12} />
            New Area
          </button>
        )}
      </div>
    </div>
  );
}
