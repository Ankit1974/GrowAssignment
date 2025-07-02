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
import { responsive, borderRadius, fontSize, device } from '../utils/responsive';



 //Interface for stock overview data returned from Alpha Vantage API

interface StockDetails {
  Symbol: string;           
  Name: string;             
  Exchange: string;         
  Country: string;          
  Description: string;      
  Industry: string;         
  Sector: string;           
  '50DayMovingAverage': string;  
  '52WeekLow': string;      
  '52WeekHigh': string;     
  MarketCapitalization: string;  
  PERatio: string;          
  Beta: string;             
  DividendYield: string;    
  ProfitMargin: string;    
  ReturnOnEquityTTM: string; 
}

 // Configuration for different chart time ranges
interface ChartConfig {
  function: string;         // API function 
  interval: string;         // Time interval for intraday data 
  dataPoints: number;       // Number of data points to fetch
}


// Time range options for chart display
interface TimeRange {
  label: string;            // Display label
  value: string;            // Human readable value 
  index: number;            // Array index for mapping to chart conf
}

// Alpha Vantage API configuration
const API_BASE_URL = 'https://www.alphavantage.co/query';
const API_KEY = ENV.ALPHA_VANTAGE_API_KEY; // API key from environment variables

// Validate API key and warn if missing
if (!API_KEY) {
  console.warn('Warning: No API key set. Please set ALPHA_VANTAGE_API_KEY in your environment variables.');
}


 // Available time ranges for chart display
const TIME_RANGES: TimeRange[] = [
  { label: '1D', value: '1 Day', index: 0 },     
  { label: '1W', value: '1 Week', index: 1 },     
  { label: '1M', value: '1 Month', index: 2 },    
  { label: '3M', value: '3 Months', index: 3 },   
  { label: '6M', value: '6 Months', index: 4 },   
  { label: '1Y', value: '1 Year', index: 5 },     
];

 // Chart configurations for each time range
 
const CHART_CONFIGS: ChartConfig[] = [
  { function: 'TIME_SERIES_INTRADAY', interval: '5min', dataPoints: 78 },  
  { function: 'TIME_SERIES_DAILY', interval: '', dataPoints: 7 },          
  { function: 'TIME_SERIES_DAILY', interval: '', dataPoints: 30 },         
  { function: 'TIME_SERIES_DAILY', interval: '', dataPoints: 90 },         
  { function: 'TIME_SERIES_DAILY', interval: '', dataPoints: 180 },        
  { function: 'TIME_SERIES_DAILY', interval: '', dataPoints: 365 },        
];

// Formats market capitalization to human-readable format
const formatMarketCap = (marketCap: string): string => {
  if (!marketCap) return '-';
  const num = parseFloat(marketCap);
  if (num >= 1e12) return `${(num / 1e12).toFixed(1)}T`;  
  if (num >= 1e9) return `${(num / 1e9).toFixed(1)}B`;   
  if (num >= 1e6) return `${(num / 1e6).toFixed(1)}M`;    
  return marketCap;
};


// Formats percentage values with 2 decimal places
 
const formatPercentage = (value: string): string => {
  if (!value) return '-';
  const num = parseFloat(value);
  return `${num.toFixed(2)}%`;
};


// API SERVICE

// cache to avoid duplicate API calls
const cache = new Map();

 // Fetches stock overview data from Alpha Vantage API
 
