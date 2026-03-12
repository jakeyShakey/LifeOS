import * as pdfjsLib from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import OpenAI from 'openai';
import { supabase } from './supabase';
import type { Document } from '@/types';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

export type UploadProgress = {
  stage: 'extracting' | 'uploading' | 'embedding' | 'storing' | 'done';
  progress?: number;
};

const CHUNK_CHAR_SIZE = 500 * 4; // 500 tokens * ~4 chars/token
const CHUNK_CHAR_OVERLAP = 50 * 4; // 50 tokens overlap

export function chunkText(text: string, chunkSize = 500, overlap = 50): string[] {
  const charSize = chunkSize * 4;
  const charOverlap = overlap * 4;
  const chunks: string[] = [];
  let start = 0;

  while (start < text.length) {
    const end = Math.min(start + charSize, text.length);
    chunks.push(text.slice(start, end));
    if (end === text.length) break;
    start += charSize - charOverlap;
  }

  return chunks;
}

export async function embedChunks(chunks: string[]): Promise<number[][]> {
  const openai = new OpenAI({
    apiKey: import.meta.env.VITE_OPENAI_API_KEY,
    dangerouslyAllowBrowser: true,
  });

  const BATCH_SIZE = 20;
  const allEmbeddings: number[][] = [];

  for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
    const batch = chunks.slice(i, i + BATCH_SIZE);
    const response = await openai.embeddings.create({
      model: 'text-embedding-ada-002',
      input: batch,
    });
    for (const item of response.data) {
      allEmbeddings.push(item.embedding);
    }
  }

  return allEmbeddings;
}

export async function extractTextFromPDF(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
  const pdf = await loadingTask.promise;

  const pageTexts: string[] = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const pageText = content.items
      .map((item) => ('str' in item ? item.str : ''))
      .join(' ');
    pageTexts.push(pageText);
  }

  const fullText = pageTexts.join('\n\n').trim();
  if (!fullText) {
    throw new Error(
      'No text could be extracted from this PDF. It may be an image-only or scanned document.'
    );
  }

  return fullText;
}

export async function extractTextFromURL(url: string): Promise<string> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch URL: ${response.status} ${response.statusText}`);
  }

  const html = await response.text();

  // Strip script and style blocks
  let text = html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');

  // Strip all remaining HTML tags
  text = text.replace(/<[^>]+>/g, ' ');

  // Decode common HTML entities
  text = text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ');

  // Collapse whitespace
  text = text.replace(/\s+/g, ' ').trim();

  return text;
}

export async function processAndStoreDocument(
  userId: string,
  input: File | string,
  type: 'pdf' | 'url' | 'text',
  onProgress?: (p: UploadProgress) => void
): Promise<Document> {
  onProgress?.({ stage: 'extracting' });

  let rawText: string;
  let title: string;
  let storageUrl: string | null = null;

  if (type === 'pdf' && input instanceof File) {
    rawText = await extractTextFromPDF(input);
    title = input.name.replace(/\.pdf$/i, '');
  } else if (type === 'url' && typeof input === 'string') {
    rawText = await extractTextFromURL(input);
    // Use URL as title fallback, trimmed to reasonable length
    try {
      const urlObj = new URL(input);
      title = urlObj.hostname + urlObj.pathname;
    } catch {
      title = input.slice(0, 100);
    }
    storageUrl = input;
  } else if (type === 'text' && typeof input === 'string') {
    rawText = input;
    title = rawText.slice(0, 60).replace(/\n/g, ' ').trim() || 'Text document';
  } else {
    throw new Error('Invalid input/type combination');
  }

  // Upload PDF to storage
  if (type === 'pdf' && input instanceof File) {
    onProgress?.({ stage: 'uploading' });
    const tempId = crypto.randomUUID();
    const storagePath = `${userId}/${tempId}/${input.name}`;
    const { error: uploadError } = await supabase.storage
      .from('documents')
      .upload(storagePath, input);
    if (uploadError) throw uploadError;
    storageUrl = storagePath;
  }

  // Insert document row
  const { data: doc, error: docError } = await supabase
    .from('documents')
    .insert({ user_id: userId, title, source_type: type, url: storageUrl })
    .select()
    .single();
  if (docError) throw docError;

  // Chunk text
  const chunks = chunkText(rawText);

  // Embed in batches with progress
  onProgress?.({ stage: 'embedding', progress: 0 });
  const EMBED_BATCH = 20;
  const allEmbeddings: number[][] = [];

  const openai = new OpenAI({
    apiKey: import.meta.env.VITE_OPENAI_API_KEY,
    dangerouslyAllowBrowser: true,
  });

  for (let i = 0; i < chunks.length; i += EMBED_BATCH) {
    const batch = chunks.slice(i, i + EMBED_BATCH);
    const response = await openai.embeddings.create({
      model: 'text-embedding-ada-002',
      input: batch,
    });
    for (const item of response.data) {
      allEmbeddings.push(item.embedding);
    }
    const pct = Math.round(((i + batch.length) / chunks.length) * 100);
    onProgress?.({ stage: 'embedding', progress: pct });
  }

  // Store chunks in batches of 100
  onProgress?.({ stage: 'storing' });
  const STORE_BATCH = 100;

  for (let i = 0; i < chunks.length; i += STORE_BATCH) {
    const batchChunks = chunks.slice(i, i + STORE_BATCH).map((content, j) => ({
      user_id: userId,
      document_id: doc.id,
      chunk_index: i + j,
      content,
      embedding: `[${allEmbeddings[i + j].join(',')}]`,
    }));

    const { error: chunkError } = await supabase.from('document_chunks').insert(batchChunks);
    if (chunkError) throw chunkError;
  }

  await supabase.from('documents').update({ chunk_count: chunks.length }).eq('id', doc.id);

  onProgress?.({ stage: 'done' });
  return doc;
}

// Re-export for use in hooks (avoids duplicate constant)
export { CHUNK_CHAR_SIZE, CHUNK_CHAR_OVERLAP };
