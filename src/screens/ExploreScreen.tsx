import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, FlatList, Alert } from 'react-native';
import { useTheme } from '../ThemeContext';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ExploreStackParamList } from '../types/navigation';
import StockCard from '../components/StockCard';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { debounce, measurePerformance, PERFORMANCE_CONFIG } from '../utils/performance';
import { apiService } from '../services/api';
import { ENV } from '../config/environment';
import { responsive, device, borderRadius, fontSize } from '../utils/responsive';



 // Represents a stock item with basic information
interface StockItem {
  ticker: string;   
  price: string;     
}


/**
 * search result that combines local data with API results
 * Includes price information and source tracking for better UX
 */
type HybridSearchResult = {
  symbol: string;                                    
  name: string;                                     
  price?: string;                                    
  source: 'gainer' | 'loser' | 'search';            
};



 // ExploreScreen
const ExploreScreen = () => {
  
  
  const { theme } = useTheme();
  
  // Navigation hook for screen transitions
  const navigation = useNavigation<NativeStackNavigationProp<ExploreStackParamList>>();
  
  // Stock data states
  const [topGainers, setTopGainers] = useState<StockItem[]>([]);      
  const [topLosers, setTopLosers] = useState<StockItem[]>([]);        
  const [loading, setLoading] = useState(true);                       
  const [error, setError] = useState<string | null>(null);            
  
  // Search states
  const [search, setSearch] = useState('');                           
  const [searchResults, setSearchResults] = useState<HybridSearchResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);          

   // Fetches top gainers and losers data from the API
  const fetchData = useCallback(async () => {
    try {
      // Clear previous errors and show loading state
      setError(null);
      setLoading(true);
      
      // Check if API key is set
      if (!ENV.ALPHA_VANTAGE_API_KEY || ENV.ALPHA_VANTAGE_API_KEY === 'YOUR_API_KEY_HERE') {
        throw new Error('Please set your Alpha Vantage API key in src/config/environment.ts');
      }
     
      const measureFetch = measurePerformance('fetchTopGainersLosers', async () => {
        // Fetch both gainers and losers in parallel 
        const response = await apiService.getTopGainers();
        const losersResponse = await apiService.getTopLosers();
        return { gainers: response, losers: losersResponse };
      });

      const { gainers, losers } = await measureFetch();
      setTopGainers(gainers);
      setTopLosers(losers);
    } catch (error) {
      console.error('Error fetching data:', error);
      setError(error instanceof Error ? error.message : 'Failed to fetch data');
      setTopGainers([]);
      setTopLosers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch data 
  useEffect(() => {
    fetchData();
  }, [fetchData]);
  
  /**
   * Debounced search function to prevent excessive API calls
   * Waits for user to stop typing before executing search
   */
  const debouncedSearch = useMemo(
    () => debounce(async (query: string) => {
      if (query.trim().length > 0) {
        await fetchSearchResults(query.trim());
      } else {
        setSearchResults([]);
      }
    }, PERFORMANCE_CONFIG.DEBOUNCE_DELAY),
    []
  );

  // Trigger search when user Start typeing
  useEffect(() => {
    debouncedSearch(search);
    return () => {
      
    };
  }, [search, debouncedSearch]);

  /**
   * Performs the actual search operation
   * Combines local data (gainers/losers) with API search results
   * Prioritizes local data over API results to avoid duplicates
   * 
   * Search Strategy:
   * 1. Search local data first 
   * 2. Fetch additional results from API
   * 3. Combine and deduplicate results
   */
  const fetchSearchResults = useCallback(async (query: string) => {
    setSearchLoading(true);
    try {
      // Search in local data first
      const lowerQuery = query.toLowerCase();
      
      // Find matches in top gainers 
      const gainerMatches = topGainers
        .filter(item => item.ticker.toLowerCase().includes(lowerQuery))
        .map(item => ({
          symbol: item.ticker,
          name: '',
          price: item.price,
          source: 'gainer' as const,
        }));
      
      // Find matches in top losers
      const loserMatches = topLosers
        .filter(item => item.ticker.toLowerCase().includes(lowerQuery))
        .map(item => ({
          symbol: item.ticker,
          name: '',
          price: item.price,
          source: 'loser' as const,
        }));

      // Fetch additional results from API for broader search
      let apiResults: HybridSearchResult[] = [];
      try {
        const res = await fetch(`https://www.alphavantage.co/query?function=SYMBOL_SEARCH&keywords=${encodeURIComponent(query)}&apikey=${ENV.ALPHA_VANTAGE_API_KEY}`);
        const data = await res.json();
        apiResults = (data.bestMatches || []).map((item: any) => ({
          symbol: item["1. symbol"],
          name: item["2. name"],
          price: undefined, 
          source: 'search' as const,
        }));
      } catch (e) {
        console.warn('Search API error:', e);
        apiResults = [];
      }

      // Combine results and remove duplicates
      // ensures we show price data when available and avoid duplicates
      const seen = new Set<string>();
      const combined = [...gainerMatches, ...loserMatches];
      combined.forEach(item => seen.add(item.symbol));
      const filteredApiResults = apiResults.filter(item => !seen.has(item.symbol));
      
      setSearchResults([...combined, ...filteredApiResults]);
    } catch (error) {
      console.error('Search error:', error);
      setSearchResults([]);
    } finally {
      setSearchLoading(false);
    }
  }, [topGainers, topLosers]);

   // Renders individual search result items
  const renderSearchResult = useCallback(({ item }: { item: HybridSearchResult }) => (
    <TouchableOpacity
      style={styles.searchResultRow}
      onPress={() => {
        setSearch('');
        setSearchResults([]);
        navigation.navigate('StockDetails', { symbol: item.symbol });
      }}
    >
      <Text style={styles.searchResultSymbol}>{item.symbol}</Text>
      <Text style={styles.searchResultName}>
        {item.name || (item.source === 'gainer' ? 'Top Gainer' : item.source === 'loser' ? 'Top Loser' : '')}
      </Text>
      {/* Show price if available (only for gainers/losers) */}
      {item.price && (
        <Text style={{ 
          color: item.source === 'gainer' ? '#43A047' : item.source === 'loser' ? '#E53935' : '#222', 
          fontWeight: 'bold', 
          marginLeft: 8 
        }}>
          {item.price}
        </Text>
      )}
    </TouchableOpacity>
  ), [navigation]);

   // Renders individual stock cards for horizontal lists
  const renderStockCard = useCallback((item: StockItem, priceColor: string) => (
    <TouchableOpacity
      key={item.ticker}
      onPress={() => {
        navigation.navigate('StockDetails', { symbol: item.ticker });
      }}
      style={styles.cardContainer}
    >
      <StockCard 
        name={item.ticker} 
        symbol={item.ticker} 
        price={item.price} 
        priceColor={priceColor} 
      />
    </TouchableOpacity>
  ), [navigation]);


   // Only re-renders when data or loading state changes
  const gainersList = useMemo(() => {
    if (loading || topGainers.length === 0) return null;
    
    return (
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false} 
        contentContainerStyle={styles.horizontalScroll}
        removeClippedSubviews={true} 
      >
        {/* Render gainers in pages of 4 items each */}
        {Array.from({ length: Math.ceil(topGainers.length / 4) }).map((_, pageIndex) => (
          <View key={pageIndex} style={styles.cardPage}>
            {topGainers.slice(pageIndex * 4, pageIndex * 4 + 4).map((item) => 
              renderStockCard(item, "#43A047") 
            )}
          </View>
        ))}
      </ScrollView>
    );
  }, [topGainers, loading, renderStockCard]);

   // Only re-renders when data or loading state changes
  const losersList = useMemo(() => {
    if (loading || topLosers.length === 0) return null;
    
    return (
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false} 
        contentContainerStyle={styles.horizontalScroll}
        removeClippedSubviews={true} 
      >
        {/* Render losers in pages of 4 items each */}
        {Array.from({ length: Math.ceil(topLosers.length / 4) }).map((_, pageIndex) => (
          <View key={pageIndex} style={styles.cardPage}>
            {topLosers.slice(pageIndex * 4, pageIndex * 4 + 4).map((item) => 
              renderStockCard(item, "#E53935")
            )}
          </View>
        ))}
      </ScrollView>
    );
  }, [topLosers, loading, renderStockCard]);
  
   // Retry handler for failed API calls
  const handleRetry = useCallback(() => {
    fetchData();
  }, [fetchData]);
  
   // Loading component with spinner and descriptive text
  const LoadingComponent = useMemo(() => (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color={theme.primary} />
      <Text style={[styles.loadingText, { color: theme.text }]}>Loading market data...</Text>
    </View>
  ), [theme]);

   // Error component with retry functionality
  const ErrorComponent = useMemo(() => (
    <View style={styles.errorContainer}>
      <Icon name="error-outline" size={48} color="#E53935" />
      <Text style={[styles.errorText, { color: theme.text }]}>
        {error || 'Something went wrong'}
      </Text>
      
      {/* Show additional help for API key issues */}
      {error && error.includes('API key') && (
        <View style={styles.apiKeyHelp}>
          <Text style={[styles.apiKeyHelpText, { color: theme.textSecondary }]}>
            1. Get a free API key from Alpha Vantage{'\n'}
            2. Replace 'YOUR_API_KEY_HERE' in src/config/environment.ts{'\n'}
            3. Restart the app
          </Text>
          <TouchableOpacity 
            style={[styles.apiKeyButton, { backgroundColor: theme.primary }]}
            onPress={() => {
              // You could add a link to open the website here
              console.log('Visit: https://www.alphavantage.co/support/#api-key');
            }}
          >
            <Text style={styles.apiKeyButtonText}>Get API Key</Text>
          </TouchableOpacity>
        </View>
      )}
      
      <TouchableOpacity style={[styles.retryButton, { backgroundColor: theme.primary }]} onPress={handleRetry}>
        <Text style={styles.retryButtonText}>Retry</Text>
      </TouchableOpacity>
    </View>
  ), [error, theme, handleRetry]);

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <Text
        style={{
          fontSize: theme.fontSize.xxxl,
          fontWeight: 'bold',
          color: theme.text,
          alignSelf: 'flex-start',
          marginLeft: responsive.margin.lg,
          marginTop: responsive.margin.lg,
          marginBottom: responsive.margin.sm,
        }}
      >
        Stocks App
      </Text>
      
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={[styles.searchBarContainer, { backgroundColor: theme.card, borderColor: theme.border }]}> 
          <Icon name="search" size={20} color={theme.textSecondary} style={styles.searchIcon} />
          <TextInput
            style={[styles.searchBar, { color: theme.text }]}
            placeholder="Search stocks, companies..."
            placeholderTextColor={theme.textMuted}
            value={search}
            onChangeText={setSearch}
            autoCapitalize="characters"
            autoCorrect={false}
            clearButtonMode="while-editing"
          />
          {/* Clear button - only show when there's text */}
          {search.length > 0 && (
            <TouchableOpacity onPress={() => { setSearch(''); setSearchResults([]); }}>
              <Icon name="close" size={20} color={theme.textSecondary} style={styles.micIcon} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Conditional Rendering - Search Results or Main Content */}
      {search.length > 0 ? (
        // Search Results 
        <FlatList
          data={searchResults}
          keyExtractor={item => item.symbol + (item.name || '')}
          renderItem={renderSearchResult}
          getItemLayout={(_, index) => ({
            length: 80, 
            offset: 80 * index,
            index,
          })}
          initialNumToRender={PERFORMANCE_CONFIG.INITIAL_NUM_TO_RENDER}
          maxToRenderPerBatch={PERFORMANCE_CONFIG.MAX_TO_RENDER_PER_BATCH}
          windowSize={PERFORMANCE_CONFIG.WINDOW_SIZE}
          removeClippedSubviews={PERFORMANCE_CONFIG.REMOVE_CLIPPED_SUBVIEWS}
          ItemSeparatorComponent={() => <View style={styles.searchResultDivider} />}
          ListEmptyComponent={() => (
            searchLoading
              ? <ActivityIndicator size="small" color={theme.primary} style={{ margin: 16 }} />
              : <Text style={styles.searchResultEmpty}>No results found</Text>
          )}
          style={{ flex: 1, backgroundColor: '#fff', marginHorizontal: 16, borderRadius: 12, marginTop: 4 }}
          keyboardShouldPersistTaps="handled"
        />
      ) : (
        // Main Content - Top Gainers and Losers
        <ScrollView 
          style={[styles.container, { backgroundColor: theme.background }]} 
          contentContainerStyle={{ flexGrow: 1 }}
          showsVerticalScrollIndicator={false}
        >
          <View style={{ paddingBottom: 24 }}>
            {/* Show loading, error, or content based on state */}
            {loading ? (
              LoadingComponent
            ) : error ? (
              ErrorComponent
            ) : (
              <>
                {/* Top Gainers Section */}
                <View style={[styles.sectionHeaderBox, { backgroundColor: '#E8F5E9' }]}> 
                  <View style={styles.sectionHeaderRowCustom}>
                    <View style={styles.sectionHeaderLeftCustom}>
                      <View style={[styles.sectionIconCustom, { backgroundColor: '#43A047' }]}> 
                        <Icon name="trending-up" size={22} color="#fff" />
                      </View>
                      <Text style={[styles.sectionTitleCustom, { color: '#388E3C' }]}>Top Gainers</Text>
                    </View>
                    <TouchableOpacity style={styles.viewAllRowCustom} onPress={() => navigation.navigate('TopGainer')}>
                      <Text style={[styles.viewAllCustom, { color: '#43A047' }]}>View All</Text>
                      <Icon name="arrow-forward-ios" size={16} color="#43A047" style={{ marginLeft: 2 }} />
                    </TouchableOpacity>
                  </View>
                </View>

                {gainersList}

                {/* Top Losers Section */}
                <View style={[styles.sectionHeaderBox, { backgroundColor: '#FFEBEE' }]}> 
                  <View style={styles.sectionHeaderRowCustom}>
                    <View style={styles.sectionHeaderLeftCustom}>
                      <View style={[styles.sectionIconCustom, { backgroundColor: '#E53935' }]}> 
                        <Icon name="trending-down" size={22} color="#fff" />
                      </View>
                      <Text style={[styles.sectionTitleCustom, { color: '#C62828' }]}>Top Losers</Text>
                    </View>
                    <TouchableOpacity style={styles.viewAllRowCustom} onPress={() => navigation.navigate('TopLoser')}>
                      <Text style={[styles.viewAllCustom, { color: '#E53935' }]}>View All</Text>
                      <Icon name="arrow-forward-ios" size={16} color="#E53935" style={{ marginLeft: 2 }} />
                    </TouchableOpacity>
                  </View>
                </View>

                {losersList}
              </>
            )}
          </View>
        </ScrollView>
      )}
    </View>
  );
};