const fetchData = async (symbol: string): Promise<StockDetails> => {
  try {
    console.log(`[StockDetailsScreen] Fetching stock overview for symbol: ${symbol}`);
    console.log(`[StockDetailsScreen] API Key available: ${!!API_KEY}`);
    console.log(`[StockDetailsScreen] API Key starts with: ${API_KEY ? API_KEY.substring(0, 4) + '...' : 'N/A'}`);
    
    const url = `${API_BASE_URL}?function=OVERVIEW&symbol=${symbol}&apikey=${API_KEY}`;
    console.log(`[StockDetailsScreen] API URL: ${url.replace(API_KEY, '***')}`);
    
    const response = await fetch(url);
    console.log(`[StockDetailsScreen] API Response status: ${response.status}`);
    console.log(`[StockDetailsScreen] API Response ok: ${response.ok}`);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    console.log(`[StockDetailsScreen] API Response data keys:`, Object.keys(data));
    console.log(`[StockDetailsScreen] API Response data preview:`, {
      Symbol: data.Symbol,
      Name: data.Name,
      Exchange: data.Exchange,
      Country: data.Country,
      Description: data.Description ? data.Description.substring(0, 100) + '...' : 'No description',
      Industry: data.Industry,
      Sector: data.Sector,
      '50DayMovingAverage': data['50DayMovingAverage'],
      '52WeekLow': data['52WeekLow'],
      '52WeekHigh': data['52WeekHigh'],
      MarketCapitalization: data.MarketCapitalization,
      PERatio: data.PERatio,
      Beta: data.Beta,
      DividendYield: data.DividendYield,
      ProfitMargin: data.ProfitMargin,
      ReturnOnEquityTTM: data.ReturnOnEquityTTM,
    });
    
    // Check for API errors 
    if (data['Error Message'] || data['Note']) {
      console.error(`[StockDetailsScreen] API Error:`, data['Error Message'] || data['Note']);
      throw new Error(data['Error Message'] || data['Note']);
    }
    
    // Check if we have valid data
    if (!data.Symbol || !data.Name) {
      console.warn(`[StockDetailsScreen] Missing required data fields:`, {
        hasSymbol: !!data.Symbol,
        hasName: !!data.Name,
        symbol: data.Symbol,
        name: data.Name
      });
    }
    
    console.log(`[StockDetailsScreen] Successfully fetched stock overview data`);
    return data as StockDetails;
  } catch (error) {
    console.error(`[StockDetailsScreen] Error fetching stock overview:`, error);
    throw new Error(`Failed to fetch stock overview: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};


 //API service object containing methods for fetching stock data
const stockApiService = {

   //Fetches stock overview data with caching
  async fetchStockOverview(symbol: string): Promise<StockDetails> {
    const cacheKey = `overview_${symbol}`;
    console.log(`[StockDetailsScreen] fetchStockOverview called for symbol: ${symbol}`);
    console.log(`[StockDetailsScreen] Cache key: ${cacheKey}`);
    console.log(`[StockDetailsScreen] Cache has data: ${cache.has(cacheKey)}`);
    
    // Return cached data if available
    if (cache.has(cacheKey)) {
      console.log(`[StockDetailsScreen] Returning cached data for ${symbol}`);
      return cache.get(cacheKey);
    }
    
    console.log(`[StockDetailsScreen] No cached data found, fetching from API for ${symbol}`);
    // Fetch new data and cache it
    const data = await fetchData(symbol);
    console.log(`[StockDetailsScreen] Caching data for ${symbol}`);
    cache.set(cacheKey, data);
    return data;
  },

  /**
   * Fetches chart data for a specific time range
   * Handles different API functions (intraday vs daily) and data processing
   */
  async fetchChartData(symbol: string, config: ChartConfig): Promise<number[]> {
    try {
      console.log(`[StockDetailsScreen] fetchChartData called for symbol: ${symbol}`);
      console.log(`[StockDetailsScreen] Chart config:`, config);
      
      // Build API URL based on configuration
      let url = `${API_BASE_URL}?function=${config.function}&symbol=${symbol}&apikey=${API_KEY}`;
      
      // Add interval parameter for intraday data
      if (config.interval) {
        url += `&interval=${config.interval}`;
      }

      console.log(`[StockDetailsScreen] Chart API URL: ${url.replace(API_KEY, '***')}`);
      
      const response = await fetch(url);
      console.log(`[StockDetailsScreen] Chart API Response status: ${response.status}`);
      console.log(`[StockDetailsScreen] Chart API Response ok: ${response.ok}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log(`[StockDetailsScreen] Chart API Response data keys:`, Object.keys(data));
      
      // Check for API errors
      if (data['Error Message'] || data['Note']) {
        console.error(`[StockDetailsScreen] Chart API Error:`, data['Error Message'] || data['Note']);
        throw new Error(data['Error Message'] || data['Note']);
      }
      
      let prices: number[] = [];
      
      // Process intraday data (1D charts)
      if (config.function === 'TIME_SERIES_INTRADAY') {
        const timeSeries = data[`Time Series (${config.interval})`];
        console.log(`[StockDetailsScreen] Intraday time series key: Time Series (${config.interval})`);
        console.log(`[StockDetailsScreen] Time series exists: ${!!timeSeries}`);
        console.log(`[StockDetailsScreen] Time series keys:`, timeSeries ? Object.keys(timeSeries).slice(0, 5) : 'No time series');
        
        if (timeSeries) {
          prices = Object.values(timeSeries)
            .slice(0, config.dataPoints)  // Limit to requested number of points
            .map((entry: any) => parseFloat(entry['4. close']))  // Extract closing price
            .filter(price => !isNaN(price));  // Remove invalid prices
        }
      } 
      // Process daily data 
      else {
        const timeSeries = data['Time Series (Daily)'];
        console.log(`[StockDetailsScreen] Daily time series key: Time Series (Daily)`);
        console.log(`[StockDetailsScreen] Time series exists: ${!!timeSeries}`);
        console.log(`[StockDetailsScreen] Time series keys:`, timeSeries ? Object.keys(timeSeries).slice(0, 5) : 'No time series');
        
        if (timeSeries) {
          prices = Object.values(timeSeries)
            .slice(0, config.dataPoints)  // Limit to requested number of points
            .map((entry: any) => parseFloat(entry['4. close']))  // Extract closing price
            .filter(price => !isNaN(price));  // Remove invalid prices
        }
      }
      
      console.log(`[StockDetailsScreen] Extracted prices count: ${prices.length}`);
      console.log(`[StockDetailsScreen] First 5 prices:`, prices.slice(0, 5));
      console.log(`[StockDetailsScreen] Last 5 prices:`, prices.slice(-5));
      
      // Reverse array to show oldest to newest
      const reversedPrices = prices.reverse();
      console.log(`[StockDetailsScreen] Reversed prices count: ${reversedPrices.length}`);
      console.log(`[StockDetailsScreen] Final first 5 prices:`, reversedPrices.slice(0, 5));
      
      return reversedPrices;
    } catch (error) {
      console.error(`[StockDetailsScreen] Error fetching chart data:`, error);
      throw new Error(`Failed to fetch chart data: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
};

 //Validates stock symbol format
const validateSymbol = (symbol: string): boolean => {
  return /^[A-Z]{1,5}$/.test(symbol);
};

// MAIN COMPONENT

/**
 * StockDetailsScreen Component
 * 
 * Displays detailed information about a specific stock including:
 * - Company overview and basic info
 * - Interactive price chart with multiple time ranges
 * - Key financial statistics
 * - Company description and tags
 */
const StockDetailsScreen: React.FC = React.memo(() => {
  // Get stock symbol from navigation route parameters
  const route = useRoute<RouteProp<ExploreStackParamList, 'StockDetails'>>();
  const { symbol } = route.params;
  
  const { theme } = useTheme();

  // STATE MANAGEMENT
  const [details, setDetails] = useState<StockDetails | null>(null);  
  const [loading, setLoading] = useState(true);                       
  const [chartData, setChartData] = useState<number[]>([]);           
  const [selectedRange, setSelectedRange] = useState(2);              
  const [chartLoading, setChartLoading] = useState(false);            
  const [error, setError] = useState<string | null>(null);            
  

  // ANIMATION REFERENCES
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  
  // Get human-readable subtitle for chart
  const chartSubtitle = useMemo(() => TIME_RANGES[selectedRange].value, [selectedRange]);
  
  // Calculate chart width based on screen dimensions
  const chartWidth = useMemo(() => device.screenWidth - responsive.margin.xl, []);
  
  // Chart styling configuration based on current theme
  const chartConfigMemo = useMemo(() => ({
    backgroundColor: theme.cardSecondary,
    backgroundGradientFrom: theme.cardSecondary,
    backgroundGradientTo: theme.cardSecondary,
    color: (opacity = 1) => `rgba(76, 175, 80, ${opacity})`,  
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

  
   // Fetches chart data for a specific time range
  const fetchChartData = useCallback(async (rangeIndex: number) => {
    console.log(`[StockDetailsScreen] fetchChartData callback called with rangeIndex: ${rangeIndex}`);
    
    // Validate range index
    if (rangeIndex < 0 || rangeIndex >= CHART_CONFIGS.length) {
      console.error(`[StockDetailsScreen] Invalid range index: ${rangeIndex}, max: ${CHART_CONFIGS.length - 1}`);
      setError('Invalid time range selected');
      return;
    }
    
    console.log(`[StockDetailsScreen] Setting chart loading to true`);
    setChartLoading(true);
    setError(null);
    
    try {
      const config = CHART_CONFIGS[rangeIndex];
      console.log(`[StockDetailsScreen] Using chart config:`, config);
      console.log(`[StockDetailsScreen] Calling stockApiService.fetchChartData for symbol: ${symbol}`);
      const prices = await stockApiService.fetchChartData(symbol, config);
      console.log(`[StockDetailsScreen] Received chart prices:`, {
        count: prices.length,
        first5: prices.slice(0, 5),
        last5: prices.slice(-5),
        min: Math.min(...prices),
        max: Math.max(...prices),
      });
      setChartData(prices);
      console.log(`[StockDetailsScreen] Chart data state updated successfully`);
    } catch (error) {
      console.error(`[StockDetailsScreen] Error in fetchChartData callback:`, error);
      setError(error instanceof Error ? error.message : 'Failed to fetch chart data');
      setChartData([]);
    } finally {
      console.log(`[StockDetailsScreen] Setting chart loading to false`);
      setChartLoading(false);
    }
  }, [symbol]);

   // Handles time range selection
  const handleRangeSelection = useCallback((rangeIndex: number) => {
    if (rangeIndex === selectedRange) return; // Prevent unnecessary re-fetch
    setSelectedRange(rangeIndex);
    fetchChartData(rangeIndex);
  }, [fetchChartData, selectedRange]);
  
   // Fetch stock details 
  useEffect(() => {
    console.log(`[StockDetailsScreen] Component mounted with symbol: ${symbol}`);
    console.log(`[StockDetailsScreen] Initial loading state: ${loading}`);
    
    const fetchDetails = async () => {
      console.log(`[StockDetailsScreen] Starting to fetch details for symbol: ${symbol}`);
      try {
        setError(null);
        console.log(`[StockDetailsScreen] Calling stockApiService.fetchStockOverview for ${symbol}`);
        const overview = await stockApiService.fetchStockOverview(symbol);
        console.log(`[StockDetailsScreen] Received overview data:`, {
          hasSymbol: !!overview.Symbol,
          hasName: !!overview.Name,
          symbol: overview.Symbol,
          name: overview.Name,
          exchange: overview.Exchange,
          country: overview.Country,
          description: overview.Description ? overview.Description.substring(0, 50) + '...' : 'No description',
          industry: overview.Industry,
          sector: overview.Sector,
          '50DayMovingAverage': overview['50DayMovingAverage'],
          '52WeekLow': overview['52WeekLow'],
          '52WeekHigh': overview['52WeekHigh'],
          marketCap: overview.MarketCapitalization,
          peRatio: overview.PERatio,
          beta: overview.Beta,
          dividendYield: overview.DividendYield,
          profitMargin: overview.ProfitMargin,
          roe: overview.ReturnOnEquityTTM,
        });
        setDetails(overview);
        console.log(`[StockDetailsScreen] Details state updated successfully`);
      } catch (error) {
        console.error(`[StockDetailsScreen] Error in fetchDetails:`, error);
        setError(error instanceof Error ? error.message : 'Failed to fetch stock details');
        setDetails(null);
      } finally {
        console.log(`[StockDetailsScreen] Setting loading to false`);
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

   // Fetch chart data when loading is complete and range changes
  useEffect(() => {
    console.log(`[StockDetailsScreen] Chart effect triggered - loading: ${loading}, selectedRange: ${selectedRange}`);
    if (!loading) {
      console.log(`[StockDetailsScreen] Loading complete, fetching chart data for range: ${selectedRange}`);
      fetchChartData(selectedRange);
    } else {
      console.log(`[StockDetailsScreen] Still loading, skipping chart data fetch`);
    }
  }, [loading, selectedRange, fetchChartData]);

  // Show loading screen while fetching initial data
  if (loading) {
    console.log(`[StockDetailsScreen] Rendering loading screen for symbol: ${symbol}`);
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
    console.log(`[StockDetailsScreen] Rendering error screen - error: ${error}, hasSymbol: ${!!details?.Symbol}`);
    console.log(`[StockDetailsScreen] Details object:`, details);
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
  console.log(`[StockDetailsScreen] Rendering main content - details:`, {
    hasDetails: !!details,
    symbol: details?.Symbol,
    name: details?.Name,
    chartDataLength: chartData.length,
    selectedRange,
    chartLoading,
    error,
  });
  
  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar backgroundColor={theme.background} barStyle={theme.text === '#ffffff' ? 'light-content' : 'dark-content'} />
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <Animated.View style={{ opacity: fadeAnim }}>
              {/* HEADER SECTION - Company info and current price */}
        <View style={[styles.headerSection, { backgroundColor: theme.card }]}>
            <LinearGradient
              colors={[theme.primaryLight, theme.card]}
              style={styles.headerGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
          <View style={styles.headerRow}>
                {/* Company logo with first letter */}
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

          {/* CHART SECTION - Interactive price chart with time range selector */}
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
                (() => {
                  console.log(`[StockDetailsScreen] Rendering chart with ${chartData.length} data points`);
                  console.log(`[StockDetailsScreen] Chart data:`, chartData);
                  return (
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
                  );
                })()
              ) : (
                // Show placeholder when no chart data is available
                (() => {
                  console.log(`[StockDetailsScreen] No chart data available, showing placeholder`);
                  return (
                    <View style={styles.noChartData}>
                      <Icon name="show-chart" size={48} color={theme.textMuted} />
                      <Text style={[styles.noChartText, { color: theme.textSecondary }]}>Chart data unavailable</Text>
                    </View>
                  );
                })()
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

          {/* ABOUT AND STATISTICS SECTION - Company info and key metrics */}
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
                      Industry - {details.Industry}
                  </Text>
                </View>
              )}
              {details.Sector && (
                <View style={[styles.tag, { backgroundColor: theme.primaryLight }]}>
                    <Icon name="category" size={14} color={theme.primary} style={styles.tagIcon} />
                  <Text style={[styles.tagText, { color: theme.primary }]} numberOfLines={1}>
                      Sector - {details.Sector}
                  </Text>
                </View>
              )}
            </View>
          </View>
          
            {/* Key statistics grid */}
          <View style={[styles.statsGrid, { backgroundColor: theme.cardSecondary }]}>
              
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
        </Animated.View>
      </ScrollView>
    </View>
  );
});

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