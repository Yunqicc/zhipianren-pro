-- BetterAuth 自动管理的表（不需要手动创建）：
-- user, session, account, verification
-- BetterAuth 的 user 表会作为认证基础，我们的 users 表是业务扩展

-- 业务用户扩展表（关联 BetterAuth 的 user 表）
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES "user"(id) ON DELETE CASCADE,
  nickname VARCHAR(100),
  avatar_url TEXT,
  status VARCHAR(32) NOT NULL DEFAULT 'active',
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON user_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_status ON user_profiles(status);

-- 角色表
CREATE TABLE IF NOT EXISTS characters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(64) NOT NULL UNIQUE,
  name VARCHAR(100) NOT NULL,
  subtitle VARCHAR(255),
  avatar_url TEXT,
  cover_image_url TEXT,
  base_image_url TEXT,
  persona_summary TEXT,
  system_prompt_template TEXT,
  visual_prompt TEXT,
  voice_profile VARCHAR(100),
  sort_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_characters_code ON characters(code);
CREATE INDEX IF NOT EXISTS idx_characters_is_active ON characters(is_active);
CREATE INDEX IF NOT EXISTS idx_characters_sort_order ON characters(sort_order);

-- 用户-角色关系档案
CREATE TABLE IF NOT EXISTS user_character_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  character_id UUID NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  relationship_stage VARCHAR(32) NOT NULL DEFAULT 'new_couple',
  affection_score INT DEFAULT 35,
  emotion_state VARCHAR(64),
  last_interaction_at TIMESTAMPTZ,
  memory_version INT DEFAULT 1,
  is_favorite BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_user_character UNIQUE (user_id, character_id)
);

CREATE INDEX IF NOT EXISTS idx_ucp_user_id ON user_character_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_ucp_character_id ON user_character_profiles(character_id);
CREATE INDEX IF NOT EXISTS idx_ucp_last_interaction ON user_character_profiles(last_interaction_at);

-- 会话表
CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_character_profile_id UUID NOT NULL REFERENCES user_character_profiles(id) ON DELETE CASCADE,
  title VARCHAR(255),
  status VARCHAR(32) NOT NULL DEFAULT 'active',
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_message_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_conversations_ucp_id ON conversations(user_character_profile_id);
CREATE INDEX IF NOT EXISTS idx_conversations_last_message ON conversations(last_message_at);

-- 消息表
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_type VARCHAR(32) NOT NULL,
  message_type VARCHAR(32) NOT NULL DEFAULT 'text',
  content_text TEXT,
  audio_url TEXT,
  audio_duration_ms INT,
  image_url TEXT,
  reply_to_message_id UUID REFERENCES messages(id),
  sequence_no INT NOT NULL,
  trigger_reason VARCHAR(64),
  generation_status VARCHAR(32) NOT NULL DEFAULT 'completed',
  model_name VARCHAR(100),
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id, sequence_no);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);
CREATE INDEX IF NOT EXISTS idx_messages_sender_type ON messages(sender_type);

-- 用户记忆表
CREATE TABLE IF NOT EXISTS user_memories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_character_profile_id UUID NOT NULL REFERENCES user_character_profiles(id) ON DELETE CASCADE,
  memory_key VARCHAR(64) NOT NULL,
  memory_label VARCHAR(64) NOT NULL,
  memory_value TEXT NOT NULL,
  source_message_id UUID REFERENCES messages(id),
  confidence_score NUMERIC(5,2),
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_confirmed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_memories_ucp_id ON user_memories(user_character_profile_id);
CREATE INDEX IF NOT EXISTS idx_memories_key ON user_memories(memory_key);
CREATE INDEX IF NOT EXISTS idx_memories_is_active ON user_memories(is_active);

-- 图片生成记录表
CREATE TABLE IF NOT EXISTS image_generations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_character_profile_id UUID NOT NULL REFERENCES user_character_profiles(id) ON DELETE CASCADE,
  message_id UUID REFERENCES messages(id),
  trigger_type VARCHAR(32) NOT NULL,
  trigger_reason VARCHAR(64),
  prompt_text TEXT,
  reference_image_url TEXT,
  result_image_url TEXT,
  provider_name VARCHAR(100),
  model_name VARCHAR(100),
  status VARCHAR(32) NOT NULL DEFAULT 'pending',
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_image_gen_ucp_id ON image_generations(user_character_profile_id);
CREATE INDEX IF NOT EXISTS idx_image_gen_status ON image_generations(status);
CREATE INDEX IF NOT EXISTS idx_image_gen_created_at ON image_generations(created_at);

-- 用户每日额度表
CREATE TABLE IF NOT EXISTS user_daily_quotas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  quota_date DATE NOT NULL,
  quota_type VARCHAR(64) NOT NULL,
  daily_limit INT NOT NULL DEFAULT 10,
  used_count INT NOT NULL DEFAULT 0,
  reset_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_user_quota_date_type UNIQUE (user_id, quota_date, quota_type)
);

CREATE INDEX IF NOT EXISTS idx_quotas_date ON user_daily_quotas(quota_date);

-- 初始角色数据
INSERT INTO characters (code, name, subtitle, persona_summary, visual_prompt, sort_order, is_active) VALUES
  (
    'lin-banxia',
    '林半夏',
    '在平凡日子里带来治愈与安宁的温暖画手',
    '舒适伴侣型，温暖松弛，自由插画师。在一个多雨的江南小镇长大，曾在高压广告公司工作后辞职成为自由插画师。养了一只名叫"饭团"的橘猫。',
    'A young Chinese woman, 27, shoulder-length wavy hair tied in a loose low ponytail, wearing an oversized knit cardigan and cotton-linen skirt, warm smile with crescent-shaped eyes, slight paint stains on fingers, cozy apartment balcony with fern plants in background, soft natural lighting, lifestyle photography style',
    1,
    true
  ),
  (
    'li-xia',
    '黎夏',
    '嘴硬心软的傲娇游戏制作人，骂完你偷偷帮你改代码',
    '傲娇毒舌型，独立游戏制作人，前大厂明星程序员。因为受不了官僚主义裸辞，现在独自开发独立游戏。养了一只名叫"Bug"的胖橘猫。',
    'A young Chinese woman, 24, messy short black hair, slightly dark circles under eyes, wearing an oversized dark hoodie and sweatpants, holding a can of black coffee, sharp and lazy gaze, cyberpunk-styled room with triple monitors and figurines in background, cool-toned monitor glow lighting',
    2,
    true
  );
