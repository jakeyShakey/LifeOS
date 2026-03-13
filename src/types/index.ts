import type { Database } from './database';

export type CalendarEvent = Database['public']['Tables']['calendar_events']['Row'];
export type Note = Database['public']['Tables']['notes']['Row'];
export type Reminder = Database['public']['Tables']['reminders']['Row'];
export type Document = Database['public']['Tables']['documents']['Row'];
export type Folder = Database['public']['Tables']['folders']['Row'];
export type DocumentChunk = Database['public']['Tables']['document_chunks']['Row'];
export type CalendarConnection = Database['public']['Tables']['calendar_connections']['Row'];
export type AiConversation = Database['public']['Tables']['ai_conversations']['Row'];
export type AiMessage = Database['public']['Tables']['ai_messages']['Row'];
export type BrainArea = Database['public']['Tables']['brain_areas']['Row'];
export type DocumentArea = Database['public']['Tables']['document_areas']['Row'];

export interface SchedulingIntent {
  duration_minutes: number;
  purpose: string;
  window_days: number;
  constraints: string[];
}

export interface TimeSlot {
  start: Date;
  end: Date;
  label: string;
}

export type AIResponseType = 'scheduling_options' | 'knowledge_answer' | 'general_answer';

export interface KnowledgeSource {
  title: string;
  document_id: string;
  areaNames?: string[];
}

export interface AIResponse {
  type: AIResponseType;
  slots?: TimeSlot[];
  answer?: string;
  sources?: KnowledgeSource[];
}
