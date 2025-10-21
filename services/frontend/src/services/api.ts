/**
 * API Client Service
 * Centralized HTTP client for backend API
 */

import axios, { type AxiosInstance, type AxiosError } from 'axios';
import type { AuthTokens, User, Camera, Recording, StreamInfo, ApiResponse } from '../types';

// Always use full backend URL with /api prefix
const API_BASE_URL = import.meta.env.VITE_API_URL 
  ? `${import.meta.env.VITE_API_URL}/api`
  : 'http://192.168.1.232:3000/api';

class ApiClient {
  private client: AxiosInstance;
  private accessToken: string | null = null;

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 10000,
    });

    // Load token from localStorage
    this.accessToken = localStorage.getItem('accessToken');
    if (this.accessToken) {
      this.setAuthToken(this.accessToken);
    }

    // Response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      this.handleError
    );
  }

  private handleError = async (error: AxiosError) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      this.clearAuthToken();
      window.location.href = '/login';
    }
    return Promise.reject(error);
  };

  setAuthToken(token: string) {
    this.accessToken = token;
    this.client.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    localStorage.setItem('accessToken', token);
  }

  clearAuthToken() {
    this.accessToken = null;
    delete this.client.defaults.headers.common['Authorization'];
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
  }

  // ============ Authentication ============

  async register(username: string, password: string, email?: string): Promise<User> {
    const response = await this.client.post<ApiResponse<User>>('/auth/register', {
      username,
      password,
      email,
    });
    return response.data.data!;
  }

  async login(username: string, password: string): Promise<AuthTokens> {
    const response = await this.client.post<ApiResponse<AuthTokens>>('/auth/login', {
      username,
      password,
    });
    const tokens = response.data.data!;
    this.setAuthToken(tokens.accessToken);
    localStorage.setItem('refreshToken', tokens.refreshToken);
    return tokens;
  }

  async logout(): Promise<void> {
    try {
      await this.client.post('/auth/logout');
    } finally {
      this.clearAuthToken();
    }
  }

  async getProfile(): Promise<User> {
    const response = await this.client.get<ApiResponse<User>>('/auth/me');
    return response.data.data!;
  }

  async changePassword(oldPassword: string, newPassword: string): Promise<void> {
    await this.client.post('/auth/change-password', {
      oldPassword,
      newPassword,
    });
  }

  // ============ Cameras ============

  async getCameras(): Promise<Camera[]> {
    const response = await this.client.get<ApiResponse<Camera[]>>('/cameras');
    return response.data.data || [];
  }

  async getCamera(id: string): Promise<Camera> {
    const response = await this.client.get<ApiResponse<Camera>>(`/cameras/${id}`);
    return response.data.data!;
  }

  async createCamera(camera: Omit<Camera, 'id' | 'status' | 'created_at' | 'updated_at'>): Promise<Camera> {
    const response = await this.client.post<ApiResponse<Camera>>('/cameras', camera);
    return response.data.data!;
  }

  async updateCamera(id: string, updates: Partial<Camera>): Promise<Camera> {
    const response = await this.client.put<ApiResponse<Camera>>(`/cameras/${id}`, updates);
    return response.data.data!;
  }

  async deleteCamera(id: string): Promise<void> {
    await this.client.delete(`/cameras/${id}`);
  }

  // ============ Streams ============

  async getStreamInfo(cameraId: string): Promise<StreamInfo> {
    const response = await this.client.get<ApiResponse<StreamInfo>>(`/streams/camera/${cameraId}`);
    return response.data.data!;
  }

  async getActiveStreams(): Promise<any[]> {
    const response = await this.client.get<ApiResponse<any[]>>('/streams');
    return response.data.data || [];
  }

  async getStreamHealth(): Promise<{ mediamtx: string; timestamp: string }> {
    const response = await this.client.get<ApiResponse<any>>('/streams/health');
    return response.data.data!;
  }

  // ============ Recordings ============

  async getRecordings(params?: {
    cameraId?: string;
    startDate?: string;
    endDate?: string;
    storageTier?: string;
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<{ recordings: Recording[]; pagination: any }> {
    const response = await this.client.get<ApiResponse<Recording[]>>('/recordings', {
      params,
    });
    return {
      recordings: response.data.data || [],
      pagination: (response.data as any).pagination
    };
  }

  async searchRecordings(params?: {
    q?: string;
    cameraId?: string;
    startDate?: string;
    endDate?: string;
    minDuration?: number;
    maxDuration?: number;
    resolution?: string;
    codec?: string;
    page?: number;
    limit?: number;
  }): Promise<{ recordings: Recording[]; pagination: any }> {
    const response = await this.client.get<ApiResponse<Recording[]>>('/recordings/search', {
      params,
    });
    return {
      recordings: response.data.data || [],
      pagination: (response.data as any).pagination
    };
  }

  async getRecording(id: string): Promise<Recording> {
    const response = await this.client.get<ApiResponse<Recording>>(`/recordings/${id}`);
    return response.data.data!;
  }

  async downloadRecording(id: string): Promise<Blob> {
    const response = await this.client.get(`/recordings/${id}/download`, {
      responseType: 'blob'
    });
    return response.data;
  }

  async deleteRecording(id: string): Promise<void> {
    await this.client.delete(`/recordings/${id}`);
  }

  async syncRecordings(): Promise<any> {
    const response = await this.client.post<ApiResponse<any>>('/recordings/sync');
    return response.data.data;
  }

  async getRecordingStats(): Promise<any> {
    const response = await this.client.get<ApiResponse<any>>('/recordings/stats');
    return response.data.data;
  }

  // ============ System Monitoring ============

  async getSystemStatus(): Promise<any> {
    const response = await this.client.get<ApiResponse<any>>('/system/status');
    return response.data.data;
  }

  async getSystemStats(): Promise<any> {
    const response = await this.client.get<ApiResponse<any>>('/system/stats');
    return response.data.data;
  }

  async getCPUStats(): Promise<any> {
    const response = await this.client.get<ApiResponse<any>>('/system/cpu');
    return response.data.data;
  }

  async getGPUStats(): Promise<any> {
    const response = await this.client.get<ApiResponse<any>>('/system/gpu');
    return response.data.data;
  }

  async getDiskStats(): Promise<any> {
    const response = await this.client.get<ApiResponse<any>>('/system/disk');
    return response.data.data;
  }

  // ============ Users ============

  async getUsers(params?: {
    role?: string;
    active?: boolean;
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<{ users: User[]; total: number }> {
    const response = await this.client.get<ApiResponse<{ users: User[]; total: number }>>('/users', { params });
    return response.data.data!;
  }

  async getUser(id: string): Promise<User> {
    const response = await this.client.get<ApiResponse<User>>(`/users/${id}`);
    return response.data.data!;
  }

  async createUser(user: {
    username: string;
    email: string;
    password: string;
    full_name?: string;
    role?: string;
  }): Promise<User> {
    const response = await this.client.post<ApiResponse<User>>('/users', user);
    return response.data.data!;
  }

  async updateUser(id: string, updates: {
    email?: string;
    full_name?: string;
    role?: string;
    active?: boolean;
    password?: string;
  }): Promise<User> {
    const response = await this.client.put<ApiResponse<User>>(`/users/${id}`, updates);
    return response.data.data!;
  }

  async deleteUser(id: string): Promise<void> {
    await this.client.delete(`/users/${id}`);
  }

  async changeUserRole(id: string, role: string): Promise<User> {
    const response = await this.client.put<ApiResponse<User>>(`/users/${id}/role`, { role });
    return response.data.data!;
  }

  // ============ Health Check ============

  async healthCheck(): Promise<any> {
    const response = await this.client.get('/health');
    return response.data;
  }
}

// Singleton instance
export const apiClient = new ApiClient();
export default apiClient;
