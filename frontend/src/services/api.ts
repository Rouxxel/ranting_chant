// API service with typed functions for all backend endpoints
// Based on backend endpoints defined in documentation/postman_reference.md
// Base URL: http://localhost:8000

import axios, { AxiosInstance } from 'axios';
import { toast } from 'sonner';

// Allow individual requests to opt out of the generic error toast so the
// caller can show its own field-specific message (e.g. profile validation).
declare module 'axios' {
  export interface AxiosRequestConfig {
    suppressErrorToast?: boolean;
  }
}
import type {
  Tenant,
  Property,
  Vendor,
  Manager,
  Owner,
  Request,
  RequestType,
  RequestSummary,
  ConversationStartRequest,
  ConversationStartResponse,
  ConversationMessageRequest,
  ConversationMessageResponse,
  ConversationHistoryResponse,
  VoiceTranscribeRequest,
  VoiceTranscribeResponse,
  VoiceProviderId,
  VoiceProviderVoicesResponse,
  VoiceProvidersResponse,
  VoiceStartRequest,
  VoiceStartResponse,
  VoiceRespondRequest,
  VoiceRespondResponse,
  MCPTool,
  MCPToolsResponse,
  ApiResponse,
  ApiError,
  PropertyCreateRequest,
  PropertyUpdateRequest,
  TenantCreateRequest,
  TenantUpdateRequest,
  VendorCreateRequest,
  VendorUpdateRequest,
  ProfileUpdateRequest,
  RequestCancelRequest,
  RequestCompleteRequest
} from '../types';

// Fallback endpoints from environment variables
const ENDPOINTS = [
  import.meta.env.VITE_LOCAL_BACKEND || 'http://localhost:8000',
  import.meta.env.VITE_PROD_BACKEND || 'https://ranting-chant.onrender.com'
];

let currentEndpointIndex = 0;
let hasShownConnectionError = false;

