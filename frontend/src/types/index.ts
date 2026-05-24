// TypeScript interfaces matching backend Pydantic models
// Based on backend/src/core_specs/configuration/config_file.json and backend endpoints

// ==================== Common Types ====================

export type Status = "pending" | "in_progress" | "escalated" | "resolved" | "pending_approval" | "pending_review";
export type Urgency = "low" | "medium" | "high";

// ==================== Tenant ====================

export interface Tenant {
  id: string;
  name: string;
  unit: string;
  property: string;
  property_id?: string;
  email?: string;
  phone?: string;
}

// ==================== Property ====================

export interface Property {
  id: string;
  name: string;
  address: string;
  city?: string;
  state?: string;
  zip?: string;
  country?: string;
  year_built?: number;
  property_type?: string;
  unit_count?: number;
  manager_id?: string;
  owner_id?: string;
}

// ==================== Vendor ====================

export interface Vendor {
  id: string;
  name: string;
  email: string;
  phone: string;
  services: string[];
  emergency_available: boolean;
  rating?: number;
  response_time?: string;
}

// ==================== Manager ====================

export interface Manager {
  id: string;
  name: string;
  email: string;
  phone: string;
  department?: string;
  managed_properties: string[];
  start_date?: string;
}

// ==================== Request ====================

export interface Party {
  id: string;
  name: string;
  role: string;
}

export interface ConversationMessage {
  id: string;
  role: "ai" | "tenant" | "manager";
  text: string;
  timestamp: string;
}

export interface NotificationEvent {
  id: string;
  channel: "email" | "sms";
  recipient: string;
  timestamp: string;
  summary: string;
}

export interface Request {
  id: string;
  type: string;
  description: string;
  tenant_id: string;
  tenant_name?: string;
  property: string;
  property_id?: string;
  urgency: Urgency;
  status: Status;
  created_at: string;
  updated_at?: string;
  parties: Party[];
  conversation: ConversationMessage[];
  notifications: NotificationEvent[];
  vendor_id?: string;
  vendor_name?: string;
  escalated?: boolean;
  is_complete?: boolean;
}

// ==================== Conversation ====================

export interface ConversationStartRequest {
  tenant_id: string;
  message: string;
}

export interface ConversationStartResponse {
  request_id: string;
  ai_response: string;
  conversation: ConversationMessage[];
}

export interface ConversationMessageRequest {
  request_id: string;
  tenant_id: string;
  message: string;
}

export interface ConversationMessageResponse {
  ai_response: string;
  conversation: ConversationMessage[];
  request_status?: Status;
  urgency?: Urgency;
  escalated?: boolean;
  is_complete?: boolean;
}

export interface ConversationHistoryResponse {
  request_id: string;
  conversation: ConversationMessage[];
}

// ==================== Voice ====================

export interface VoiceTranscribeRequest {
  audio: File;
}

export interface VoiceTranscribeResponse {
  transcript: string;
}

export interface VoiceStartRequest {
  tenant_id: string;
}

export interface VoiceStartResponse {
  request_id: string;
  greeting_text: string;
  greeting_audio_base64: string;
  tenant_name: string;
  property_name: string;
}

export interface VoiceRespondRequest {
  request_id: string;
  tenant_id: string;
  transcript: string;
}

export interface VoiceRespondResponse {
  reply_text: string;
  audio_base64: string;
  status: Status;
  urgency: Urgency;
  escalated: boolean;
  is_complete: boolean;
}

// ==================== MCP ====================

export interface MCPTool {
  name: string;
  description: string;
  category: string;
}

export interface MCPToolsResponse {
  tools: MCPTool[];
}

// ==================== API Response Types ====================

export interface ApiResponse<T> {
  data: T;
  message?: string;
}

export interface ApiError {
  detail: string;
  status?: number;
}

// ==================== Request Summary ====================

export interface RequestSummary {
  id: string;
  type: string;
  description: string;
  status: Status;
  urgency: Urgency;
  created_at: string;
  updated_at: string;
  tenant: {
    id: string;
    name: string;
    unit: string;
  };
  property: {
    id: string;
    name: string;
    address: string;
  };
  assigned_vendor?: {
    id: string;
    name: string;
    service: string;
  };
  conversation_count: number;
  notification_count: number;
}

// ==================== Notification Preferences ====================

export interface NotificationPreferences {
  email: {
    enabled: boolean;
    request_updates: boolean;
    escalation_alerts: boolean;
    resolution_notices: boolean;
    vendor_assignments: boolean;
  };
  sms: {
    enabled: boolean;
    emergency_only: boolean;
    request_updates: boolean;
    escalation_alerts: boolean;
  };
  push: {
    enabled: boolean;
    request_updates: boolean;
    escalation_alerts: boolean;
    resolution_notices: boolean;
  };
}
