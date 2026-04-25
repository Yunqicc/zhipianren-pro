export type UserStatus = "active" | "disabled" | "deleted";
export type RelationshipStage = "new_couple";
export type ConversationStatus = "active" | "archived";
export type SenderType = "user" | "character" | "system";
export type MessageType = "text" | "audio" | "image" | "mixed";
export type GenerationStatus = "pending" | "completed" | "failed";
export type ImageTriggerType = "auto" | "user_request";
export type ImageGenerationStatus = "pending" | "success" | "failed";
export type QuotaType = "image_generation";

export interface User {
  id: string;
  email: string;
  passwordHash: string;
  nickname: string | null;
  avatarUrl: string | null;
  status: UserStatus;
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt: Date | null;
}

export interface Character {
  id: string;
  code: string;
  name: string;
  subtitle: string | null;
  avatarUrl: string | null;
  coverImageUrl: string | null;
  baseImageUrl: string | null;
  personaSummary: string | null;
  systemPromptTemplate: string | null;
  voiceProfile: string | null;
  sortOrder: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserCharacterProfile {
  id: string;
  userId: string;
  characterId: string;
  relationshipStage: RelationshipStage;
  affectionScore: number | null;
  emotionState: string | null;
  lastInteractionAt: Date | null;
  memoryVersion: number | null;
  isFavorite: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Conversation {
  id: string;
  userCharacterProfileId: string;
  title: string | null;
  status: ConversationStatus;
  startedAt: Date;
  lastMessageAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Message {
  id: string;
  conversationId: string;
  senderType: SenderType;
  messageType: MessageType;
  contentText: string | null;
  audioUrl: string | null;
  audioDurationMs: number | null;
  imageUrl: string | null;
  replyToMessageId: string | null;
  sequenceNo: number;
  triggerReason: string | null;
  generationStatus: GenerationStatus;
  modelName: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: Date;
}

export interface UserMemory {
  id: string;
  userCharacterProfileId: string;
  memoryKey: string;
  memoryLabel: string;
  memoryValue: string;
  sourceMessageId: string | null;
  confidenceScore: number | null;
  isActive: boolean;
  lastConfirmedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ImageGeneration {
  id: string;
  userCharacterProfileId: string;
  messageId: string | null;
  triggerType: ImageTriggerType;
  triggerReason: string | null;
  promptText: string | null;
  referenceImageUrl: string | null;
  resultImageUrl: string | null;
  providerName: string | null;
  modelName: string | null;
  status: ImageGenerationStatus;
  errorMessage: string | null;
  createdAt: Date;
  completedAt: Date | null;
}

export interface UserDailyQuota {
  id: string;
  userId: string;
  quotaDate: Date;
  quotaType: QuotaType;
  dailyLimit: number;
  usedCount: number;
  resetAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}
