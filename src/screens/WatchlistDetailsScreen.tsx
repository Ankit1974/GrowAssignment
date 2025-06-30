import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  ActivityIndicator, 
  StatusBar,
  RefreshControl
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import { WatchlistStackParamList } from '../types/navigation';
import StockCard from '../components/StockCard';
import { useTheme } from '../ThemeContext';

// Key used to store watchlists in device storage
const STORAGE_KEY = 'watchlists';

const CONSTANTS = {
  GRID_COLUMNS: 2, 
  REFRESH_COLORS: ['#4CAF50', '#2196F3'] as string[], 
  REFRESH_TINT_COLOR: '#4CAF50', 
  MIN_HEIGHT: 300, 
  CARD_SPACING: 8, 
  ROW_SPACING: 12, 
  CARD_HEIGHT: 140, 
} as const;

// Type definitions 
interface StockItem {
  symbol: string; 
  name: string;   
  price: string;  
}

// Props for the individual stock card component
interface RenderItemProps {
  item: StockItem; 
  index: number;   
}

// Loading screen component 
const LoadingState = React.memo(() => {
  const { theme } = useTheme(); 
  
  return (
    <View 
      style={styles.centerContainer}
      accessibilityLabel="Loading watchlist"
      accessibilityHint="Please wait while we fetch the stock data"
    >
      {/* Card-style */}
      <View style={[styles.loadingContainer, { backgroundColor: theme.card }]}>
        {/* Spinning loading indicator */}
        <ActivityIndicator size="large" color={CONSTANTS.REFRESH_TINT_COLOR} />
        {/* Loading message */}
        <Text style={[styles.loadingText, { color: theme.textSecondary }]}>
          Loading watchlist...
        </Text>
      </View>
    </View>
  );
});

// Error screen component
const ErrorState = React.memo<{ error: string }>(({ error }) => {
  const { theme } = useTheme();
  
  return (
    <View 
      style={styles.centerContainer}
      accessibilityLabel="Error loading data"
      accessibilityHint="There was an error loading the stock data. Pull down to refresh."
    >
      {/* Card-style error */}
      <View style={[styles.errorContainer, { backgroundColor: theme.card }]}>
        <Text style={styles.errorIcon}>⚠️</Text>
        {/* Error message */}
        <Text style={[styles.errorText, { color: theme.text }]}>
          {error}
        </Text>
        <Text style={[styles.retryText, { color: theme.textSecondary }]}>
          Pull down to refresh
        </Text>
      </View>
    </View>
  );
});

// Empty state
const EmptyState = React.memo(() => {
  const { theme } = useTheme();
  
  return (
    <View 
      style={styles.centerContainer}
      accessibilityLabel="No stocks in watchlist"
      accessibilityHint="This watchlist is currently empty"
    >
      {/* Card-style empty state */}
      <View style={[styles.emptyContainer, { backgroundColor: theme.card }]}>
        <Text style={styles.emptyIcon}>📋</Text>
        {/* empty state message */}
        <Text style={[styles.emptyText, { color: theme.text }]}>
          No stocks in this watchlist
        </Text>
        <Text style={[styles.emptySubtext, { color: theme.textSecondary }]}>
          Add some stocks to get started
        </Text>
      </View>
    </View>
  );
});

// Header component
const Header = React.memo<{ name: string; count: number }>(({ name, count }) => {
  const { theme } = useTheme();
  
  return (
    <View 
      style={styles.header}
      accessibilityLabel="Watchlist header"
      accessibilityHint={`Shows stocks in ${name} watchlist`}
    >
      {/* Header background */}
      <View style={[styles.headerGradient, { backgroundColor: theme.primaryLight }]}>
        {/* Watchlist name */}
        <Text style={[styles.title, { color: theme.text }]}>
          📋 {name}
        </Text>
        {/* subtitle */}
        <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
          Your saved stocks
        </Text>
        {/* Stock count badge */}
        {count > 0 && (
          <View style={styles.countBadge}>
            <Text style={[styles.countText, { color: CONSTANTS.REFRESH_TINT_COLOR }]}>
              {count} stocks
            </Text>
          </View>
        )}
      </View>
    </View>
  );
});

