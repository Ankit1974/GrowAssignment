import { Dimensions } from 'react-native';

// Get the screen dimensions once when the app starts
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');


// PERFORMANCE CONFIGURATION CONSTANTS
export const PERFORMANCE_CONFIG = {
  // FlatList optimization settings
  MAX_TO_RENDER_PER_BATCH: 10,    
  WINDOW_SIZE: 10,                 
  INITIAL_NUM_TO_RENDER: 6,        
  REMOVE_CLIPPED_SUBVIEWS: true,   
  
  // Timing delays for user interactions
  DEBOUNCE_DELAY: 300,             
  THROTTLE_DELAY: 16,              
  
  // Cache settings
  IMAGE_CACHE_SIZE: 100,           
  API_CACHE_DURATION: 5 * 60 * 1000, 
  
  // Screen dimensions for responsive design
  SCREEN_WIDTH,                    
  SCREEN_HEIGHT,                   
} as const;


// UTILITY FUNCTIONS FOR PERFORMANCE OPTIMIZATION
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  delay: number
): ((...args: Parameters<T>) => void) => {
  let timeoutId: NodeJS.Timeout;
  
  return (...args: Parameters<T>) => {
    // Clear the previous timeout if it exists
    clearTimeout(timeoutId);
    // Set a new timeout
    timeoutId = setTimeout(() => func(...args), delay);
  };
};

 // Throttle utility for scroll events and other high-frequency events
 
export const throttle = <T extends (...args: any[]) => any>(
  func: T,
  delay: number
): ((...args: Parameters<T>) => void) => {
  let lastCall = 0;
  
  return (...args: Parameters<T>) => {
    const now = Date.now();
    // Only call the function if enough time has passed since last call
    if (now - lastCall >= delay) {
      lastCall = now;
      func(...args);
    }
  };
};

// Memoization helper for expensive calculations
export const memoize = <T extends (...args: any[]) => any>(
  func: T,
  getKey?: (...args: Parameters<T>) => string
): T => {
  const cache = new Map<string, ReturnType<T>>();
  
  return ((...args: Parameters<T>): ReturnType<T> => {
    // Generate a unique key for this set of parameters
    const key = getKey ? getKey(...args) : JSON.stringify(args);
    
    // Return cached result if available
    if (cache.has(key)) {
      return cache.get(key)!;
    }
    
    // Calculate and cache the result
    const result = func(...args);
    cache.set(key, result);
    return result;
  }) as T;
};

 // Helper function to create getItemLayout for FlatList performance
export const getItemLayout = (
  itemHeight: number,
  itemWidth: number,
  numColumns: number = 1
) => (data: any, index: number) => ({
  length: itemHeight,                                    
  offset: itemHeight * Math.floor(index / numColumns),  
  index,                                                 
});


 // Performance monitoring utility
export const measurePerformance = <T extends (...args: any[]) => any>(
  name: string,
  func: T
): T => {
  return ((...args: Parameters<T>): ReturnType<T> => {
    const start = performance.now();
    const result = func(...args);
    const end = performance.now();
    
    // log in development to avoid performance impact in production
    if (__DEV__) {
      console.log(`${name} took ${end - start}ms`);
    }
    
    return result;
  }) as T;
}; 