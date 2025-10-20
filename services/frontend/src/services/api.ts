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
    camera_id?: string;
    start_time?: string;
    end_time?: string;
  }): Promise<Recording[]> {
    const response = await this.client.get<ApiResponse<Recording[]>>('/recordings', {
      params,
    });
    return response.data.data || [];
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
