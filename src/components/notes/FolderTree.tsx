import { useState } from 'react';
import {
  ChevronRight,
  ChevronDown,
  Folder,
  FolderOpen,
  MoreHorizontal,
  Plus,
  Pencil,
  Trash2,
  FilePlus,
} from 'lucide-react';
import { useDroppable, useDraggable } from '@dnd-kit/core';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
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
import type { FolderNode } from '@/hooks/useFolders';

interface FolderTreeProps {
  nodes: FolderNode[];
  selectedFolderId: string | null;
  onSelectFolder: (id: string | null) => void;
  onCreateFolder: (parentId?: string | null) => void;
  onRenameFolder: (id: string, currentName: string) => void;
  onDeleteFolder: (id: string) => void;
  onCreateNote: (folderId: string | null) => void;
}

interface FolderNodeProps {
  node: FolderNode;
  depth: number;
  selectedFolderId: string | null;
  onSelectFolder: (id: string | null) => void;
  onCreateFolder: (parentId?: string | null) => void;
  onRenameFolder: (id: string, currentName: string) => void;
  onDeleteFolder: (id: string) => void;
  onCreateNote: (folderId: string | null) => void;
}

function FolderNodeItem({
  node,
  depth,
  selectedFolderId,
  onSelectFolder,
  onCreateFolder,
  onRenameFolder,
  onDeleteFolder,
  onCreateNote,
}: FolderNodeProps) {
  const [expanded, setExpanded] = useState(true);
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState(node.name);
  const [folderToDelete, setFolderToDelete] = useState(false);
  const isSelected = selectedFolderId === node.id;
  const hasChildren = node.children.length > 0;

  const { isOver, setNodeRef: setDropRef } = useDroppable({ id: node.id });
  const { attributes, listeners, setNodeRef: setDragRef, isDragging } = useDraggable({
    id: node.id,
    data: { type: 'folder' },
  });

  const setRef = (el: HTMLDivElement | null) => {
    setDropRef(el);
    setDragRef(el);
  };

  const handleRenameSubmit = () => {
    if (renameValue.trim() && renameValue.trim() !== node.name) {
      onRenameFolder(node.id, renameValue.trim());
    }
    setIsRenaming(false);
  };

  return (
    <>
      <ContextMenu>
        <ContextMenuTrigger asChild>
          <div ref={setRef}>
          <div
            {...listeners}
            {...attributes}
            className={cn(
              'group flex items-center gap-1 px-2 py-1 rounded-md cursor-pointer text-sm select-none',
              'hover:bg-zinc-800/60 transition-colors',
              isSelected && 'bg-violet-500/15 text-violet-300',
              !isSelected && 'text-zinc-400',
              isOver && 'ring-2 ring-violet-500/50 ring-inset',
              isDragging && 'opacity-40',
            )}
            style={{ paddingLeft: `${8 + depth * 14}px` }}
            onClick={() => onSelectFolder(node.id)}
          >
            {/* Expand/collapse toggle */}
            <button
              className="shrink-0 text-zinc-600 hover:text-zinc-400 transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                setExpanded((v) => !v);
              }}
            >
              {hasChildren ? (
                expanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />
              ) : (
                <span className="w-[13px] inline-block" />
              )}
            </button>

            {/* Folder icon */}
            <span className="shrink-0">
              {isSelected ? <FolderOpen size={14} /> : <Folder size={14} />}
            </span>

            {/* Name */}
            {isRenaming ? (
              <input
                autoFocus
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                onBlur={handleRenameSubmit}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleRenameSubmit();
                  if (e.key === 'Escape') {
                    setRenameValue(node.name);
                    setIsRenaming(false);
                  }
                  e.stopPropagation();
                }}
                onClick={(e) => e.stopPropagation()}
                className="flex-1 bg-zinc-700 text-zinc-100 text-sm rounded px-1 outline-none min-w-0"
              />
            ) : (
              <span className="flex-1 truncate">{node.name}</span>
            )}

            {/* Hover menu button (keeps discoverability) */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className="shrink-0 opacity-0 group-hover:opacity-100 text-zinc-500 hover:text-zinc-300 transition-all p-0.5 rounded"
                  onClick={(e) => e.stopPropagation()}
                >
                  <MoreHorizontal size={13} />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                <DropdownMenuItem onClick={() => { setRenameValue(node.name); setIsRenaming(true); }}>
                  <Pencil size={13} className="mr-2" />
                  Rename
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onCreateNote(node.id)}>
                  <FilePlus size={13} className="mr-2" />
                  New note here
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onCreateFolder(node.id)}>
                  <Plus size={13} className="mr-2" />
                  Add subfolder
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setFolderToDelete(true)}
                  className="text-red-400 focus:text-red-300"
                >
                  <Trash2 size={13} className="mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          </div>
        </ContextMenuTrigger>

        <ContextMenuContent className="w-48">
          <ContextMenuItem onClick={() => { setRenameValue(node.name); setIsRenaming(true); }}>
            <Pencil size={13} className="mr-2" />
            Rename
          </ContextMenuItem>
          <ContextMenuItem onClick={() => onCreateNote(node.id)}>
            <FilePlus size={13} className="mr-2" />
            New note here
          </ContextMenuItem>
          <ContextMenuItem onClick={() => onCreateFolder(node.id)}>
            <Plus size={13} className="mr-2" />
            New subfolder
          </ContextMenuItem>
          <ContextMenuSeparator />
          <ContextMenuItem
            className="text-red-400 focus:text-red-300"
            onClick={() => setFolderToDelete(true)}
          >
            <Trash2 size={13} className="mr-2" />
            Delete folder
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>

      {/* Children */}
      {hasChildren && expanded && (
        <div>
          {node.children.map((child) => (
            <FolderNodeItem
              key={child.id}
              node={child}
              depth={depth + 1}
              selectedFolderId={selectedFolderId}
              onSelectFolder={onSelectFolder}
              onCreateFolder={onCreateFolder}
              onRenameFolder={onRenameFolder}
              onDeleteFolder={onDeleteFolder}
              onCreateNote={onCreateNote}
            />
          ))}
        </div>
      )}

      <AlertDialog open={folderToDelete} onOpenChange={setFolderToDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete "{node.name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              Notes inside will become unorganised. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => { onDeleteFolder(node.id); setFolderToDelete(false); }}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export function FolderTree({
  nodes,
  selectedFolderId,
  onSelectFolder,
  onCreateFolder,
  onRenameFolder,
  onDeleteFolder,
  onCreateNote,
}: FolderTreeProps) {
  const { isOver: isOverAll, setNodeRef: setAllNotesRef } = useDroppable({ id: '__unfiled__' });

  return (
    <div className="py-1">
      {/* "All Notes" pseudo-folder */}
      <div
        ref={setAllNotesRef}
        className={cn(
          'flex items-center gap-2 px-3 py-1 rounded-md cursor-pointer text-sm select-none transition-colors',
          'hover:bg-zinc-800/60',
          selectedFolderId === null ? 'text-violet-300 bg-violet-500/10' : 'text-zinc-400',
          isOverAll && 'ring-2 ring-violet-500/50 ring-inset',
        )}
        onClick={() => onSelectFolder(null)}
      >
        <FolderOpen size={14} className="shrink-0" />
        <span className="flex-1 truncate">All Notes</span>
      </div>

      {nodes.map((node) => (
        <FolderNodeItem
          key={node.id}
          node={node}
          depth={0}
          selectedFolderId={selectedFolderId}
          onSelectFolder={onSelectFolder}
          onCreateFolder={onCreateFolder}
          onRenameFolder={onRenameFolder}
          onDeleteFolder={onDeleteFolder}
          onCreateNote={onCreateNote}
        />
      ))}

      {/* New top-level folder button */}
      <button
        onClick={() => onCreateFolder(null)}
        className="flex items-center gap-1.5 px-3 py-1 text-xs text-zinc-600 hover:text-zinc-400 transition-colors w-full mt-1"
      >
        <Plus size={12} />
        New folder
      </button>
    </div>
  );
}
