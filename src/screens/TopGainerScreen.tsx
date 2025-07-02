import React, { useEffect, useCallback, useMemo } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  RefreshControl, 
  ActivityIndicator,
  StatusBar,
  ListRenderItem
} from 'react-native';
import StockCard from '../components/StockCard';
import { useTheme } from '../ThemeContext';
import { StockItem } from '../services/api';
import { useTopGainers } from '../hooks/useStockData';
import { PERFORMANCE_CONFIG, getItemLayout } from '../utils/performance';
import { responsive, borderRadius, fontSize, device } from '../utils/responsive';

// control the layout, spacing, and visual
const CONSTANTS = {
  GRID_COLUMNS: device.isTablet ? 3 : 2, 
  REFRESH_COLORS: ['#4CAF50', '#2196F3'] as string[], 
  REFRESH_TINT_COLOR: '#4CAF50',
  MIN_HEIGHT: 300, 
  CARD_SPACING: responsive.margin.sm, 
  ROW_SPACING: responsive.margin.md, 
  CARD_HEIGHT: 140, 
} as const;

// type safety
interface RenderItemProps {
  item: StockItem; // stock data
  index: number;   // Position in the list 
}


 // Loading State 
const LoadingState = React.memo(() => {
  const { theme } = useTheme(); 
  
  return (
    <View 
      style={styles.centerContainer}
      accessibilityLabel="Loading top gainers"
      accessibilityHint="Please wait while we fetch the latest stock data"
    >
      <View style={[styles.loadingContainer, { backgroundColor: theme.card }]}>
        {/* Spinning indicator */}
        <ActivityIndicator size="large" color={CONSTANTS.REFRESH_TINT_COLOR} />
        {/* Loading message */}
        <Text style={[styles.loadingText, { color: theme.textSecondary }]}>
          Loading top gainers...
        </Text>
      </View>
    </View>
  );
});


 // Error State 
const ErrorState = React.memo<{ error: string }>(({ error }) => {
  const { theme } = useTheme();
  
  return (
    <View 
      style={styles.centerContainer}
      accessibilityLabel="Error loading data"
      accessibilityHint="There was an error loading the stock data. Pull down to refresh."
    >
      <View style={[styles.errorContainer, { backgroundColor: theme.card }]}>
        {/* Warning */}
        <Text style={styles.errorIcon}>⚠️</Text>
        {/* Error message */}
        <Text style={[styles.errorText, { color: theme.text }]}>
          {error}
        </Text>
        {/* Instructions */}
        <Text style={[styles.retryText, { color: theme.textSecondary }]}>
          Pull down to refresh
        </Text>
      </View>
    </View>
  );
});

/**
 * Empty State 
 * Shows when no data is available 
 */
const EmptyState = React.memo(() => {
  const { theme } = useTheme();
  
  return (
    <View 
      style={styles.centerContainer}
      accessibilityLabel="No top gainers available"
      accessibilityHint="There are currently no top gainers to display"
    >
      <View style={[styles.emptyContainer, { backgroundColor: theme.card }]}>
        <Text style={styles.emptyIcon}>📈</Text>
        {/* empty state message */}
        <Text style={[styles.emptyText, { color: theme.text }]}>
          No top gainers available
        </Text>
        <Text style={[styles.emptySubtext, { color: theme.textSecondary }]}>
          Check back later for updates
        </Text>
      </View>
    </View>
  );
});

 // Shows the title, subtitle, and count of stocks
const Header = React.memo<{ count: number }>(({ count }) => {
  const { theme } = useTheme();
  
  return (
    <View 
      style={styles.header}
      accessibilityLabel="Top gainers header"
      accessibilityHint="Shows today's biggest winning stocks"
    >
      <View style={[styles.headerGradient, { backgroundColor: theme.primaryLight }]}>
        <Text style={[styles.title, { color: theme.text }]}>
          🚀 Top Gainers
        </Text>
        <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
          Today's biggest winners
        </Text>
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

 // Individual Stock Card 
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
      accessibilityLabel={`Stock card for ${item.ticker}`}
      accessibilityHint={`Tap to view details for ${item.ticker} stock`}
    > 
      {/* Show stock card */}
      <StockCard 
        name={item.ticker} 
        symbol={item.ticker} 
        price={item.price}
        priceColor={CONSTANTS.REFRESH_TINT_COLOR}
        changeAmount={item.change_amount}
        changePercentage={item.change_percentage}
      />
    </View>
  );
});

