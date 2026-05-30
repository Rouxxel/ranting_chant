// TypeScript interfaces matching backend Pydantic models
// Based on backend/src/core_specs/configuration/config_file.json and backend endpoints

// ==================== Common Types ====================

export type Status = "pending" | "in_progress" | "escalated" | "resolved" | "pending_approval" | "pending_review" | "cancelled";
export type Urgency = "low" | "medium" | "high";
export const REQUEST_TYPES = [
  "plumbing",
  "electrical",
  "hvac",
  "appliance",
  "pest_control",
  "lockout",
  "access_control",
  "noise",
  "lease_question",
  "rent_payment",
  "emergency",
  "general",
] as const;

export type RequestType = (typeof REQUEST_TYPES)[number];

export const requestTypeLabels: Record<RequestType, string> = {
  plumbing: "Plumbing",
  electrical: "Electrical",
  hvac: "HVAC",
  appliance: "Appliance",
  pest_control: "Pest Control",
  lockout: "Lockout",
  access_control: "Access Control",
  noise: "Noise",
  lease_question: "Lease Question",
  rent_payment: "Rent Payment",
  emergency: "Emergency",
  general: "General",
};

export function getRequestTypeLabel(type: RequestType | string) {
  return requestTypeLabels[type as RequestType] ?? type.replace(/_/g, " ");
}

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

export const PROPERTY_TYPES = [
  "apartment_building",
  "condominium",
  "single_family_home",
  "townhouse",
  "commercial",
  "mixed_use",
  "industrial",
  "retail",
  "office",
] as const;

export type PropertyType = (typeof PROPERTY_TYPES)[number];

export const propertyTypeLabels: Record<PropertyType, string> = {
  apartment_building: "Apartment Building",
  condominium: "Condominium",
  single_family_home: "Single Family Home",
  townhouse: "Townhouse",
  commercial: "Commercial",
  mixed_use: "Mixed Use",
  industrial: "Industrial",
  retail: "Retail",
  office: "Office",
};

export function getPropertyTypeLabel(type: PropertyType | string) {
  return propertyTypeLabels[type as PropertyType] ?? type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

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

// ==================== Owner ====================

export interface Owner {
  id: string;
  name: string;
  email: string;
  phone: string;
  owned_properties: string[];
}

// ==================== Request ====================

export interface Party {
  id: string;
  name: string;
  role: string;
}

export interface ConversationMessage {
  id?: string;
  role: "ai" | "tenant" | "manager";
  message: string;
  timestamp: string;
  web_results?: WebSearchResponse;
}

export interface NotificationEvent {
  id?: string;
  type: "email" | "sms";
  recipient: string;
  status?: string;
  timestamp: string;
  summary?: string;
  recipient_type?: string;
}

export interface Request {
  id: string;
  type: RequestType;
  description: string;
  requester_id: string;
  tenant_name?: string;
  property: string;
  property_id?: string;
  urgency: Urgency;
  status: Status;
  created_at: string;
  updated_at?: string;
  cancelled_at?: string;
  involved_parties: string[];
  conversation_history: ConversationMessage[];
  notifications_sent: NotificationEvent[];
  vendor_id?: string;
  vendor_name?: string;
  escalated?: boolean;
  sentiment?: string;
  confidence?: number;
  is_complete?: boolean;
  summary?: string;
}

// ==================== Conversation ====================

export interface ConversationStartRequest {
  tenant_id: string;
  message: string;
}

export interface ConversationStartResponse {
  session_id: string;
  greeting: string;
  tenant_name: string;
  property_name: string;
}

export interface ConversationMessageRequest {
  request_id: string;
  tenant_id: string;
  message: string;
  enable_web?: boolean;
}

export interface ConversationMessageResponse {
  request_id: string;
  reply: string;
  status: Status;
  type?: RequestType;
  urgency: Urgency;
  escalated: boolean;
  is_complete: boolean;
  web_results?: WebSearchResponse;
}

export interface ConversationHistoryResponse {
  request_id: string;
  conversation: ConversationMessage[];
}

export interface RequestSummary {
  request_id: string;
  summary: string;
  key_points: string[];
  recommended_actions: string[];
}

export interface WebSearchResultItem {
  title: string;
  url: string;
  content_snippet: string;
  score?: number | null;
}

export interface WebSearchResponse {
  query: string;
  answer?: string | null;
  results: WebSearchResultItem[];
}

// ==================== Voice ====================

export type VoiceProviderId = "elevenlabs" | "gradium";

export interface Voice {
  id: string;
  name: string;
  provider: VoiceProviderId;
}

export interface VoiceProviderCapability {
  id: VoiceProviderId;
  display_name: string;
  configured: boolean;
  enabled: boolean;
  supports: {
    tts: boolean;
    stt: boolean;
    streaming_tts: boolean;
  };
  voices: Voice[];
}

export interface VoiceProvidersResponse {
  default_provider: VoiceProviderId;
  providers: VoiceProviderCapability[];
}

export interface VoiceProviderVoicesResponse {
  provider: VoiceProviderId;
  voices: Voice[];
}

export interface VoiceTranscribeRequest {
  audio: File;
  provider?: VoiceProviderId;
}

export interface VoiceTranscribeResponse {
  transcript: string;
}

export interface VoiceStartRequest {
  tenant_id: string;
  provider?: VoiceProviderId;
  voice_id?: string;
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
  provider?: VoiceProviderId;
  voice_id?: string;
}

export interface VoiceRespondResponse {
  reply_text: string;
  audio_base64: string;
  status: Status;
  type?: RequestType;
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
  type: RequestType;
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

// ==================== Request Payload Types ====================

export interface PropertyCreateRequest {
  name: string;
  address: string;
  year_built?: number;
  property_type?: string;
  unit_count?: number;
  owner_id?: string;
  manager_id?: string;
  tenant_ids?: string[];
}

export interface PropertyUpdateRequest {
  name?: string;
  address?: string;
  year_built?: number;
  property_type?: string;
  unit_count?: number;
  owner_id?: string;
  manager_id?: string;
  tenant_ids?: string[];
}

export interface TenantCreateRequest {
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  unit: string;
  property_id: string;
}

export interface TenantUpdateRequest {
  name?: string;
  email?: string;
  phone?: string;
  address?: string;
  unit?: string;
  property_id?: string;
}

export interface VendorCreateRequest {
  name: string;
  email: string;
  phone: string;
  services: string[];
  emergency_available?: boolean;
}

export interface VendorUpdateRequest {
  name?: string;
  email?: string;
  phone?: string;
  services?: string[];
  emergency_available?: boolean;
}

export interface ProfileUpdateRequest {
  name?: string;
  email?: string;
  phone?: string;
}

export interface RequestCancelRequest {
  cancelled_by: string;
  cancellation_reason?: string;
}

export interface RequestCompleteRequest {
  resolved_by: string;
  resolution_note?: string;
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