// Create axios instance with initial endpoint
const apiClient: AxiosInstance = axios.create({
  baseURL: ENDPOINTS[0],
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

// Response interceptor with fallback logic
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // If the error is a network error or 5xx, try the next endpoint
    if ((error.code === 'ERR_NETWORK' || !error.response) && !originalRequest._retry) {
      originalRequest._retry = true;

      // Try next endpoint
      const nextIndex = (currentEndpointIndex + 1) % ENDPOINTS.length;
      
      if (nextIndex !== currentEndpointIndex) {
        currentEndpointIndex = nextIndex;
        originalRequest.baseURL = ENDPOINTS[currentEndpointIndex];
        console.log(`Retrying with endpoint: ${ENDPOINTS[currentEndpointIndex]}`);
        
        try {
          return await apiClient(originalRequest);
        } catch (retryError) {
          // If retry also fails, show error message
          if (!hasShownConnectionError) {
            hasShownConnectionError = true;
            toast.error('Connection Error', {
              description: 'We are having some troubles, please try again later',
              duration: 10000,
            });
            
            // Reset flag after 30 seconds to allow showing error again
            setTimeout(() => {
              hasShownConnectionError = false;
            }, 30000);
          }
          return Promise.reject(retryError);
        }
      }
    }

    // If we've tried all endpoints or it's a different error, show error
    if (!hasShownConnectionError && (error.code === 'ERR_NETWORK' || !error.response)) {
      hasShownConnectionError = true;
      toast.error('Connection Error', {
        description: 'We are having some troubles, please try again later',
        duration: 10000,
      });
      
      // Reset flag after 30 seconds to allow showing error again
      setTimeout(() => {
        hasShownConnectionError = false;
      }, 30000);
    }

    const status = error.response?.status;
    
    if (status === 401) {
      // Unauthorized - clear token and redirect to login
      localStorage.removeItem('auth_token');
      window.location.href = '/';
    } else if (status && status >= 400 && status < 600) {
      const message = error.response?.data?.detail || error.message || 'An error occurred';
      console.error(`API Error ${status}:`, message);

      // Skip the generic toast when the caller handles its own messaging
      if (!error.config?.suppressErrorToast) {
        toast.error(status >= 500 ? 'Server Error' : 'Request Error', {
          description: message,
        });
      }
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

export const createTenant = async (data: TenantCreateRequest): Promise<Tenant> => {
  const response = await apiClient.post<Tenant>('/tenants', data);
  return response.data;
};

export const updateTenant = async (tenantId: string, data: TenantUpdateRequest): Promise<Tenant> => {
  const response = await apiClient.patch<Tenant>(`/tenants/${tenantId}`, data);
  return response.data;
};

export const updateTenantProfile = async (tenantId: string, data: ProfileUpdateRequest): Promise<Tenant> => {
  const response = await apiClient.patch<Tenant>(`/tenants/${tenantId}/profile`, data, { suppressErrorToast: true });
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

export const createProperty = async (data: PropertyCreateRequest): Promise<Property> => {
  const response = await apiClient.post<Property>('/properties', data);
  return response.data;
};

export const updateProperty = async (propertyId: string, data: PropertyUpdateRequest): Promise<Property> => {
  const response = await apiClient.patch<Property>(`/properties/${propertyId}`, data);
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

export const createVendor = async (data: VendorCreateRequest): Promise<Vendor> => {
  const response = await apiClient.post<Vendor>('/vendors', data);
  return response.data;
};

export const updateVendor = async (vendorId: string, data: VendorUpdateRequest): Promise<Vendor> => {
  const response = await apiClient.patch<Vendor>(`/vendors/${vendorId}`, data);
  return response.data;
};

export const deleteVendor = async (vendorId: string): Promise<void> => {
  await apiClient.delete(`/vendors/${vendorId}`);
};

export const deleteTenant = async (tenantId: string): Promise<void> => {
  await apiClient.delete(`/tenants/${tenantId}`);
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

export const updateManagerProfile = async (managerId: string, data: ProfileUpdateRequest): Promise<Manager> => {
  const response = await apiClient.patch<Manager>(`/managers/${managerId}/profile`, data, { suppressErrorToast: true });
  return response.data;
};

export const getOwners = async (): Promise<Owner[]> => {
  const response = await apiClient.get<Owner[]>('/owners');
  return response.data;
};

export const updateOwnerProfile = async (ownerId: string, data: ProfileUpdateRequest): Promise<Owner> => {
  const response = await apiClient.patch<Owner>(`/owners/${ownerId}/profile`, data, { suppressErrorToast: true });
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

export const cancelRequest = async (requestId: string, data: RequestCancelRequest): Promise<Request> => {
  const response = await apiClient.post<Request>(`/requests/${requestId}/cancel`, data);
  return response.data;
};

export const completeRequest = async (requestId: string, data: RequestCompleteRequest): Promise<Request> => {
  const response = await apiClient.post<Request>(`/requests/${requestId}/complete`, data);
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

export const saveConversation = async (data: {
  session_id: string;
  tenant_id: string;
  conversation_history: any[];
  metadata: {
    type?: RequestType;
    description?: string;
    urgency?: string;
    escalated?: boolean;
    sentiment?: string;
    confidence?: number;
    vendor_id?: string;
    property_id?: string;
  };
}): Promise<Request> => {
  const response = await apiClient.post<Request>('/conversation/save-conversation', data);
  return response.data;
};

export const sendRequestNotifications = async (requestId: string): Promise<Request> => {
  const response = await apiClient.post<Request>(`/requests/${requestId}/send-notifications`);
  return response.data;
};

// ==================== Voice ====================

export const getVoiceProviders = async (): Promise<VoiceProvidersResponse> => {
  const response = await apiClient.get<VoiceProvidersResponse>('/voice/providers');
  return response.data;
};

export const getVoiceProviderVoices = async (provider: VoiceProviderId): Promise<VoiceProviderVoicesResponse> => {
  const response = await apiClient.get<VoiceProviderVoicesResponse>('/voice/voices', {
    params: { provider },
  });
  return response.data;
};

export const transcribeAudio = async (audioFile: File, provider?: VoiceProviderId): Promise<VoiceTranscribeResponse> => {
  const formData = new FormData();
  formData.append('audio', audioFile);
  if (provider) {
    formData.append('provider', provider);
  }
  
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
