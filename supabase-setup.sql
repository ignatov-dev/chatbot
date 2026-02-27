-- ============================================================
-- Supabase setup: conversations + messages tables with RLS
-- Run this in the Supabase SQL Editor (Dashboard > SQL Editor)
-- ============================================================

-- 1. Create conversations table
CREATE TABLE conversations (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title       text NOT NULL DEFAULT 'New conversation',
  source      text NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- 2. Create messages table
CREATE TABLE messages (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id  uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  role             text NOT NULL CHECK (role IN ('user', 'assistant')),
  content          text NOT NULL,
  created_at       timestamptz NOT NULL DEFAULT now()
);

-- 3. Enable RLS
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- 4. RLS policies for conversations
CREATE POLICY "Users can CRUD own conversations"
  ON conversations FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 5. RLS policies for messages
CREATE POLICY "Users can CRUD own messages"
  ON messages FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM conversations
      WHERE conversations.id = messages.conversation_id
      AND conversations.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM conversations
      WHERE conversations.id = messages.conversation_id
      AND conversations.user_id = auth.uid()
    )
  );

-- 6. Share feature: allow public read access to shared conversations
ALTER TABLE conversations ADD COLUMN is_shared boolean NOT NULL DEFAULT false;
CREATE INDEX idx_conversations_shared ON conversations(id) WHERE is_shared = true;

CREATE POLICY "Anyone can read shared conversations"
  ON conversations FOR SELECT
  USING (is_shared = true);

CREATE POLICY "Anyone can read messages of shared conversations"
  ON messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM conversations
      WHERE conversations.id = messages.conversation_id
      AND conversations.is_shared = true
    )
  );

-- 7. Performance indexes
CREATE INDEX idx_conversations_user_id ON conversations(user_id, updated_at DESC);
CREATE INDEX idx_messages_conversation_id ON messages(conversation_id, created_at);

-- 7. Auto-update conversations.updated_at when a message is inserted
CREATE OR REPLACE FUNCTION update_conversation_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE conversations SET updated_at = now() WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_message_insert
  AFTER INSERT ON messages
  FOR EACH ROW
  EXECUTE FUNCTION update_conversation_timestamp();
