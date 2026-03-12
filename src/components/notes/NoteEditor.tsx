import { useCallback, useEffect, useRef, useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  Code,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Minus,
  Link as LinkIcon,
  X,
  Trash2,
  ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
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
import type { Folder, Note } from '@/types';

interface NoteEditorProps {
  note: Note;
  onUpdate: (updates: { title?: string; content?: Note['content']; tags?: string[]; folder_id?: string | null }) => void;
  onDelete: () => void;
  folders: Folder[];
  folderName: string | null;
}

type SaveState = 'idle' | 'saving' | 'saved';

function ToolbarButton({
  onClick,
  active,
  children,
  title,
}: {
  onClick: () => void;
  active?: boolean;
  children: React.ReactNode;
  title: string;
}) {
  return (
    <button
      onMouseDown={(e) => {
        e.preventDefault();
        onClick();
      }}
      title={title}
      className={cn(
        'p-1.5 rounded text-zinc-400 hover:text-zinc-100 hover:bg-zinc-700 transition-colors',
        active && 'text-violet-400 bg-zinc-700/60',
      )}
    >
      {children}
    </button>
  );
}

function TagInput({
  tags,
  onChange,
}: {
  tags: string[];
  onChange: (tags: string[]) => void;
}) {
  const [input, setInput] = useState('');

  const addTag = () => {
    const trimmed = input.trim();
    if (trimmed && !tags.includes(trimmed)) {
      onChange([...tags, trimmed]);
    }
    setInput('');
  };

  return (
    <div className="flex flex-wrap gap-1.5 items-center px-8 pb-2">
      {tags.map((tag) => (
        <span
          key={tag}
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-violet-500/15 text-violet-300 text-xs"
        >
          {tag}
          <button
            onClick={() => onChange(tags.filter((t) => t !== tag))}
            className="hover:text-violet-100 transition-colors"
          >
            <X size={10} />
          </button>
        </span>
      ))}
      <input
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            addTag();
          }
        }}
        placeholder="Add tag…"
        className="text-xs bg-transparent text-zinc-400 placeholder:text-zinc-600 outline-none min-w-[70px] w-auto"
      />
    </div>
  );
}

