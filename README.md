What Insight is
Insight is a full-stack app for turning customer feedback (and voice transcripts treated like reviews) into something you can explore, score for authenticity, and summarize with analytics (trends, urgency, bias-style adjustments, aspect sentiment, recommendations).

It is aimed at teams that ingest CSV / JSON / pasted text / YouTube comments, normalize them into a single review record shape, then run fake detection and multi-window insights on that dataset—optionally with Groq for language, context, recommendations, and an “AI mode” that prefers Groq-heavy paths end-to-end when the UI toggle is on.

How the repo is organized
Part	Role
frontend/	React + TypeScript + Vite SPA: marketing landing, /app workspace with Data and Voice pipelines (Mindweave-style shell), charts, tables, overview dashboards.
voice_module/	FastAPI app (uvicorn from voice_module/app): ingestion, chunking, preprocessing, fake detection, insights, WebSocket replay, optional YouTube fetch.
The browser talks to the API via VITE_API_BASE_URL (defaults to http://localhost:8000 in the frontend code).

End-to-end data flow (Data workspace)
Upload → CSV/JSON/manual/YouTube → parsed → normalize_dataframe builds canonical ReviewRecord rows (review_id, text, source, timestamp, product_id, optional language/translation/Groq context fields from preprocessing).
Large files → chunk session (session_id, has_more) so you pull more rows with POST /upload/chunk/next.
Explore pages show filtered/sorted views of what’s in memory (client-side filtering on the loaded batch).
Analyze fakes → POST /upload/analyze-fakes with inline reviews or session_id → hybrid rules + optional HF classifier + optional SBERT similarity, or Groq batch when AI mode is on.
Run insights → POST /upload/analyze-insights → lexicon-based trends, TextBlob sentiment, urgency, shrinkage/bias summary, recommendations (Groq JSON if key set, else templates), aspect_sentiment (sentence split + lexicon + TextBlob; optional Groq ABSA refinement), or full Groq JSON insights in AI mode with fallback to hybrid.
Optional live replay: /ws/review-stream replays normalized rows from a session for simulated streaming + debounced re-analysis in the UI.

Voice workspace (how it differs)
The Voice path is for audio → transcript → same pipeline shape: sessions are converted client-side into synthetic ReviewRecord rows so fake and insights APIs work the same way as on tabular reviews. Actual audio analysis (Whisper + local LLM demo) lives in the voice FastAPI routes described in voice_module/README.md (POST /voice/analyze); that is parallel to, not the same as, the review ingestion stack.

“Intelligence” layers (conceptually)
Preprocessing — clean text, detect language, translate to English (Groq when configured), optional Groq “context” JSON, optional spellcheck, sentence split, dedupe (exact + optional embedding near-dedupe with sentence-transformers).
Fake detection — interpretable signals + fused score + threshold; optional transformers model and SBERT-style similarity.
Insights — time windows, theme rates from a fixed lexicon, sentiment and urgency math, optional fake rate in urgency, aspect sentiment from sentences + lexicon + TextBlob (+ optional Groq).
