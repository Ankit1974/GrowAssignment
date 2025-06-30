import { Platform } from 'react-native';
import { ENV } from '../config/environment';

// Environment configuration
const API_CONFIG = {
  BASE_URL: 'https://www.alphavantage.co',
  API_KEY: ENV.ALPHA_VANTAGE_API_KEY,
  TIMEOUT: 10000,
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000,
} as const;

// API endpoints
const ENDPOINTS = {
  TOP_GAINERS_LOSERS: '/query?function=TOP_GAINERS_LOSERS',
} as const;

// Types for API responses
export interface StockItem {
  ticker: string;
  price: string;
  change_amount?: string;
  change_percentage?: string;
}

export interface TopGainersResponse {
  top_gainers?: StockItem[];
  top_losers?: StockItem[];
  last_updated_utc?: string;
}

export interface ApiError {
  message: string;
  code?: string;
  status?: number;
}

// Utility function for delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Data validation 
export const validateStockData = (data: any): StockItem[] => {
  if (!data || !Array.isArray(data)) {
    return [];
  }
  
  return data.filter((item: any) => {
    // Check if item exists and has required properties
    if (!item || typeof item !== 'object') {
      return false;
    }
    
    // Validate ticker 
    if (!item.ticker || typeof item.ticker !== 'string' || item.ticker.trim() === '') {
      return false;
    }
    
    // Validate price 
    if (!item.price || isNaN(parseFloat(item.price))) {
      return false;
    }
    
    // Validate change_amount
    if (item.change_amount !== undefined && isNaN(parseFloat(item.change_amount))) {
      return false;
    }
    
    // Validate change_percentage
    if (item.change_percentage !== undefined && isNaN(parseFloat(item.change_percentage))) {
      return false;
    }
    
    return true;
  });
};

export const validateTopGainersResponse = (data: any): TopGainersResponse | null => {
  if (!data || typeof data !== 'object') {
    return null;
  }
  
  // Check if it's an error response
  if (data['Error Message'] || data['Note']) {
    return null;
  }
  
  return {
    top_gainers: data.top_gainers ? validateStockData(data.top_gainers) : [],
    top_losers: data.top_losers ? validateStockData(data.top_losers) : [],
    last_updated_utc: data.last_updated_utc || undefined,
  };
};

// API service class
class ApiService {
  private async makeRequest<T>(
    endpoint: string, 
    retryCount = 0
  ): Promise<T> {
    try {
      const url = `${API_CONFIG.BASE_URL}${endpoint}&apikey=${API_CONFIG.API_KEY}`;
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), API_CONFIG.TIMEOUT);
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': `GrowAssignment/${Platform.OS}`,
        },
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Check for API-specific errors
      if (data['Error Message']) {
        throw new Error(data['Error Message']);
      }
      
      if (data['Note']) {
        throw new Error(data['Note']);
      }
      
      return data as T;
      
    } catch (error) {
      // Handle timeout and network errors
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new Error('Request timeout');
        }
        
        // Retry logic for network errors
        if (retryCount < API_CONFIG.RETRY_ATTEMPTS && 
            (error.message.includes('network') || error.message.includes('timeout'))) {
          await delay(API_CONFIG.RETRY_DELAY * (retryCount + 1));
          return this.makeRequest<T>(endpoint, retryCount + 1);
        }
      }
      
      throw error;
    }
  }
  
  async getTopGainers(): Promise<StockItem[]> {
    try {
      const response = await this.makeRequest<TopGainersResponse>(ENDPOINTS.TOP_GAINERS_LOSERS);
      const validatedResponse = validateTopGainersResponse(response);
      
      if (!validatedResponse) {
        throw new Error('Invalid response format');
      }
      
      return validatedResponse.top_gainers || [];
      
    } catch (error) {
      console.error('Error fetching top gainers:', error);
      throw new Error(
        error instanceof Error 
          ? error.message 
          : 'Failed to fetch top gainers data'
      );
    }
  }
  
  async getTopLosers(): Promise<StockItem[]> {
    try {
      const response = await this.makeRequest<TopGainersResponse>(ENDPOINTS.TOP_GAINERS_LOSERS);
      const validatedResponse = validateTopGainersResponse(response);
      
      if (!validatedResponse) {
        throw new Error('Invalid response format');
      }
      
      return validatedResponse.top_losers || [];
      
    } catch (error) {
      console.error('Error fetching top losers:', error);
      throw new Error(
        error instanceof Error 
          ? error.message 
          : 'Failed to fetch top losers data'
      );
    }
  }
}


export const apiService = new ApiService(); 