export function NoteEditor({ note, onUpdate, onDelete, folders, folderName }: NoteEditorProps) {
  const [title, setTitle] = useState(note.title);
  const [tags, setTags] = useState<string[]>(note.tags ?? []);
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [folderPopoverOpen, setFolderPopoverOpen] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scheduleAutoSave = useCallback(
    (updates: Parameters<typeof onUpdate>[0]) => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      if (savedTimer.current) clearTimeout(savedTimer.current);
      setSaveState('saving');
      saveTimer.current = setTimeout(() => {
        onUpdate(updates);
        setSaveState('saved');
        savedTimer.current = setTimeout(() => setSaveState('idle'), 2000);
      }, 1000);
    },
    [onUpdate],
  );

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      Link.configure({ openOnClick: false }),
      Placeholder.configure({ placeholder: 'Start writing…' }),
    ],
    content: note.content as object | null ?? '',
    onUpdate: ({ editor: e }) => {
      scheduleAutoSave({ content: e.getJSON() as Note['content'] });
    },
    editorProps: {
      attributes: {
        class:
          'prose prose-invert prose-zinc max-w-none focus:outline-none px-8 pt-4 pb-12 min-h-[400px] text-zinc-200 [&_p]:leading-relaxed',
      },
    },
  });

  // Sync when a different note is selected
  useEffect(() => {
    setTitle(note.title);
    setTags(note.tags ?? []);
    if (editor && editor.getHTML() !== '') {
      editor.commands.setContent(note.content as object | null ?? '');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [note.id]);

  // Keyboard shortcut: Cmd/Ctrl+Delete → show delete dialog
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Delete') {
        e.preventDefault();
        setShowDeleteDialog(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      if (savedTimer.current) clearTimeout(savedTimer.current);
    };
  }, []);

  const handleTitleChange = (value: string) => {
    setTitle(value);
    scheduleAutoSave({ title: value });
  };

  const handleTagsChange = (newTags: string[]) => {
    setTags(newTags);
    onUpdate({ tags: newTags });
  };

  const wordCount = editor
    ? editor.getText().split(/\s+/).filter(Boolean).length
    : 0;

  return (
    <>
      <div className="flex flex-col h-full bg-zinc-950">
        {/* Toolbar */}
        {editor && (
          <div className="sticky top-0 z-10 flex items-center gap-0.5 px-4 py-2 border-b border-zinc-800 bg-zinc-950/90 backdrop-blur-sm flex-wrap">
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleBold().run()}
              active={editor.isActive('bold')}
              title="Bold"
            >
              <Bold size={15} />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleItalic().run()}
              active={editor.isActive('italic')}
              title="Italic"
            >
              <Italic size={15} />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleUnderline().run()}
              active={editor.isActive('underline')}
              title="Underline"
            >
              <UnderlineIcon size={15} />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleStrike().run()}
              active={editor.isActive('strike')}
              title="Strikethrough"
            >
              <Strikethrough size={15} />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleCode().run()}
              active={editor.isActive('code')}
              title="Inline code"
            >
              <Code size={15} />
            </ToolbarButton>

            <div className="w-px h-4 bg-zinc-700 mx-1" />

            <ToolbarButton
              onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
              active={editor.isActive('heading', { level: 1 })}
              title="Heading 1"
            >
              <Heading1 size={15} />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
              active={editor.isActive('heading', { level: 2 })}
              title="Heading 2"
            >
              <Heading2 size={15} />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
              active={editor.isActive('heading', { level: 3 })}
              title="Heading 3"
            >
              <Heading3 size={15} />
            </ToolbarButton>

            <div className="w-px h-4 bg-zinc-700 mx-1" />

            <ToolbarButton
              onClick={() => editor.chain().focus().toggleBulletList().run()}
              active={editor.isActive('bulletList')}
              title="Bullet list"
            >
              <List size={15} />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleOrderedList().run()}
              active={editor.isActive('orderedList')}
              title="Ordered list"
            >
              <ListOrdered size={15} />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleBlockquote().run()}
              active={editor.isActive('blockquote')}
              title="Blockquote"
            >
              <Quote size={15} />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().setHorizontalRule().run()}
              title="Horizontal rule"
            >
              <Minus size={15} />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => {
                const url = window.prompt('Enter URL');
                if (url) editor.chain().focus().setLink({ href: url }).run();
              }}
              active={editor.isActive('link')}
              title="Insert link"
            >
              <LinkIcon size={15} />
            </ToolbarButton>

            <div className="ml-auto flex items-center gap-2">
              {saveState === 'saving' && (
                <span className="text-xs text-zinc-500">Saving…</span>
              )}
              {saveState === 'saved' && (
                <span className="text-xs text-emerald-400">Saved</span>
              )}
              <button
                onMouseDown={(e) => {
                  e.preventDefault();
                  setShowDeleteDialog(true);
                }}
                title="Delete note (⌘⌫)"
                className="p-1.5 rounded text-zinc-600 hover:text-red-400 hover:bg-zinc-700 transition-colors"
              >
                <Trash2 size={15} />
              </button>
            </div>
          </div>
        )}

        {/* Breadcrumb */}
        <div className="px-8 pt-3 pb-0 flex items-center gap-1 text-xs text-zinc-500">
          <span>Notes</span>
          <ChevronRight size={12} className="text-zinc-700" />
          <Popover open={folderPopoverOpen} onOpenChange={setFolderPopoverOpen}>
            <PopoverTrigger asChild>
              <button className="hover:text-zinc-300 transition-colors">
                {folderName ?? 'Unfiled'}
              </button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-44 p-1">
              <button
                className="w-full text-left px-2 py-1.5 text-sm rounded hover:bg-zinc-800 text-zinc-300 transition-colors"
                onClick={() => {
                  onUpdate({ folder_id: null });
                  setFolderPopoverOpen(false);
                }}
              >
                Unfiled
              </button>
              {folders.map((f) => (
                <button
                  key={f.id}
                  className="w-full text-left px-2 py-1.5 text-sm rounded hover:bg-zinc-800 text-zinc-300 transition-colors"
                  onClick={() => {
                    onUpdate({ folder_id: f.id });
                    setFolderPopoverOpen(false);
                  }}
                >
                  {f.name}
                </button>
              ))}
            </PopoverContent>
          </Popover>
        </div>

        {/* Title */}
        <input
          value={title}
          onChange={(e) => handleTitleChange(e.target.value)}
          placeholder="Untitled"
          className="w-full bg-transparent text-2xl font-semibold text-zinc-100 placeholder:text-zinc-600 outline-none px-8 pt-4 pb-2"
        />

        {/* Tags */}
        <TagInput tags={tags} onChange={handleTagsChange} />

        {/* Body */}
        <div className="flex-1 overflow-auto">
          <EditorContent editor={editor} />
        </div>

        {/* Footer */}
        <div className="px-8 py-2 border-t border-zinc-800/50 flex items-center gap-4 text-xs text-zinc-600">
          <span>{wordCount} words</span>
          {note.updated_at && (
            <span>
              Edited {new Date(note.updated_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
        </div>
      </div>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete "{note.title || 'Untitled'}"?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => { setShowDeleteDialog(false); onDelete(); }}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