/**
 * TopGainerScreen Component
 * 
 * This screen displays today's top performing stocks in a 2-column grid.
 
 */
const TopGainerScreen = () => {
  const { theme } = useTheme();
  
  // Custom hook  for the managment of  the data fetching, loading states, and refresh logic
  // This hook handles API calls, error handling, and state management
  const { data, loading, refreshing, error, fetchData, onRefresh } = useTopGainers();

  useEffect(() => {
    fetchData();
  }, []); 

  const listData = useMemo(() => {
    const items: (StockItem | null)[] = [];
    
    // Process data in chunks of 2 
    for (let i = 0; i < data.length; i += CONSTANTS.GRID_COLUMNS) {
      const row = data.slice(i, i + CONSTANTS.GRID_COLUMNS);
      
      
      // ensures the grid always has 2 columns, even with odd numbers of stocks
      while (row.length < CONSTANTS.GRID_COLUMNS) {
        row.push(null as any);
      }
      items.push(...row);
    }
    return items;
  }, [data]);

  // refresh control 
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

  // function for FlatList performance
  const getItemLayoutOptimized = useMemo(() => 
    getItemLayout(CONSTANTS.CARD_HEIGHT, 0, CONSTANTS.GRID_COLUMNS),
    []
  );

   // Shows loading spinner, error message, empty state, or the stock grid
  const renderContent = () => {
    if (loading) {
      return <LoadingState />;
    }
    
    // Show error message if something went wrong
    if (error) {
      return <ErrorState error={error} />;
    }
    
    // Show empty state if no data is available
    if (data.length === 0) {
      return <EmptyState />;
    }
    
    // Show the stock grid if we have data 
    return (
      <FlatList
        data={listData}
        renderItem={({ item, index }) => 
          item ? <StockCardItem item={item} index={index} /> : null
        }
        // Generate unique keys for each item
        keyExtractor={(item, index) => item?.ticker || `placeholder-${index}`}
        // 2-column grid layout
        numColumns={CONSTANTS.GRID_COLUMNS}
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={refreshControl}
        accessibilityLabel={`Top gainers grid with ${data.length} stocks`}
        accessibilityHint="Grid layout showing top performing stocks"
        removeClippedSubviews={PERFORMANCE_CONFIG.REMOVE_CLIPPED_SUBVIEWS}
        maxToRenderPerBatch={PERFORMANCE_CONFIG.MAX_TO_RENDER_PER_BATCH}
        windowSize={PERFORMANCE_CONFIG.WINDOW_SIZE}
        initialNumToRender={PERFORMANCE_CONFIG.INITIAL_NUM_TO_RENDER}
        getItemLayout={getItemLayoutOptimized}
        updateCellsBatchingPeriod={50}
        disableVirtualization={false}
      />
    );
  };

  return (
    <View 
      style={[styles.container, { backgroundColor: theme.background }]}
      accessibilityLabel="Top gainers screen"
      accessibilityHint="Screen showing today's top performing stocks"
    >
      <StatusBar 
        backgroundColor={theme.background} 
        barStyle={theme.background === '#121212' ? 'light-content' : 'dark-content'} 
      />
      
      <Header count={data.length} />
      
      {renderContent()}
    </View>
  );
};


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
  
  // Badge showing number 
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
  
  // centered content 
  centerContainer: {
    flex: 1,            
    justifyContent: 'center', 
    alignItems: 'center',     
    paddingHorizontal: 40,    
    minHeight: CONSTANTS.MIN_HEIGHT, 
  },
  
  // loading state
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
  
  // error state
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
  
  // Error message 
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
  
  // empty state
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
  
  // Empty state text 
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
  
  // list content
  listContent: {
    paddingHorizontal: 16, 
    paddingBottom: 20,     
  },
  
  // Row styl for the grid
  row: {
    marginBottom: CONSTANTS.ROW_SPACING, 
  },
  
  // Individual card container styl
  cardContainer: {
    marginBottom: CONSTANTS.ROW_SPACING, 
  },
});

export default React.memo(TopGainerScreen);
