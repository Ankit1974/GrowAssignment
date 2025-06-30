import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Dimensions, StatusBar, Animated } from 'react-native';
import { useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { LineChart } from 'react-native-chart-kit';
import { useTheme } from '../ThemeContext';
import { ExploreStackParamList } from '../types/navigation';
import LinearGradient from 'react-native-linear-gradient';
import { ENV } from '../config/environment';
// import { LineChart } from 'react-native-svg-charts';

// ============================================================================
// TYPES AND INTERFACES
// ============================================================================

/**
 * Interface for stock overview data returned from Alpha Vantage API
 * Contains all the fundamental information about a stock
 */
interface StockDetails {
  Symbol: string;           // Stock symbol (e.g., AAPL)
  Name: string;             // Company name (e.g., Apple Inc.)
  Exchange: string;         // Stock exchange (e.g., NASDAQ)
  Country: string;          // Company country
  Description: string;      // Company description
  Industry: string;         // Industry classification
  Sector: string;           // Sector classification
  '50DayMovingAverage': string;  // 50-day moving average price
  '52WeekLow': string;      // 52-week low price
  '52WeekHigh': string;     // 52-week high price
  MarketCapitalization: string;  // Market cap in USD
  PERatio: string;          // Price-to-Earnings ratio
  Beta: string;             // Beta coefficient (volatility measure)
  DividendYield: string;    // Dividend yield percentage
  ProfitMargin: string;     // Profit margin percentage
  ReturnOnEquityTTM: string; // Return on equity (trailing twelve months)
}

/**
 * Configuration for different chart time ranges
 * Maps to Alpha Vantage API parameters
 */
interface ChartConfig {
  function: string;         // API function name (TIME_SERIES_INTRADAY, TIME_SERIES_DAILY)
  interval: string;         // Time interval for intraday data (5min, 15min, etc.)
  dataPoints: number;       // Number of data points to fetch
}

/**
 * Time range options for chart display
 * Used for UI buttons and data fetching
 */
interface TimeRange {
  label: string;            // Display label (1D, 1W, etc.)
  value: string;            // Human readable value (1 Day, 1 Week, etc.)
  index: number;            // Array index for mapping to chart configs
}

// ============================================================================
// CONSTANTS AND CONFIGURATION
// ============================================================================

// Alpha Vantage API configuration
const API_BASE_URL = 'https://www.alphavantage.co/query';
const API_KEY = ENV.ALPHA_VANTAGE_API_KEY; // Get API key from environment variables

// Validate API key and warn if using demo key
if (!API_KEY || API_KEY === 'demo') {
  console.warn('Warning: Using demo API key. Please set ALPHA_VANTAGE_API_KEY in your environment variables.');
}

/**
 * Available time ranges for chart display
 * Each range maps to a specific chart configuration
 */
const TIME_RANGES: TimeRange[] = [
  { label: '1D', value: '1 Day', index: 0 },      // Intraday data
  { label: '1W', value: '1 Week', index: 1 },     // 7 days of daily data
  { label: '1M', value: '1 Month', index: 2 },    // 30 days of daily data
  { label: '3M', value: '3 Months', index: 3 },   // 90 days of daily data
  { label: '6M', value: '6 Months', index: 4 },   // 180 days of daily data
  { label: '1Y', value: '1 Year', index: 5 },     // 365 days of daily data
];

/**
 * Chart configurations for each time range
 * Maps to Alpha Vantage API functions and parameters
 */
const CHART_CONFIGS: ChartConfig[] = [
  { function: 'TIME_SERIES_INTRADAY', interval: '5min', dataPoints: 78 },  // 1D: 5-min intervals
  { function: 'TIME_SERIES_DAILY', interval: '', dataPoints: 7 },          // 1W: 7 days
  { function: 'TIME_SERIES_DAILY', interval: '', dataPoints: 30 },         // 1M: 30 days
  { function: 'TIME_SERIES_DAILY', interval: '', dataPoints: 90 },         // 3M: 90 days
  { function: 'TIME_SERIES_DAILY', interval: '', dataPoints: 180 },        // 6M: 180 days
  { function: 'TIME_SERIES_DAILY', interval: '', dataPoints: 365 },        // 1Y: 365 days
];

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Formats market capitalization to human-readable format
 * Converts large numbers to T (trillion), B (billion), M (million)
 * 
 * @param marketCap - Market cap as string from API
 * @returns Formatted string (e.g., "2.5T", "1.2B", "500M")
 */
const formatMarketCap = (marketCap: string): string => {
  if (!marketCap) return '-';
  const num = parseFloat(marketCap);
  if (num >= 1e12) return `${(num / 1e12).toFixed(1)}T`;  // Trillion
  if (num >= 1e9) return `${(num / 1e9).toFixed(1)}B`;    // Billion
  if (num >= 1e6) return `${(num / 1e6).toFixed(1)}M`;    // Million
  return marketCap;
};

/**
 * Formats percentage values with 2 decimal places
 * 
 * @param value - Percentage value as string
 * @returns Formatted percentage string (e.g., "2.50%")
 */
const formatPercentage = (value: string): string => {
  if (!value) return '-';
  const num = parseFloat(value);
  return `${num.toFixed(2)}%`;
};

// ============================================================================
// API SERVICE
// ============================================================================

// Simple in-memory cache to avoid duplicate API calls
const cache = new Map();

/**
 * Fetches stock overview data from Alpha Vantage API
 * This function handles the API call and error handling for stock details
 * 
 * @param symbol - Stock symbol (e.g., AAPL)
 * @returns Promise with stock details data
 */
const fetchData = async (symbol: string): Promise<StockDetails> => {
  try {
    const url = `${API_BASE_URL}?function=OVERVIEW&symbol=${symbol}&apikey=${API_KEY}`;
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Check for API errors (Alpha Vantage returns errors in specific fields)
    if (data['Error Message'] || data['Note']) {
      throw new Error(data['Error Message'] || data['Note']);
    }
    
    return data as StockDetails;
  } catch (error) {
    throw new Error(`Failed to fetch stock overview: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

/**
 * API service object containing methods for fetching stock data
 * Includes caching to improve performance and reduce API calls
 */
const stockApiService = {
  /**
   * Fetches stock overview data with caching
   * Returns cached data if available, otherwise fetches from API
   * 
   * @param symbol - Stock symbol
   * @returns Promise with stock details
   */
  async fetchStockOverview(symbol: string): Promise<StockDetails> {
    const cacheKey = `overview_${symbol}`;
    
    // Return cached data if available
    if (cache.has(cacheKey)) {
      return cache.get(cacheKey);
    }
    
    // Fetch new data and cache it
    const data = await fetchData(symbol);
    cache.set(cacheKey, data);
    return data;
  },

  /**
   * Fetches chart data for a specific time range
   * Handles different API functions (intraday vs daily) and data processing
   * 
   * @param symbol - Stock symbol
   * @param config - Chart configuration (time range, interval, etc.)
   * @returns Promise with array of price data points
   */
  async fetchChartData(symbol: string, config: ChartConfig): Promise<number[]> {
    try {
      // Build API URL based on configuration
      let url = `${API_BASE_URL}?function=${config.function}&symbol=${symbol}&apikey=${API_KEY}`;
      
      // Add interval parameter for intraday data
      if (config.interval) {
        url += `&interval=${config.interval}`;
      }

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Check for API errors
      if (data['Error Message'] || data['Note']) {
        throw new Error(data['Error Message'] || data['Note']);
      }
      
      let prices: number[] = [];
      
      // Process intraday data (1D charts)
      if (config.function === 'TIME_SERIES_INTRADAY') {
        const timeSeries = data[`Time Series (${config.interval})`];
        if (timeSeries) {
          prices = Object.values(timeSeries)
            .slice(0, config.dataPoints)  // Limit to requested number of points
            .map((entry: any) => parseFloat(entry['4. close']))  // Extract closing price
            .filter(price => !isNaN(price));  // Remove invalid prices
        }
      } 
      // Process daily data (1W, 1M, 3M, 6M, 1Y charts)
      else {
        const timeSeries = data['Time Series (Daily)'];
        if (timeSeries) {
          prices = Object.values(timeSeries)
            .slice(0, config.dataPoints)  // Limit to requested number of points
            .map((entry: any) => parseFloat(entry['4. close']))  // Extract closing price
            .filter(price => !isNaN(price));  // Remove invalid prices
        }
      }
      
      // Reverse array to show oldest to newest (left to right)
      return prices.reverse();
    } catch (error) {
      throw new Error(`Failed to fetch chart data: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
};

/**
 * Validates stock symbol format
 * Ensures symbol is 1-5 uppercase letters
 * 
 * @param symbol - Stock symbol to validate
 * @returns True if valid, false otherwise
 */
const validateSymbol = (symbol: string): boolean => {
  return /^[A-Z]{1,5}$/.test(symbol);
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

/**
 * StockDetailsScreen Component
 * 
 * Displays detailed information about a specific stock including:
 * - Company overview and basic info
 * - Interactive price chart with multiple time ranges
 * - Key financial statistics
 * - Company description and tags
 * 
 * Features:
 * - Dynamic chart data loading based on selected time range
 * - Caching for improved performance
 * - Loading and error states
 * - Smooth animations and transitions
 * - Responsive design with theme support
 */
const StockDetailsScreen: React.FC = React.memo(() => {
  // Get stock symbol from navigation route parameters
  const route = useRoute<RouteProp<ExploreStackParamList, 'StockDetails'>>();
  const { symbol } = route.params;
  
  // Get current theme for styling
  const { theme } = useTheme();

  // ============================================================================
  // STATE MANAGEMENT
  // ============================================================================
  
  const [details, setDetails] = useState<StockDetails | null>(null);  // Stock overview data
  const [loading, setLoading] = useState(true);                       // Initial loading state
  const [chartData, setChartData] = useState<number[]>([]);           // Chart price data
  const [selectedRange, setSelectedRange] = useState(2);              // Selected time range (default: 1M)
  const [chartLoading, setChartLoading] = useState(false);            // Chart loading state
  const [error, setError] = useState<string | null>(null);            // Error state
  
  // ============================================================================
  // ANIMATION REFERENCES
  // ============================================================================
  
  // Fade-in animation for smooth content appearance
  const fadeAnim = useRef(new Animated.Value(0)).current;
  // Pulse animation for price change indicator
  const pulseAnim = useRef(new Animated.Value(1)).current;
  
  // ============================================================================
  // MEMOIZED VALUES (Performance optimization)
  // ============================================================================
  
  // Get chart configuration for selected time range
  const chartConfig = useMemo(() => CHART_CONFIGS[selectedRange], [selectedRange]);
  
  // Get human-readable subtitle for chart
  const chartSubtitle = useMemo(() => TIME_RANGES[selectedRange].value, [selectedRange]);
  
  // Calculate chart width based on screen dimensions
  const chartWidth = useMemo(() => Dimensions.get('window').width - 48, []);
  
  // Chart styling configuration based on current theme
  const chartConfigMemo = useMemo(() => ({
    backgroundColor: theme.cardSecondary,
    backgroundGradientFrom: theme.cardSecondary,
    backgroundGradientTo: theme.cardSecondary,
    color: (opacity = 1) => `rgba(76, 175, 80, ${opacity})`,  // Green color for positive trend
    labelColor: () => theme.textSecondary,
    propsForDots: { r: '4', strokeWidth: '2', stroke: theme.primary },
    strokeWidth: 3,
    propsForBackgroundLines: {
      strokeDasharray: '',
      stroke: theme.border,
      strokeWidth: 1,
    },
    fillShadowGradient: theme.primaryLight,
    fillShadowGradientOpacity: 0.3,
  }), [theme]);

  // ============================================================================
  // CALLBACK FUNCTIONS (Performance optimization)
  // ============================================================================
  
  /**
   * Fetches chart data for a specific time range
   * Handles loading states and error handling
   * 
   * @param rangeIndex - Index of the selected time range
   */
  const fetchChartData = useCallback(async (rangeIndex: number) => {
    // Validate range index
    if (rangeIndex < 0 || rangeIndex >= CHART_CONFIGS.length) {
      setError('Invalid time range selected');
      return;
    }
    
    setChartLoading(true);
    setError(null);
    
    try {
      const config = CHART_CONFIGS[rangeIndex];
      const prices = await stockApiService.fetchChartData(symbol, config);
      setChartData(prices);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to fetch chart data');
      setChartData([]);
    } finally {
      setChartLoading(false);
    }
  }, [symbol]);

  /**
   * Handles time range selection
   * Prevents unnecessary re-fetching if same range is selected
   * 
   * @param rangeIndex - Index of the selected time range
   */
  const handleRangeSelection = useCallback((rangeIndex: number) => {
    if (rangeIndex === selectedRange) return; // Prevent unnecessary re-fetch
    setSelectedRange(rangeIndex);
    fetchChartData(rangeIndex);
  }, [fetchChartData, selectedRange]);

  // ============================================================================
  // EFFECTS (Side effects and lifecycle management)
  // ============================================================================
  
  /**
   * Effect: Fetch stock details on component mount
   * Also starts animations after data is loaded
   */
  useEffect(() => {
    const fetchDetails = async () => {
      try {
        setError(null);
        const overview = await stockApiService.fetchStockOverview(symbol);
        setDetails(overview);
      } catch (error) {
        setError(error instanceof Error ? error.message : 'Failed to fetch stock details');
        setDetails(null);
      } finally {
        setLoading(false);
        
        // Start fade-in animation
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }).start();
        
        // Start pulse animation for price change indicator
        Animated.loop(
          Animated.sequence([
            Animated.timing(pulseAnim, {
              toValue: 1.1,
              duration: 1000,
              useNativeDriver: true,
            }),
            Animated.timing(pulseAnim, {
              toValue: 1,
              duration: 1000,
              useNativeDriver: true,
            }),
          ])
        ).start();
      }
    };
    
    fetchDetails();
  }, [symbol, fadeAnim, pulseAnim]);

  /**
   * Effect: Fetch chart data when loading is complete and range changes
   * Ensures chart data is loaded after stock details are available
   */
  useEffect(() => {
    if (!loading) {
      fetchChartData(selectedRange);
    }
  }, [loading, selectedRange, fetchChartData]);

  // ============================================================================
  // RENDER METHODS
  // ============================================================================
  
  // Show loading screen while fetching initial data
  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.background }]}>
        <StatusBar backgroundColor={theme.background} barStyle={theme.text === '#ffffff' ? 'light-content' : 'dark-content'} />
        <View style={[styles.loadingCard, { backgroundColor: theme.card }]}>
          <View style={[styles.loadingIconContainer, { backgroundColor: theme.primaryLight }]}>
        <ActivityIndicator size="large" color={theme.primary} />
          </View>
        <Text style={[styles.loadingText, { color: theme.textSecondary }]}>Loading stock details...</Text>
          <Text style={[styles.loadingSubtext, { color: theme.textMuted }]}>Fetching latest data for {symbol}</Text>
        </View>
      </View>
    );
  }

  // Show error screen if data fetch failed
  if (error || !details?.Symbol) {
    return (
      <View style={[styles.errorContainer, { backgroundColor: theme.background }]}>
        <StatusBar backgroundColor={theme.background} barStyle={theme.text === '#ffffff' ? 'light-content' : 'dark-content'} />
        <View style={[styles.errorCard, { backgroundColor: theme.card }]}>
        <Icon name="error-outline" size={64} color={theme.textMuted} />
        <Text style={[styles.errorText, { color: theme.text }]}>Failed to load stock details</Text>
          <Text style={[styles.errorSubtext, { color: theme.textSecondary }]}>
            {error || 'Please check your connection and try again'}
          </Text>
        </View>
      </View>
    );
  }

  // Main screen content
  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar backgroundColor={theme.background} barStyle={theme.text === '#ffffff' ? 'light-content' : 'dark-content'} />
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <Animated.View style={{ opacity: fadeAnim }}>
          {/* ============================================================================
              HEADER SECTION - Company info and current price
          ============================================================================ */}
        <View style={[styles.headerSection, { backgroundColor: theme.card }]}>
            <LinearGradient
              colors={[theme.primaryLight, theme.card]}
              style={styles.headerGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
          <View style={styles.headerRow}>
                {/* Company logo circle with first letter */}
                <View style={[styles.logoCircle, { backgroundColor: theme.primary }]}>
                  <Text style={[styles.symbolLetter, { color: theme.card }]}>
                {symbol.charAt(0).toUpperCase()}
              </Text>
            </View>
                
                {/* Company information */}
            <View style={styles.headerInfo}>
                  <Text style={[styles.companyName, { color: theme.text }]} numberOfLines={2}>
                    {details.Name}
                  </Text>
                  <Text style={[styles.symbolText, { color: theme.textSecondary }]}>
                    {details.Symbol} • {details.Exchange}
                  </Text>
                  <Text style={[styles.exchangeText, { color: theme.textMuted }]}>
                    {details.Country}
                  </Text>
            </View>
                
                {/* Current price and change indicator */}
            <View style={styles.priceSection}>
                  <Text style={[styles.price, { color: theme.success }]}>
                    ${details['50DayMovingAverage'] || '-'}
                  </Text>
                  <Animated.View 
                    style={[
                      styles.priceChangeContainer, 
                      { 
                        backgroundColor: theme.successLight,
                        transform: [{ scale: pulseAnim }]
                      }
                    ]}
                  >
                    <Icon name="trending-up" size={14} color={theme.success} />
                <Text style={[styles.priceChange, { color: theme.success }]}>+2.5%</Text>
                  </Animated.View>
                </View>
              </View>
            </LinearGradient>
          </View>

          {/* ============================================================================
              CHART SECTION - Interactive price chart with time range selector
          ============================================================================ */}
        <View style={[styles.chartCard, { backgroundColor: theme.card }]}>
            {/* Chart header with title and subtitle */}
          <View style={styles.chartHeader}>
              <Text style={[styles.chartTitle, { color: theme.text }]}>Price Performance</Text>
              <Text style={[styles.chartSubtitle, { color: theme.textSecondary }]}>{chartSubtitle} Historical Data</Text>
          </View>
            
            {/* Chart container with loading/error states */}
          <View style={[styles.chartBox, { backgroundColor: theme.cardSecondary }]}>
              {chartLoading ? (
                // Show loading indicator while fetching chart data
                <View style={styles.chartLoadingContainer}>
                  <ActivityIndicator size="large" color={theme.primary} />
                  <Text style={[styles.chartLoadingText, { color: theme.textSecondary }]}>Loading chart data...</Text>
                </View>
              ) : chartData.length > 0 ? (
                // Display chart if data is available
              <LineChart
                data={{ labels: [], datasets: [{ data: chartData }] }}
                width={chartWidth}
                  height={180}
                  chartConfig={chartConfigMemo}
                bezier
                style={styles.chart}
                  withDots={true}
                  withShadow={true}
                  withInnerLines={true}
                  withOuterLines={false}
                  decorator={() => (
                    <View style={styles.chartDecorator}>
                      <Icon name="trending-up" size={20} color={theme.success} />
                    </View>
                  )}
              />
            ) : (
                // Show placeholder when no chart data is available
              <View style={styles.noChartData}>
                <Icon name="show-chart" size={48} color={theme.textMuted} />
                <Text style={[styles.noChartText, { color: theme.textSecondary }]}>Chart data unavailable</Text>
              </View>
            )}
          </View>
            
            {/* Time range selector buttons */}
          <View style={styles.rangeRow}>
              {TIME_RANGES.map((range) => (
              <TouchableOpacity 
                  key={range.label} 
                style={[
                  styles.rangeBtn, 
                  { 
                      backgroundColor: range.index === selectedRange ? theme.primary : theme.cardSecondary,
                      borderColor: range.index === selectedRange ? theme.primary : theme.border,
                      opacity: chartLoading ? 0.6 : 1,
                    }
                  ]}
                  onPress={() => handleRangeSelection(range.index)}
                  disabled={chartLoading}
                  activeOpacity={0.7}
                  accessible={true}
                  accessibilityLabel={`Select ${range.label} time range`}
                  accessibilityRole="button"
                  accessibilityState={{ selected: range.index === selectedRange }}
              >
                <Text style={[
                  styles.rangeBtnText, 
                    { color: range.index === selectedRange ? theme.card : theme.text }
                ]}>
                    {range.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

          {/* ============================================================================
              ABOUT AND STATISTICS SECTION - Company info and key metrics
          ============================================================================ */}
        <View style={[styles.aboutStatsCard, { backgroundColor: theme.card }]}>
            {/* Company description section */}
          <View style={styles.aboutSection}>
            <Text style={[styles.aboutHeader, { color: theme.text }]}>About {details.Name}</Text>
              <Text style={[styles.aboutText, { color: theme.textSecondary }]} numberOfLines={4}>
                {details.Description}
              </Text>
              
              {/* Industry and sector tags */}
            <View style={styles.tagsRow}>
              {details.Industry && (
                <View style={[styles.tag, { backgroundColor: theme.primaryLight }]}>
                    <Icon name="business" size={14} color={theme.primary} style={styles.tagIcon} />
                  <Text style={[styles.tagText, { color: theme.primary }]} numberOfLines={1}>
                      {details.Industry}
                  </Text>
                </View>
              )}
              {details.Sector && (
                <View style={[styles.tag, { backgroundColor: theme.primaryLight }]}>
                    <Icon name="category" size={14} color={theme.primary} style={styles.tagIcon} />
                  <Text style={[styles.tagText, { color: theme.primary }]} numberOfLines={1}>
                      {details.Sector}
                  </Text>
                </View>
              )}
            </View>
          </View>
          
            {/* Key statistics grid */}
          <View style={[styles.statsGrid, { backgroundColor: theme.cardSecondary }]}>
            <Text style={[styles.statsHeader, { color: theme.text }]}>Key Statistics</Text>
              
              {/* First row: Price ranges */}
            <View style={styles.statsRow}>
              <View style={styles.statsCol}>
                  <Icon name="trending-down" size={16} color={theme.danger} style={styles.statsIcon} />
                <Text style={[styles.statsLabel, { color: theme.textSecondary }]}>52-Week Low</Text>
                <Text style={[styles.statsValue, { color: theme.text }]}>${details['52WeekLow'] || '-'}</Text>
              </View>
              <View style={styles.statsCol}>
                  <Icon name="attach-money" size={16} color={theme.success} style={styles.statsIcon} />
                <Text style={[styles.statsLabel, { color: theme.textSecondary }]}>Current Price</Text>
                <Text style={[styles.statsValue, { color: theme.success }]}>${details['50DayMovingAverage'] || '-'}</Text>
              </View>
              <View style={styles.statsCol}>
                  <Icon name="trending-up" size={16} color={theme.success} style={styles.statsIcon} />
                <Text style={[styles.statsLabel, { color: theme.textSecondary }]}>52-Week High</Text>
                <Text style={[styles.statsValue, { color: theme.text }]}>${details['52WeekHigh'] || '-'}</Text>
              </View>
            </View>
              
              {/* Second row: Market metrics */}
            <View style={styles.statsRow}>
              <View style={styles.statsCol}>
                  <Icon name="account-balance" size={16} color={theme.primary} style={styles.statsIcon} />
                <Text style={[styles.statsLabel, { color: theme.textSecondary }]}>Market Cap</Text>
                  <Text style={[styles.statsValue, { color: theme.text }]}>{formatMarketCap(details.MarketCapitalization)}</Text>
              </View>
              <View style={styles.statsCol}>
                  <Icon name="analytics" size={16} color={theme.primary} style={styles.statsIcon} />
                <Text style={[styles.statsLabel, { color: theme.textSecondary }]}>P/E Ratio</Text>
                <Text style={[styles.statsValue, { color: theme.text }]}>{details.PERatio || '-'}</Text>
              </View>
              <View style={styles.statsCol}>
                  <Icon name="speed" size={16} color={theme.primary} style={styles.statsIcon} />
                <Text style={[styles.statsLabel, { color: theme.textSecondary }]}>Beta</Text>
                <Text style={[styles.statsValue, { color: theme.text }]}>{details.Beta || '-'}</Text>
              </View>
            </View>
              
              {/* Third row: Financial ratios */}
            <View style={styles.statsRow}>
              <View style={styles.statsCol}>
                  <Icon name="payments" size={16} color={theme.primary} style={styles.statsIcon} />
                <Text style={[styles.statsLabel, { color: theme.textSecondary }]}>Dividend Yield</Text>
                  <Text style={[styles.statsValue, { color: theme.text }]}>{formatPercentage(details.DividendYield)}</Text>
              </View>
              <View style={styles.statsCol}>
                  <Icon name="pie-chart" size={16} color={theme.primary} style={styles.statsIcon} />
                <Text style={[styles.statsLabel, { color: theme.textSecondary }]}>Profit Margin</Text>
                  <Text style={[styles.statsValue, { color: theme.text }]}>{formatPercentage(details.ProfitMargin)}</Text>
                </View>
                <View style={styles.statsCol}>
                  <Icon name="assessment" size={16} color={theme.primary} style={styles.statsIcon} />
                  <Text style={[styles.statsLabel, { color: theme.textSecondary }]}>ROE</Text>
                  <Text style={[styles.statsValue, { color: theme.text }]}>{formatPercentage(details.ReturnOnEquityTTM)}</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Floating Action Button - Add to watchlist */}
          <TouchableOpacity style={[styles.fab, { backgroundColor: theme.primary }]}>
            <Icon name="add" size={24} color={theme.card} />
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>
    </View>
  );
});

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  // Main container styles
  container: { 
    flex: 1, 
    backgroundColor: '#fff', 
    padding: 12 
  },
  scrollView: { 
    flex: 1 
  },
  
  // Header section styles
  headerSection: { 
    marginBottom: 16, 
    borderRadius: 20,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    overflow: 'hidden',
  },
  headerGradient: {
    padding: 24,
  },
  headerRow: { 
    flexDirection: 'row', 
    alignItems: 'center' 
  },
  logoCircle: { 
    width: 64, 
    height: 64, 
    borderRadius: 32, 
    alignItems: 'center', 
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  symbolLetter: { 
    fontSize: 32, 
    fontWeight: 'bold' 
  },
  headerInfo: { 
    flex: 1, 
    marginLeft: 20 
  },
  companyName: { 
    fontSize: 22, 
    fontWeight: 'bold',
    marginBottom: 6,
    lineHeight: 28,
  },
  symbolText: { 
    fontSize: 16,
    marginBottom: 4,
    fontWeight: '600',
  },
  exchangeText: { 
    fontSize: 14,
    fontWeight: '500',
  },
  priceSection: { 
    alignItems: 'flex-end' 
  },
  price: { 
    fontSize: 24, 
    fontWeight: 'bold',
    marginBottom: 8
  },
  priceChangeContainer: { 
    paddingHorizontal: 12, 
    paddingVertical: 6, 
    borderRadius: 12, 
    flexDirection: 'row', 
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  priceChange: { 
    fontSize: 14, 
    fontWeight: 'bold', 
    marginLeft: 6 
  },
  
  // Chart section styles
  chartCard: { 
    borderRadius: 20, 
    padding: 24, 
    marginBottom: 16,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  chartHeader: { 
    marginBottom: 20 
  },
  chartTitle: { 
    fontSize: 20, 
    fontWeight: 'bold',
    marginBottom: 6
  },
  chartSubtitle: { 
    fontSize: 16,
    fontWeight: '500',
  },
  chartBox: {
    height: 180,
    borderRadius: 16,
    marginBottom: 20,
    justifyContent: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  chart: { 
    borderRadius: 16, 
    alignSelf: 'center' 
  },
  noChartData: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noChartText: {
    marginTop: 16,
    fontSize: 16,
    fontWeight: '500',
  },
  rangeRow: { 
    flexDirection: 'row', 
    justifyContent: 'space-between',
    paddingHorizontal: 4
  },
  rangeBtn: { 
    paddingHorizontal: 16, 
    paddingVertical: 10, 
    borderRadius: 12, 
    borderWidth: 1.5,
    minWidth: 48,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  rangeBtnText: { 
    fontSize: 14, 
    fontWeight: '600'
  },
  
  // About and statistics section styles
  aboutStatsCard: { 
    borderRadius: 20, 
    padding: 24, 
    marginBottom: 20,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  aboutSection: { 
    marginBottom: 24 
  },
  aboutHeader: { 
    fontSize: 20,
    fontWeight: 'bold', 
    marginBottom: 16 
  },
  aboutText: { 
    fontSize: 16, 
    lineHeight: 24,
    marginBottom: 20,
    fontWeight: '500',
  },
  tagsRow: { 
    flexDirection: 'row', 
    flexWrap: 'wrap',
    gap: 12
  },
  tag: { 
    borderRadius: 12, 
    paddingHorizontal: 16, 
    paddingVertical: 10,
    maxWidth: '48%',
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  tagIcon: {
    marginRight: 8,
  },
  tagText: { 
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  statsGrid: { 
    borderRadius: 16, 
    padding: 20
  },
  statsHeader: { 
    fontSize: 18,
    fontWeight: 'bold', 
    marginBottom: 20,
    textAlign: 'center'
  },
  statsRow: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    marginBottom: 20 
  },
  statsCol: { 
    flex: 1, 
    alignItems: 'center', 
    paddingHorizontal: 8 
  },
  statsIcon: {
    marginBottom: 8,
  },
  statsLabel: { 
    fontSize: 13, 
    textAlign: 'center', 
    marginBottom: 8,
    fontWeight: '600'
  },
  statsValue: { 
    fontSize: 16, 
    fontWeight: 'bold', 
    textAlign: 'center'
  },
  
  // Loading state styles
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingCard: {
    padding: 40,
    borderRadius: 20,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    alignItems: 'center',
  },
  loadingIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  loadingText: {
    marginTop: 0,
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  loadingSubtext: {
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
  
  // Error state styles
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorCard: {
    padding: 40,
    borderRadius: 20,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    alignItems: 'center',
  },
  errorText: {
    marginTop: 20,
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  errorSubtext: {
    marginTop: 12,
    fontSize: 14,
    textAlign: 'center',
    fontWeight: '500',
  },
  
  // Chart decoration styles
  chartDecorator: {
    position: 'absolute',
    top: 10,
    right: 10,
    padding: 8,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  
  // Floating action button styles
  fab: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  
  // Chart loading styles
  chartLoadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chartLoadingText: {
    marginTop: 16,
    fontSize: 16,
    fontWeight: '500',
  },
});

export default StockDetailsScreen; 