const styles = StyleSheet.create({
  // Main styles
  container: {
    paddingTop: 24,
    paddingBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    alignSelf: 'center',
    marginBottom: 12,
  },
  
  // Search bar
  searchContainer: {
    marginHorizontal: responsive.margin.md,
  },
  searchBarContainer: {
    paddingHorizontal: responsive.padding.lg,
    paddingVertical: responsive.padding.sm,
    borderWidth: 1,
    borderRadius: borderRadius.md,
    flexDirection: 'row',
    alignItems: 'center',
  },
  searchIcon: {
    marginRight: responsive.margin.sm,
  },
  searchBar: {
    flex: 1,
    fontSize: 16,
  },
  micIcon: {
    marginLeft: responsive.margin.sm,
  },
  
  // Search results 
  searchResultsBox: {
    backgroundColor: '#fff',
    borderRadius: borderRadius.lg,
    marginTop: responsive.margin.xs,
    marginHorizontal: responsive.margin.xs,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: responsive.margin.md,
    elevation: 6,
    zIndex: 10,
  },
  searchResultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: responsive.padding.md,
    paddingHorizontal: responsive.padding.md,
    backgroundColor: '#fff',
  },
  searchResultSymbol: {
    fontWeight: 'bold',
    fontSize: fontSize.lg,
    width: 70,
  },
  searchResultName: {
    flex: 1,
    fontSize: fontSize.md,
    color: '#222',
  },
  searchResultDivider: {
    height: 1,
    backgroundColor: '#eee',
    marginLeft: responsive.margin.md,
  },
  searchResultEmpty: {
    padding: responsive.padding.md,
    color: '#888',
    textAlign: 'center',
  },
  
  // Section header 
  sectionHeaderBox: {
    borderRadius: borderRadius.md,
    marginHorizontal: responsive.margin.md,
    marginTop: responsive.margin.lg,
    marginBottom: responsive.margin.sm,
    padding: responsive.padding.md,
  },
  sectionHeaderRowCustom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionHeaderLeftCustom: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionIconCustom: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: responsive.margin.sm,
  },
  sectionTitleCustom: {
    fontSize: fontSize.lg,
    fontWeight: 'bold',
  },
  viewAllRowCustom: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  viewAllCustom: {
    fontWeight: 'bold',
    fontSize: fontSize.sm,
    marginRight: responsive.margin.xs,
  },
  
  // Loading and error states
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: responsive.padding.xl,
  },
  loadingText: {
    marginTop: responsive.margin.md,
    fontSize: fontSize.md,
    textAlign: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: responsive.padding.xl,
  },
  errorText: {
    marginTop: responsive.margin.md,
    fontSize: fontSize.md,
    textAlign: 'center',
    marginBottom: responsive.margin.lg,
  },
  retryButton: {
    paddingHorizontal: responsive.padding.lg,
    paddingVertical: responsive.padding.md,
    borderRadius: borderRadius.md,
  },
  retryButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: fontSize.md,
  },
  
  // API Key help styles
  apiKeyHelp: {
    marginTop: responsive.margin.md,
    marginBottom: responsive.margin.lg,
    alignItems: 'center',
  },
  apiKeyHelpText: {
    fontSize: fontSize.sm,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: responsive.margin.md,
  },
  apiKeyButton: {
    paddingHorizontal: responsive.padding.lg,
    paddingVertical: responsive.padding.sm,
    borderRadius: borderRadius.sm,
  },
  apiKeyButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: fontSize.sm,
  },
  
  // Horizontal scroll 
  horizontalScroll: {
    paddingLeft: responsive.padding.sm,
    paddingRight: responsive.padding.sm,
  },
  cardPage: {
    width: device.isTablet ? 600 : 370,
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginRight: responsive.margin.xl,
    marginLeft: responsive.margin.xs
  },
  cardContainer: {
    width: device.isTablet ? '33%' : '50%',
    paddingHorizontal: responsive.padding.lg,
    paddingVertical: responsive.padding.xs,
  },
});

export default ExploreScreen;
