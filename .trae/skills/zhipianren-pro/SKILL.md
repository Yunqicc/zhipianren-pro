---
name: "zhipianren-pro"
description: "Project conventions and context for 纸片人女友 2.0. Invoke when writing code for this project, creating components, designing APIs, or making architectural decisions."
---

# 纸片人女友 2.0 项目 Skill

## 产品概述

虚拟恋爱陪伴产品，面向中文用户，微信风格聊天体验。用户登录后选择角色，与虚拟女友进行持续聊天互动，获得文字、语音、生活化照片、记忆承接等陪伴体验。

## 技术栈

| 项目 | 选择 |
| --- | --- |
| 框架 | Next.js 16 (App Router) |
| 语言 | TypeScript |
| 数据库 | Neon (Serverless Postgres) |
| 数据库访问 | 手写 SQL + postgres.js |
| 认证 | BetterAuth（邮箱注册登录 + 社交登录预留） |
| CSS | Tailwind CSS |
| 组件 | 自定义设计，微信风格聊天界面 |
| 图标 | Lucide React |
| 实时通信 | SSE (Server-Sent Events) |
| 文件存储 | Cloudflare R2 |
| AI 提供商 | 火山引擎（火山方舟） |
| 包管理器 | pnpm |

## 目录结构约定

```
src/
├── app/                    # Next.js App Router 页面
│   ├── (auth)/             # 认证相关页面（登录、注册）
│   ├── (chat)/             # 聊天相关页面（角色选择、聊天主界面）
│   └── api/                # API Routes
│       ├── auth/           # 认证接口
│       ├── chat/           # 聊天接口
│       ├── characters/     # 角色接口
│       ├── images/         # 图片生成接口
│       ├── memories/       # 记忆接口
│       └── voice/          # 语音接口
├── components/             # React 组件
│   ├── ui/                 # 基础 UI 组件
│   ├── chat/               # 聊天相关组件
│   └── auth/               # 认证相关组件
├── lib/                    # 工具函数和核心逻辑
│   ├── db/                 # 数据库连接和查询
│   ├── ai/                 # AI Provider 抽象层
│   │   ├── providers/      # 具体提供商实现
│   │   ├── llm.ts          # LLM 接口
│   │   ├── tts.ts          # TTS 接口
│   │   └── image.ts        # 图像生成接口
│   ├── auth/               # 认证配置
│   ├── storage/            # R2 存储操作
│   └── prompt/             # Prompt 模板和组装逻辑
├── types/                  # TypeScript 类型定义
└── styles/                 # 全局样式
```

## 代码风格约定

1. 不写注释，代码即文档
2. 文件名使用 kebab-case（如 `user-memories.ts`）
3. 组件文件名使用 PascalCase（如 `ChatBubble.tsx`）
4. API Route 使用 route.ts 命名（Next.js App Router 约定）
5. 数据库查询写在 `lib/db/` 下，不直接在 API Route 里写 SQL
6. 所有环境变量通过 `lib/env.ts` 统一导出，不直接用 `process.env`
7. 错误处理：API Route 统一返回 `{ error: string }` 格式，HTTP 状态码正确

## 数据库约定

8 张核心表：users, characters, user_character_profiles, conversations, messages, user_memories, image_generations, user_daily_quotas

详细设计见 `docs/database-design.md`

关键约定：
- 主键统一 uuid
- 时间字段统一 timestamptz
- URL 字段统一 text
- 状态字段用 varchar，代码层维护枚举
- created_at / updated_at 默认 now()

## AI Provider 抽象层

代码必须通过抽象接口调用 AI 能力，不直接依赖具体提供商 SDK：

```typescript
// lib/ai/llm.ts
interface LLMProvider {
  chat(params: {
    systemPrompt: string;
    messages: { role: string; content: string }[];
    stream?: boolean;
  }): AsyncGenerator<string> | Promise<string>;
}

// lib/ai/tts.ts
interface TTSProvider {
  synthesize(params: {
    text: string;
    voiceId?: string;
  }): Promise<Buffer>;
}

// lib/ai/image.ts
interface ImageProvider {
  generateWithRef(params: {
    prompt: string;
    referenceImageUrl: string;
    strength?: number;
  }): Promise<string>;
}
```

开发阶段可用 mock 实现，收尾阶段替换为火山引擎真实实现。

## 角色信息

### 林半夏 (lin-banxia)
- 舒适伴侣型，温暖松弛，自由插画师
- 语气：温暖、真诚、富有画面感
- 好感度升级表现：越来越温柔直接
- 动作描写：全角括号 （轻轻叹气）
- 详细人设见 `docs/characters/lin-banxia.md`

### 黎夏 (li-xia)
- 傲娇毒舌型，独立游戏制作人
- 语气：清冷、语速快、嘴硬心软
- 好感度升级表现：嘴巴越毒，行动越软
- 动作描写：全角括号 （耳根泛红）
- 详细人设见 `docs/characters/li-xia.md`

## 图生图 Prompt 约定

- 基准图存在 `characters.base_image_url`，作为图生图参考锚点
- 场景变体只替换场景描述后缀，角色外貌描述固定
- 参考图强度 0.5-0.7
- 风格限定词：`lifestyle photography, natural, candid`
- 负面提示词：`anime, illustration, 3d render, heavy makeup, studio lighting, formal pose`

## Prompt 模板约定

系统 Prompt 按 7 层顺序组装：
1. 身份锁定（最高优先级）
2. 角色人设（从数据库读取）
3. 好感度状态（动态注入）
4. 记忆注入（从 user_memories 读取）
5. 聊天行为指令（全局共享）
6. 多模态触发指令（全局共享）
7. 输出格式约束（放在最后）

详细模板见 `docs/system-prompt-template.md`

## 消息解析约定

- LLM 输出中 `[SPLIT]` 标记：拆分为多条消息，前端逐条展示
- `[SEND_VOICE]` 标记：后端调用 TTS 生成语音
- `[SEND_PHOTO: 场景描述]` 标记：后端调用图生图生成图片
- 多模态标记解析后再按 [SPLIT] 拆分

## 环境变量

```env
# 数据库
DATABASE_URL=

# BetterAuth
BETTER_AUTH_SECRET=
BETTER_AUTH_URL=

# 火山引擎
VOLC_ACCESS_KEY=
VOLC_SECRET_KEY=
VOLC_LLM_ENDPOINT_ID=
VOLC_TTS_APP_ID=
VOLC_IMAGE_API_KEY=

# Cloudflare R2
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_NAME=
R2_PUBLIC_URL=
```

## 关键业务规则

- 默认关系：刚确定关系不久的恋人
- 图片额度：每用户每天 10 张，所有角色共享
- 好感度初始值：35（跳过初识阶段）
- 记忆提取：每次对话结束后由 LLM 分析，confidence < 0.6 不写入
- 好感度变化：单次对话上限 ±10
- 不做 NSFW、不做多人聊天、不做游戏化功能、不显示好感度数值
