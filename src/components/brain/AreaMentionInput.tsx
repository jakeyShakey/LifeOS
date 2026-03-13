import { useEffect, useRef, useState } from 'react';
import type { BrainArea } from '@/types';

interface AreaMentionInputProps {
  areas: BrainArea[];
  onChange: (value: { plainText: string; selectedAreaIds: string[] }) => void;
  onSubmit: () => void;
  placeholder?: string;
  disabled?: boolean;
}

export function AreaMentionInput({
  areas,
  onChange,
  onSubmit,
  placeholder = 'Ask your brain… Use @ to scope to areas',
  disabled = false,
}: AreaMentionInputProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [mentionOpen, setMentionOpen] = useState(false);
  const [mentionSearch, setMentionSearch] = useState('');
  const [mentionIndex, setMentionIndex] = useState(0);
  const [isEmpty, setIsEmpty] = useState(true);

  const filtered = areas.filter((a) =>
    a.name.toLowerCase().startsWith(mentionSearch.toLowerCase())
  );

  // Clamp mentionIndex when filtered list changes
  useEffect(() => {
    if (mentionIndex >= filtered.length) {
      setMentionIndex(Math.max(0, filtered.length - 1));
    }
  }, [filtered.length, mentionIndex]);

  function fireOnChange() {
    const editor = editorRef.current;
    if (!editor) return;

    let plainText = '';
    const selectedAreaIds: string[] = [];

    for (const node of Array.from(editor.childNodes)) {
      if (node.nodeType === Node.TEXT_NODE) {
        plainText += node.textContent ?? '';
      } else if (node instanceof HTMLElement && node.dataset.areaId) {
        selectedAreaIds.push(node.dataset.areaId);
      }
    }

    // Strip trailing @searchTerm if mention popup is open
    if (mentionOpen) {
      const atIdx = plainText.lastIndexOf('@');
      if (atIdx !== -1) {
        plainText = plainText.slice(0, atIdx);
      }
    }

    onChange({ plainText: plainText.trim(), selectedAreaIds });
    setIsEmpty(editor.textContent?.trim() === '' && selectedAreaIds.length === 0);
  }

  function getMentionSearchAtCursor(): string | null {
    const sel = window.getSelection();
    if (!sel || !sel.anchorNode) return null;
    const node = sel.anchorNode;
    if (node.nodeType !== Node.TEXT_NODE) return null;
    const text = (node.textContent ?? '').slice(0, sel.anchorOffset);
    const atIdx = text.lastIndexOf('@');
    if (atIdx === -1) return null;
    const afterAt = text.slice(atIdx + 1);
    // No space allowed between @ and cursor
    if (/\s/.test(afterAt)) return null;
    return afterAt;
  }

  function insertPill(area: BrainArea) {
    const sel = window.getSelection();
    if (!sel || !sel.anchorNode) return;

    const anchorNode = sel.anchorNode;
    if (anchorNode.nodeType !== Node.TEXT_NODE) return;

    const text = anchorNode.textContent ?? '';
    const atIdx = text.lastIndexOf('@');
    if (atIdx === -1) return;

    const range = document.createRange();
    range.setStart(anchorNode, atIdx);
    range.setEnd(anchorNode, sel.anchorOffset);
    range.deleteContents();

    // Build pill span
    const pill = document.createElement('span');
    pill.contentEditable = 'false';
    pill.dataset.areaId = area.id;
    pill.className =
      'inline-flex items-center gap-1 mx-0.5 px-1.5 py-0.5 rounded text-xs font-medium bg-zinc-800 border border-zinc-700 text-zinc-300 select-none';

    const dot = document.createElement('span');
    dot.className = 'w-1.5 h-1.5 rounded-full shrink-0';
    dot.style.backgroundColor = area.color ?? '#6d28d9';
    pill.appendChild(dot);

    const label = document.createTextNode(area.name);
    pill.appendChild(label);

    const removeBtn = document.createElement('span');
    removeBtn.dataset.pillRemove = 'true';
    removeBtn.className = 'ml-0.5 cursor-pointer opacity-60 hover:opacity-100 text-xs leading-none';
    removeBtn.textContent = '×';
    pill.appendChild(removeBtn);

    range.insertNode(pill);

    // Insert trailing non-breaking space + move caret there
    const spacer = document.createTextNode('\u00A0');
    pill.after(spacer);

    const newRange = document.createRange();
    newRange.setStart(spacer, 1);
    newRange.collapse(true);
    sel.removeAllRanges();
    sel.addRange(newRange);

    setMentionOpen(false);
    setMentionSearch('');
    setTimeout(fireOnChange, 0);
  }

  function handleInput() {
    const search = getMentionSearchAtCursor();
    if (search !== null) {
      setMentionSearch(search);
      setMentionIndex(0);
      setMentionOpen(true);
    } else {
      setMentionOpen(false);
      setMentionSearch('');
    }
    fireOnChange();
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    if (mentionOpen) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setMentionIndex((i) => Math.min(i + 1, filtered.length - 1));
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setMentionIndex((i) => Math.max(i - 1, 0));
        return;
      }
      if (e.key === 'Enter') {
        e.preventDefault();
        if (filtered[mentionIndex]) insertPill(filtered[mentionIndex]);
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        setMentionOpen(false);
        return;
      }
    } else {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        onSubmit();
      }
    }
  }

  function handleMouseDown(e: React.MouseEvent<HTMLDivElement>) {
    const target = e.target as HTMLElement;
    const removeBtn = target.closest('[data-pill-remove]');
    if (removeBtn) {
      e.preventDefault();
      const pill = removeBtn.closest('[data-area-id]');
      if (pill) {
        pill.remove();
        setTimeout(fireOnChange, 0);
      }
    }
  }

  function handlePaste(e: React.ClipboardEvent<HTMLDivElement>) {
    e.preventDefault();
    const text = e.clipboardData?.getData('text/plain') ?? '';
    document.execCommand('insertText', false, text);
  }

  return (
    <div className="relative">
      {/* Floating area picker */}
      {mentionOpen && filtered.length > 0 && (
        <div className="absolute bottom-full mb-1 left-0 z-50 bg-zinc-900 border border-zinc-700 rounded-md shadow-lg overflow-hidden min-w-[180px] max-w-[260px]">
          <div className="py-1">
            {filtered.map((area, idx) => (
              <button
                key={area.id}
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  insertPill(area);
                }}
                className={`w-full flex items-center gap-2 px-3 py-1.5 text-xs text-left transition-colors ${
                  idx === mentionIndex
                    ? 'bg-violet-600/30 text-zinc-200'
                    : 'text-zinc-400 hover:bg-zinc-800'
                }`}
              >
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: area.color ?? '#6d28d9' }}
                />
                {area.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Editor */}
      <div className="relative">
        {isEmpty && (
          <p className="absolute inset-0 pointer-events-none flex items-center px-3 text-sm text-zinc-600 select-none">
            {placeholder}
          </p>
        )}
        <div
          ref={editorRef}
          contentEditable={!disabled}
          suppressContentEditableWarning
          onInput={handleInput}
          onKeyDown={handleKeyDown}
          onMouseDown={handleMouseDown}
          onPaste={handlePaste}
          className={`min-h-[40px] max-h-[120px] overflow-y-auto px-3 py-2 text-sm text-zinc-200 leading-relaxed outline-none rounded-md border transition-colors ${
            disabled
              ? 'opacity-50 cursor-not-allowed border-zinc-800 bg-zinc-900/50'
              : 'border-zinc-700 bg-zinc-900 focus:border-violet-500/60'
          }`}
        />
      </div>
    </div>
  );
}
