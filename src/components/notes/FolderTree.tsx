import { useState } from 'react';
import { ChevronRight, ChevronDown, Folder, FolderOpen, MoreHorizontal, Plus, Pencil, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { FolderNode } from '@/hooks/useFolders';

interface FolderTreeProps {
  nodes: FolderNode[];
  selectedFolderId: string | null;
  onSelectFolder: (id: string | null) => void;
  onCreateFolder: (parentId?: string | null) => void;
  onRenameFolder: (id: string, currentName: string) => void;
  onDeleteFolder: (id: string) => void;
}

interface FolderNodeProps {
  node: FolderNode;
  depth: number;
  selectedFolderId: string | null;
  onSelectFolder: (id: string | null) => void;
  onCreateFolder: (parentId?: string | null) => void;
  onRenameFolder: (id: string, currentName: string) => void;
  onDeleteFolder: (id: string) => void;
}

function FolderNodeItem({
  node,
  depth,
  selectedFolderId,
  onSelectFolder,
  onCreateFolder,
  onRenameFolder,
  onDeleteFolder,
}: FolderNodeProps) {
  const [expanded, setExpanded] = useState(true);
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState(node.name);
  const isSelected = selectedFolderId === node.id;
  const hasChildren = node.children.length > 0;

  const handleRenameSubmit = () => {
    if (renameValue.trim() && renameValue.trim() !== node.name) {
      onRenameFolder(node.id, renameValue.trim());
    }
    setIsRenaming(false);
  };

  return (
    <div>
      <div
        className={cn(
          'group flex items-center gap-1 px-2 py-1 rounded-md cursor-pointer text-sm select-none',
          'hover:bg-zinc-800/60 transition-colors',
          isSelected && 'bg-violet-500/15 text-violet-300',
          !isSelected && 'text-zinc-400',
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

        {/* Context menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="shrink-0 opacity-0 group-hover:opacity-100 text-zinc-500 hover:text-zinc-300 transition-all p-0.5 rounded"
              onClick={(e) => e.stopPropagation()}
            >
              <MoreHorizontal size={13} />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40">
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                setRenameValue(node.name);
                setIsRenaming(true);
              }}
            >
              <Pencil size={13} className="mr-2" />
              Rename
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                onCreateFolder(node.id);
              }}
            >
              <Plus size={13} className="mr-2" />
              Add subfolder
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                onDeleteFolder(node.id);
              }}
              className="text-red-400 focus:text-red-300"
            >
              <Trash2 size={13} className="mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

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
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function FolderTree({
  nodes,
  selectedFolderId,
  onSelectFolder,
  onCreateFolder,
  onRenameFolder,
  onDeleteFolder,
}: FolderTreeProps) {
  return (
    <div className="py-1">
      {/* "All Notes" pseudo-folder */}
      <div
        className={cn(
          'flex items-center gap-2 px-3 py-1 rounded-md cursor-pointer text-sm select-none transition-colors',
          'hover:bg-zinc-800/60',
          selectedFolderId === null ? 'text-violet-300 bg-violet-500/10' : 'text-zinc-400',
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
