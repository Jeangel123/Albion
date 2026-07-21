/*
# Whispers — Sistema de mensajes privados (1 a 1)

## Descripción
Crea un sistema de "whispers" (mensajes privados) entre dos usuarios, similar al DM de Discord/WhatsApp.
Incluye confirmación de lectura (read receipts) y soporte para respuestas (reply_to).

## Nuevas tablas

### 1. `whispers`
- `id` (uuid, PK)
- `sender_id` (uuid, FK → profiles, NOT NULL) — quien envía
- `recipient_id` (uuid, FK → profiles, NOT NULL) — quien recibe
- `content` (text) — texto del mensaje (nullable si solo tiene imagen)
- `media_url` (text) — URL de imagen adjunta
- `reply_to` (uuid, FK → whispers) — mensaje al que responde
- `read_at` (timestamptz) — fecha de lectura por el receptor (NULL = no leído)
- `created_at` (timestamptz, DEFAULT now())

### 2. `whisper_reactions`
- `id` (uuid, PK)
- `whisper_id` (uuid, FK → whispers ON DELETE CASCADE)
- `user_id` (uuid, FK → profiles)
- `type` (text) — tipo de reacción (like, love, haha, wow, sad, angry)
- `created_at` (timestamptz)
- UNIQUE(whisper_id, user_id, type)

## Índices
- `idx_whispers_participants` en (sender_id, recipient_id, created_at DESC) — consulta del hilo
- `idx_whispers_recipient_unread` en (recipient_id) WHERE read_at IS NULL — contador de no leídos
- `idx_whisper_reactions_whisper` en (whisper_id)

## Seguridad (RLS)
- `whispers`: SELECT solo para sender o recipient; INSERT solo sender; UPDATE solo recipient (para marcar read_at); DELETE solo sender.
- `whisper_reactions`: SELECT para participantes del whisper; INSERT/DELETE solo el usuario que reacciona.

## Realtime
- Añade `whispers` y `whisper_reactions` a la publicación `supabase_realtime` para suscripción en vivo.
*/