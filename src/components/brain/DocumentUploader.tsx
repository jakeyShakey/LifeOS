import { useRef, useState } from 'react';
import { CheckCircle, Upload, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { useUploadDocument } from '@/hooks/useDocuments';
import type { UploadProgress } from '@/lib/embeddings';

type Stage = 'idle' | 'uploading' | 'success' | 'error';

const STAGE_LABELS: Record<UploadProgress['stage'], string> = {
  extracting: 'Extracting text…',
  uploading: 'Uploading file…',
  embedding: 'Generating embeddings…',
  storing: 'Storing chunks…',
  done: 'Done',
};

export function DocumentUploader() {
  const [stage, setStage] = useState<Stage>('idle');
  const [progress, setProgress] = useState<UploadProgress>({ stage: 'extracting' });
  const [embedPct, setEmbedPct] = useState(0);
  const [successTitle, setSuccessTitle] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const [urlValue, setUrlValue] = useState('');
  const [textValue, setTextValue] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const uploadMutation = useUploadDocument();

  const handleProgress = (p: UploadProgress) => {
    setProgress(p);
    if (p.stage === 'embedding') setEmbedPct(p.progress ?? 0);
  };

  const reset = () => {
    setStage('idle');
    setUrlValue('');
    setTextValue('');
    setEmbedPct(0);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const upload = async (input: File | string, type: 'pdf' | 'url' | 'text') => {
    setStage('uploading');
    setErrorMessage('');
    try {
      const doc = await uploadMutation.mutateAsync({ input, type, onProgress: handleProgress });
      setSuccessTitle(doc.title);
      setStage('success');
      setTimeout(reset, 3000);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Upload failed. Please try again.');
      setStage('error');
    }
  };

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) upload(file, 'pdf');
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) upload(file, 'pdf');
  };

  if (stage === 'success') {
    return (
      <div className="p-3 rounded-md bg-emerald-500/10 border border-emerald-500/30 flex items-center gap-2">
        <CheckCircle size={15} className="text-emerald-400 shrink-0" />
        <p className="text-sm text-emerald-300 truncate flex-1">
          <span className="font-medium">{successTitle}</span> added
        </p>
      </div>
    );
  }

  if (stage === 'error') {
    return (
      <div className="p-3 rounded-md bg-red-500/10 border border-red-500/30 space-y-2">
        <div className="flex items-start gap-2">
          <XCircle size={15} className="text-red-400 shrink-0 mt-0.5" />
          <p className="text-sm text-red-300">{errorMessage}</p>
        </div>
        <Button size="sm" variant="ghost" onClick={reset} className="text-xs text-zinc-400 h-7">
          Try again
        </Button>
      </div>
    );
  }

  if (stage === 'uploading') {
    const pct = progress.stage === 'embedding' ? embedPct : undefined;
    return (
      <div className="p-3 rounded-md bg-zinc-900/50 border border-zinc-800 space-y-2">
        <p className="text-xs text-zinc-400">{STAGE_LABELS[progress.stage]}</p>
        <Progress value={pct} className="h-1.5" />
        {pct !== undefined && (
          <p className="text-xs text-zinc-600 text-right">{pct}%</p>
        )}
      </div>
    );
  }

  return (
    <Tabs defaultValue="file" className="w-full">
      <TabsList className="w-full h-8 bg-zinc-900 border border-zinc-800">
        <TabsTrigger value="file" className="flex-1 text-xs h-6">
          File
        </TabsTrigger>
        <TabsTrigger value="url" className="flex-1 text-xs h-6">
          URL
        </TabsTrigger>
        <TabsTrigger value="text" className="flex-1 text-xs h-6">
          Text
        </TabsTrigger>
      </TabsList>

      <TabsContent value="file" className="mt-2">
        <div
          onDrop={handleFileDrop}
          onDragOver={(e) => e.preventDefault()}
          onClick={() => fileInputRef.current?.click()}
          className="border border-dashed border-zinc-700 rounded-md p-4 text-center cursor-pointer hover:border-violet-500/50 hover:bg-violet-500/5 transition-colors"
        >
          <Upload size={18} className="mx-auto text-zinc-600 mb-1.5" />
          <p className="text-xs text-zinc-500">Drop PDF or click to browse</p>
          <p className="text-xs text-zinc-700 mt-0.5">.pdf, .txt, .md</p>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.txt,.md"
            className="hidden"
            onChange={handleFileSelect}
          />
        </div>
      </TabsContent>

      <TabsContent value="url" className="mt-2 space-y-2">
        <Input
          value={urlValue}
          onChange={(e) => setUrlValue(e.target.value)}
          placeholder="https://…"
          className="h-8 text-xs bg-zinc-900 border-zinc-700 focus:border-violet-500/60"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && urlValue.trim()) upload(urlValue.trim(), 'url');
          }}
        />
        <Button
          size="sm"
          disabled={!urlValue.trim()}
          onClick={() => upload(urlValue.trim(), 'url')}
          className="w-full h-8 text-xs bg-violet-600 hover:bg-violet-500 text-white"
        >
          Import URL
        </Button>
      </TabsContent>

      <TabsContent value="text" className="mt-2 space-y-2">
        <textarea
          value={textValue}
          onChange={(e) => setTextValue(e.target.value)}
          placeholder="Paste text here…"
          rows={5}
          className="w-full text-xs bg-zinc-900 border border-zinc-700 rounded-md px-3 py-2 text-zinc-300 focus:outline-none focus:border-violet-500/60 resize-none"
        />
        <Button
          size="sm"
          disabled={!textValue.trim()}
          onClick={() => upload(textValue.trim(), 'text')}
          className="w-full h-8 text-xs bg-violet-600 hover:bg-violet-500 text-white"
        >
          Add Text
        </Button>
      </TabsContent>
    </Tabs>
  );
}
