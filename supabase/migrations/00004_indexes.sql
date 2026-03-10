-- Composite index for calendar event queries by user + time range
CREATE INDEX ON calendar_events (user_id, start_time);

-- Index for filtering document_chunks by user
CREATE INDEX ON document_chunks (user_id);

-- HNSW index for fast approximate nearest-neighbour vector search
-- Preferred over IVFFlat: no pre-training required, better cold-start performance
CREATE INDEX ON document_chunks USING hnsw (embedding vector_cosine_ops);
