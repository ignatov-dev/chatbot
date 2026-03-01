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

-- 8. Share link expiration support
ALTER TABLE conversations ADD COLUMN shared_expires_at timestamptz DEFAULT NULL;

CREATE POLICY "Anyone can read shared conversations"
  ON conversations FOR SELECT
  USING (
    is_shared = true
    AND (shared_expires_at IS NULL OR shared_expires_at > now())
  );

CREATE POLICY "Anyone can read messages of shared conversations"
  ON messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM conversations
      WHERE conversations.id = messages.conversation_id
      AND conversations.is_shared = true
      AND (conversations.shared_expires_at IS NULL OR conversations.shared_expires_at > now())
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

-- 8. Access requests for expired shared link restoration
CREATE TABLE access_requests (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  fingerprint     text NOT NULL,
  status          text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'denied')),
  created_at      timestamptz NOT NULL DEFAULT now(),
  resolved_at     timestamptz
);

CREATE INDEX idx_access_requests_pending ON access_requests(conversation_id) WHERE status = 'pending';
CREATE UNIQUE INDEX idx_access_requests_unique_pending ON access_requests(conversation_id, fingerprint) WHERE status = 'pending';
ALTER TABLE access_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anon can insert access request"
  ON access_requests FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM conversations c
      WHERE c.id = conversation_id
        AND c.is_shared = true
    )
  );

CREATE POLICY "Owner can read access requests"
  ON access_requests FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM conversations c
      WHERE c.id = conversation_id AND c.user_id = auth.uid()
    )
  );

CREATE POLICY "Owner can update access requests"
  ON access_requests FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM conversations c
      WHERE c.id = conversation_id AND c.user_id = auth.uid()
    )
  );

-- Function to submit access request (bypasses RLS for cross-table validation)
CREATE OR REPLACE FUNCTION submit_access_request(p_conversation_id uuid, p_fingerprint text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM conversations WHERE id = p_conversation_id AND is_shared = true
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_found');
  END IF;

  INSERT INTO access_requests (conversation_id, fingerprint)
  VALUES (p_conversation_id, p_fingerprint);

  RETURN jsonb_build_object('success', true);
EXCEPTION
  WHEN unique_violation THEN
    RETURN jsonb_build_object('success', false, 'error', 'already_requested');
END; $$;

GRANT EXECUTE ON FUNCTION submit_access_request(uuid, text) TO anon, authenticated;

-- Function to check share link status without exposing conversation data
CREATE OR REPLACE FUNCTION check_shared_link_status(p_conversation_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_is_shared boolean; v_expires_at timestamptz;
BEGIN
  SELECT is_shared, shared_expires_at INTO v_is_shared, v_expires_at
    FROM conversations WHERE id = p_conversation_id;
  IF NOT FOUND THEN RETURN jsonb_build_object('status', 'not_found'); END IF;
  IF NOT v_is_shared THEN RETURN jsonb_build_object('status', 'not_found'); END IF;
  IF v_expires_at IS NOT NULL AND v_expires_at <= now() THEN RETURN jsonb_build_object('status', 'expired'); END IF;
  RETURN jsonb_build_object('status', 'active');
END; $$;

GRANT EXECUTE ON FUNCTION check_shared_link_status(uuid) TO anon, authenticated;

ALTER PUBLICATION supabase_realtime ADD TABLE access_requests;

-- 9. Web Push Notifications
CREATE TABLE push_subscriptions (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint    text NOT NULL,
  p256dh      text NOT NULL,
  auth        text NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, endpoint)
);

CREATE INDEX idx_push_subscriptions_user_id ON push_subscriptions(user_id);
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can CRUD own push subscriptions"
  ON push_subscriptions FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TABLE push_notification_log (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id  uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  viewer_fingerprint text NOT NULL,
  sent_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_push_log_lookup
  ON push_notification_log(conversation_id, viewer_fingerprint, sent_at DESC);
