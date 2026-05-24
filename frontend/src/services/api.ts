// API service with typed functions for all backend endpoints
// Based on backend endpoints defined in documentation/postman_reference.md
// Base URL: http://localhost:8000

import axios, { AxiosInstance } from 'axios';
import { toast } from 'sonner';
import type {
  Tenant,
  Property,
  Vendor,
  Manager,
  Request,
  RequestSummary,
  ConversationStartRequest,
  ConversationStartResponse,
  ConversationMessageRequest,
  ConversationMessageResponse,
  ConversationHistoryResponse,
  VoiceTranscribeRequest,
  VoiceTranscribeResponse,
  VoiceStartRequest,
  VoiceStartResponse,
  VoiceRespondRequest,
  VoiceRespondResponse,
  MCPTool,
  MCPToolsResponse,
  ApiResponse,
  ApiError
} from '../types';

// Create axios instance
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
});

// Request interceptor to add auth token if available
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    
    if (status === 401) {
      // Unauthorized - clear token and redirect to login
      localStorage.removeItem('auth_token');
      window.location.href = '/';
    } else if (status && status >= 400 && status < 600) {
      // Show toast for 4xx/5xx errors
      const message = error.response?.data?.detail || error.message || 'An error occurred';
      console.error(`API Error ${status}:`, message);
      
      toast.error(status >= 500 ? 'Server Error' : 'Request Error', {
        description: message,
      });
    }
    
    return Promise.reject(error);
  }
);

// ==================== Root Endpoint ====================

export const getHealth = async () => {
  const response = await apiClient.get('/');
  return response.data;
};

// ==================== Tenants ====================

export const getTenants = async (): Promise<Tenant[]> => {
  const response = await apiClient.get<Tenant[]>('/tenants');
  return response.data;
};

export const getTenantById = async (tenantId: string): Promise<Tenant> => {
  const response = await apiClient.get<Tenant>(`/tenants/${tenantId}`);
  return response.data;
};

export const getTenantsByProperty = async (propertyId: string): Promise<Tenant[]> => {
  const response = await apiClient.get<Tenant[]>(`/tenants?property_id=${propertyId}`);
  return response.data;
};

// ==================== Properties ====================

export const getProperties = async (): Promise<Property[]> => {
  const response = await apiClient.get<Property[]>('/properties');
  return response.data;
};

export const getPropertyById = async (propertyId: string): Promise<Property> => {
  const response = await apiClient.get<Property>(`/properties/${propertyId}`);
  return response.data;
};

// ==================== Vendors ====================

export const getVendors = async (): Promise<Vendor[]> => {
  const response = await apiClient.get<Vendor[]>('/vendors');
  return response.data;
};

export const getVendorById = async (vendorId: string): Promise<Vendor> => {
  const response = await apiClient.get<Vendor>(`/vendors/${vendorId}`);
  return response.data;
};

export const getVendorsByService = async (service: string): Promise<Vendor[]> => {
  const response = await apiClient.get<Vendor[]>(`/vendors/by-service/${service}`);
  return response.data;
};

// ==================== Managers ====================

export const getManagers = async (): Promise<Manager[]> => {
  const response = await apiClient.get<Manager[]>('/managers');
  return response.data;
};

export const getManagerById = async (managerId: string): Promise<Manager> => {
  const response = await apiClient.get<Manager>(`/managers/${managerId}`);
  return response.data;
};

// ==================== Requests ====================

export const getRequests = async (): Promise<Request[]> => {
  const response = await apiClient.get<Request[]>('/requests');
  return response.data;
};

export const getRequestById = async (requestId: string): Promise<Request> => {
  const response = await apiClient.get<Request>(`/requests/${requestId}`);
  return response.data;
};

export const getRequestSummary = async (requestId: string): Promise<RequestSummary> => {
  const response = await apiClient.get<RequestSummary>(`/requests/${requestId}/summary`);
  return response.data;
};

export const getRequestNotifications = async (requestId: string) => {
  const response = await apiClient.get(`/requests/${requestId}/notifications`);
  return response.data;
};

export const createRequest = async (requestData: Partial<Request>): Promise<Request> => {
  const response = await apiClient.post<Request>('/requests', requestData);
  return response.data;
};

export const updateRequest = async (requestId: string, requestData: Partial<Request>): Promise<Request> => {
  const response = await apiClient.patch<Request>(`/requests/${requestId}`, requestData);
  return response.data;
};

// ==================== Conversation ====================

export const startConversation = async (data: ConversationStartRequest): Promise<ConversationStartResponse> => {
  const response = await apiClient.post<ConversationStartResponse>('/conversation/start', data);
  return response.data;
};

export const sendMessage = async (data: ConversationMessageRequest): Promise<ConversationMessageResponse> => {
  const response = await apiClient.post<ConversationMessageResponse>('/conversation/message', data);
  return response.data;
};

export const getConversationHistory = async (requestId: string): Promise<ConversationHistoryResponse> => {
  const response = await apiClient.get<ConversationHistoryResponse>(`/conversation/${requestId}/history`);
  return response.data;
};

// ==================== Voice ====================

export const transcribeAudio = async (audioFile: File): Promise<VoiceTranscribeResponse> => {
  const formData = new FormData();
  formData.append('audio', audioFile);
  
  const response = await apiClient.post<VoiceTranscribeResponse>('/voice/transcribe', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};

export const startVoiceSession = async (data: VoiceStartRequest): Promise<VoiceStartResponse> => {
  const response = await apiClient.post<VoiceStartResponse>('/voice/start', data);
  return response.data;
};

export const respondToVoice = async (data: VoiceRespondRequest): Promise<VoiceRespondResponse> => {
  const response = await apiClient.post<VoiceRespondResponse>('/voice/respond', data);
  return response.data;
};

// ==================== MCP ====================

export const getMCPTools = async (): Promise<MCPToolsResponse> => {
  const response = await apiClient.get<MCPToolsResponse>('/mcp/tools');
  return response.data;
};

// ==================== Authentication (to be implemented in backend) ====================

export const login = async (email: string, password: string, role: 'tenant' | 'manager') => {
  // TODO: Wire to backend authentication endpoint when implemented
  // POST /api/auth/login
  const response = await apiClient.post('/api/auth/login', { email, password, role });
  return response.data;
};

export const logout = async () => {
  // TODO: Wire to backend logout endpoint when implemented
  // POST /api/auth/logout
  const response = await apiClient.post('/api/auth/logout');
  return response.data;
};

export const refreshToken = async () => {
  // TODO: Wire to backend refresh token endpoint when implemented
  // POST /api/auth/refresh
  const response = await apiClient.post('/api/auth/refresh');
  return response.data;
};

// ==================== Export API client for custom requests ====================

export default apiClient;