// Individual stock card component
const StockCardItem = React.memo<RenderItemProps>(({ item, index }) => {
  const { theme } = useTheme();
  
  return (
    <View 
      style={[
        styles.cardContainer, 
        { 
          flex: 1,
          marginLeft: index % CONSTANTS.GRID_COLUMNS === 0 ? 0 : CONSTANTS.CARD_SPACING,
          marginRight: index % CONSTANTS.GRID_COLUMNS === CONSTANTS.GRID_COLUMNS - 1 ? 0 : CONSTANTS.CARD_SPACING,
        }
      ]}
      accessibilityLabel={`Stock card for ${item.symbol}`}
      accessibilityHint={`Tap to view details for ${item.symbol} stock`}
    > 
      {/* Render the actual stock card */}
      <StockCard 
        name={item.name} 
        symbol={item.symbol} 
        price={item.price}
        priceColor={CONSTANTS.REFRESH_TINT_COLOR}
      />
    </View>
  );
});

// Main screen component 
const WatchlistDetailsScreen = () => {
  const { theme } = useTheme(); 
  const route = useRoute<RouteProp<WatchlistStackParamList, 'WatchlistDetails'>>();
  const { name } = route.params; 
  
  // State management
  const [symbols, setSymbols] = useState<string[]>([]); 
  const [stocks, setStocks] = useState<StockItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false); 
  const [error, setError] = useState<string | null>(null);

  // Load watchlist from device storage
  const loadWatchlist = useCallback(async () => {
    try {
      setError(null);
      const data = await AsyncStorage.getItem(STORAGE_KEY);
      if (data) {
        const lists = JSON.parse(data);
        // Find the specific watchlist by name
        const wl = lists.find((w: any) => w.name === name);
        setSymbols(wl?.stocks || []);
      } else {
        setSymbols([]);
      }
    } catch (err) {
      setError('Failed to load watchlist');
      console.error('Error loading watchlist:', err);
    }
  }, [name]);

  // Fetch current stock data for all symbols/ Name in the watchlist
  const fetchStocks = useCallback(async () => {
    try {
      setError(null);
      const results: StockItem[] = [];
      
      // Loop through each stock symbol/Name  and fetch its data
      for (const symbol of symbols) {
        try {
          // API to get stock overview
          const res = await fetch(`https://www.alphavantage.co/query?function=OVERVIEW&symbol=${symbol}&apikey=0R4ZAFUAZRT2X4ZX`);
          const data = await res.json();
          
          // Add stock data to results
          results.push({
            symbol,
            name: data.Name || symbol,
            price: data['50DayMovingAverage'] || '0.00',
          });
        } catch {
          // If API call fails for a specific stock, add it with default values
          results.push({ symbol, name: symbol, price: '0.00' });
        }
      }
      setStocks(results);
    } catch (err) {
      setError('Failed to fetch stock data');
      console.error('Error fetching stocks:', err);
    }
  }, [symbols]);

  // Handle pull-to-refresh
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadWatchlist(); 
    await fetchStocks();   
    setRefreshing(false);
  }, [loadWatchlist, fetchStocks]);

  // Initialize data when component mounts
  useEffect(() => {
    const initializeData = async () => {
      setLoading(true);
      await loadWatchlist();
      setLoading(false);
    };
    initializeData();
  }, [loadWatchlist]);

  // Fetch stock data whenever symbols change
  useEffect(() => {
    if (symbols.length > 0) {
      fetchStocks();
    } else {
      setStocks([]); 
    }
  }, [symbols, fetchStocks]);

  // Process stock data for 2-column grid 
  const listData = useMemo(() => {
    const items: (StockItem | null)[] = [];
    
    // Process data in chunks of 2
    for (let i = 0; i < stocks.length; i += CONSTANTS.GRID_COLUMNS) {
      const row = stocks.slice(i, i + CONSTANTS.GRID_COLUMNS);
      
      // Ensure the grid always has 2 columns
      while (row.length < CONSTANTS.GRID_COLUMNS) {
        row.push(null as any);
      }
      items.push(...row);
    }
    return items;
  }, [stocks]);

  // refresh control for pull-to-refresh functionality
  const refreshControl = useMemo(() => (
    <RefreshControl
      refreshing={refreshing}
      onRefresh={onRefresh}
      colors={CONSTANTS.REFRESH_COLORS}
      tintColor={CONSTANTS.REFRESH_TINT_COLOR}
      accessibilityLabel="Pull to refresh"
      accessibilityHint="Pull down to refresh the stock data"
    />
  ), [refreshing, onRefresh]);

  // Render the appropriate content based on current state
  const renderContent = () => {
    // Show loading spinner
    if (loading) {
      return <LoadingState />;
    }
    
    // Show error message if something went wrong
    if (error) {
      return <ErrorState error={error} />;
    }
    
    // Show empty state if no stocks in watchlist
    if (stocks.length === 0) {
      return <EmptyState />;
    }
    
    // Show the stock grid if we have data
    return (
      <FlatList
        data={listData}
        renderItem={({ item, index }) => 
          item ? <StockCardItem item={item} index={index} /> : null
        }
        keyExtractor={(item, index) => item?.symbol || `placeholder-${index}`}
        numColumns={CONSTANTS.GRID_COLUMNS} // 2-column grid
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={refreshControl}
        accessibilityLabel={`Watchlist grid with ${stocks.length} stocks`}
        accessibilityHint="Grid layout showing stocks in your watchlist"
      />
    );
  };

  return (
    <View 
      style={[styles.container, { backgroundColor: theme.background }]}
      accessibilityLabel="Watchlist details screen"
      accessibilityHint={`Screen showing stocks in ${name} watchlist`}
    >
      {/* Status bar */}
      <StatusBar 
        backgroundColor={theme.background} 
        barStyle={theme.background === '#121212' ? 'light-content' : 'dark-content'} 
      />
      
      {/* Header with watchlist name and stock count */}
      <Header name={name} count={stocks.length} />
      
      {/* Main content */}
      {renderContent()}
    </View>
  );
};

