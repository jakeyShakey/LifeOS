import type { Database } from './database';

export type CalendarEvent = Database['public']['Tables']['calendar_events']['Row'];
export type Note = Database['public']['Tables']['notes']['Row'];
export type Reminder = Database['public']['Tables']['reminders']['Row'];
export type Document = Database['public']['Tables']['documents']['Row'];
export type Folder = Database['public']['Tables']['folders']['Row'];
export type DocumentChunk = Database['public']['Tables']['document_chunks']['Row'];
export type CalendarConnection = Database['public']['Tables']['calendar_connections']['Row'];
