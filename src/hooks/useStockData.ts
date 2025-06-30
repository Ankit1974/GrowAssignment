import { useState, useCallback, useRef } from 'react';
import { apiService, StockItem } from '../services/api';

interface UseStockDataState {
  data: StockItem[];       
  loading: boolean;         
  refreshing: boolean;    
  error: string | null;     
}

interface UseStockDataReturn extends UseStockDataState {
  fetchData: (isRefreshing?: boolean) => Promise<void>;    // Function to fetch data
  onRefresh: () => void;                                  // Function to handle refresh
}

/**
 * Custom hook for managing stock data fetching and state
 * 
 * - API calls to fetch stock data
 * - Loading states 
 * - Error handling and display
 * - State management for the UI
 * 
 * @param fetchFunction - 
 * @param emptyStateMessage - 
 * @returns 
 */
export const useStockData = (
  fetchFunction: () => Promise<StockItem[]>,
  emptyStateMessage: string
): UseStockDataReturn => {
  // state with default values
  const [state, setState] = useState<UseStockDataState>({
    data: [],           
    loading: true,      
    refreshing: false,  
    error: null,        
  });

  // Use refs to store the latest values without causing re-renders
  const fetchFunctionRef = useRef(fetchFunction);
  fetchFunctionRef.current = fetchFunction;

  // Store the latest emptyStateMessage in a ref
  const emptyStateMessageRef = useRef(emptyStateMessage);
  emptyStateMessageRef.current = emptyStateMessage;

  /**
   *  function to fetch data from the API
   * Handles loading states, error handling, and data updates
   * 
   * @param isRefreshing 
   */
  const fetchData = useCallback(async (isRefreshing = false) => {
    try {
      
      setState(prev => ({ ...prev, error: null }));
      
      // Call the API function to get stock data
      const data = await fetchFunctionRef.current();
      
      // Update state with the new data
      setState(prev => ({
        ...prev,
        data,                    
        loading: false,          
        refreshing: false,      
        error: data.length === 0 ? emptyStateMessageRef.current : null, 
      }));
    } catch (error) {
      // Handle any errors that occurred during the API call
      setState(prev => ({
        ...prev,
        data: [],               
        loading: false,         
        refreshing: false,      
        error: error instanceof Error 
          ? error.message       
          : 'Failed to load data. Please try again.', 
      }));
    }
  }, []); 


   // Function to handle pull-to-refresh
   
  const onRefresh = useCallback(() => {
    setState(prev => ({ ...prev, refreshing: true })); 
    fetchData(true); 
  }, [fetchData]);

  
  return {
    ...state,    
    fetchData,   
    onRefresh,   
  };
};  



 // Hook sfetching top gainers data
 
export const useTopGainers = () => {
  // Memoize the fetch function to prevent it from changing on every render
  const fetchTopGainers = useCallback(() => apiService.getTopGainers(), []);
  
  return useStockData(
    fetchTopGainers,                           // Function to fetch top gainers
    'No top gainers available at the moment'   // Message when no data
  );
};


 // Hook for fetching top losers data
 
export const useTopLosers = () => {
  // Memoize the fetch function to prevent it from changing on every render
  const fetchTopLosers = useCallback(() => apiService.getTopLosers(), []);
  
  return useStockData(
    fetchTopLosers,                           // Function to fetch top losers
    'No top losers available at the moment'   // Message when no data
  );
}; 