// Styles for the component
const styles = StyleSheet.create({
  // Main container
  container: {
    flex: 1,
  },
  
  // Header section
  header: {
    paddingTop: 24,   
    paddingHorizontal: 20,
    paddingBottom: 16,  
  },
  
  // Header background 
  headerGradient: {
    padding: 20,         
    borderRadius: 20,    
    shadowColor: '#000', 
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1, 
    shadowRadius: 8,   
    elevation: 5,  
  },
  
  // Main title text 
  title: {
    fontSize: 28,        
    fontWeight: 'bold',  
    marginBottom: 4,     
  },
  
  // Subtitle text 
  subtitle: {
    fontSize: 16,        
    marginBottom: 12, 
  },
  
  // Badge number
  countBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(76, 175, 80, 0.1)', 
    paddingHorizontal: 12,  
    paddingVertical: 6,      
    borderRadius: 12,       
    borderWidth: 1,         
    borderColor: 'rgba(76, 175, 80, 0.3)', 
  },
  
  // Text inside the count badge
  countText: {
    fontSize: 14,      
    fontWeight: '600',  
  },
  
  // Centered content container
  centerContainer: {
    flex: 1,         
    justifyContent: 'center',
    alignItems: 'center',     
    paddingHorizontal: 40,    
    minHeight: CONSTANTS.MIN_HEIGHT, 
  },
  
  // Loading state
  loadingContainer: {
    padding: 30,        
    borderRadius: 20,    
    alignItems: 'center', 
    shadowColor: '#000', 
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,  
    shadowRadius: 8,     
    elevation: 5,       
  },
  
  // Loading text 
  loadingText: {
    marginTop: 16,       
    fontSize: 16,        
    textAlign: 'center',
  },
  
  // Error state 
  errorContainer: {
    padding: 30,         
    borderRadius: 20,    
    alignItems: 'center', 
    shadowColor: '#000', 
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1, 
    shadowRadius: 8,    
    elevation: 5,      
  },
  
  // Error icon
  errorIcon: {
    fontSize: 48,       
    marginBottom: 16, 
  },
  
  // Error message text
  errorText: {
    fontSize: 18,        
    fontWeight: '600',   
    textAlign: 'center', 
    marginBottom: 8,   
  },
  
  // Retry text
  retryText: {
    fontSize: 14,        
    textAlign: 'center', 
  },
  
  // Empty state container 
  emptyContainer: {
    padding: 30,        
    borderRadius: 20,   
    alignItems: 'center', 
    shadowColor: '#000', 
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,  
    shadowRadius: 8,     
    elevation: 5,        
  },
  
  // Empty state icon
  emptyIcon: {
    fontSize: 48,        
    marginBottom: 16,    
  },
  
  // Empty state main text
  emptyText: {
    fontSize: 18,        
    fontWeight: '600',  
    textAlign: 'center', 
    marginBottom: 8,   
  },
  
  // Empty state subtitle text
  emptySubtext: {
    fontSize: 14,       
    textAlign: 'center', 
  },
  
  // List content 
  listContent: {
    paddingHorizontal: 16, 
    paddingBottom: 20,    
  },
  
  // Row style for the grid 
  row: {
    marginBottom: CONSTANTS.ROW_SPACING, 
  },
  
  // Individual card 
  cardContainer: {
    marginBottom: CONSTANTS.ROW_SPACING, 
  },
});

export default React.memo(WatchlistDetailsScreen);