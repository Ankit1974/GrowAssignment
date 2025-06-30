import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { WatchlistStackParamList } from '../types/navigation';
import { useTheme } from '../ThemeContext';
import { PERFORMANCE_CONFIG, getItemLayout } from '../utils/performance';

// Storage key for saving/loading watchlists from device storage
const STORAGE_KEY = 'watchlists';

interface WatchlistItem {
  name: string;
}

/**
 * WatchlistScreen Component
 * 
 * Features:
 * - Loads watchlists from device storage
 * - Displays each watchlist with a unique color
 * - Navigates to watchlist details on tap
 * - Shows empty state when no watchlists exist
 */
const WatchlistScreen: React.FC = React.memo(() => {
  const [watchlists, setWatchlists] = useState<WatchlistItem[]>([]);
  
  // Navigation hook
  const navigation = useNavigation<NativeStackNavigationProp<WatchlistStackParamList>>();
  
  // Theme hook
  const { theme } = useTheme();

   // Loads watchlists from device storage when the screen comes into focus
  useEffect(() => {
    const load = async () => {
      try {
        // Get stored watchlists from AsyncStorage
        const data = await AsyncStorage.getItem(STORAGE_KEY);
        if (data) {
          // Parse the JSON data and extract watchlist names
          const parsed = JSON.parse(data);
          setWatchlists(parsed.map((wl: any) => ({ name: wl.name })));
        }
      } catch (error) {
        console.error('Error loading watchlists:', error);
        // If there's an error, set empty array to prevent crashes
        setWatchlists([]);
      }
    };

    // when this screen comes into focus and reload data
    const unsubscribe = navigation.addListener('focus', load);
    
    // Clean up the listener
    return unsubscribe;
  }, [navigation]);

  const getVibrantColor = useMemo(() => (name: string) => {
    const colors = [
      '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
      '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9',
      '#F8C471', '#82E0AA', '#F1948A', '#85C1E9', '#D7BDE2'
    ];
    
    // Use the first character of the name to consistently pick a color
    const index = name.charCodeAt(0) % colors.length;
    return colors[index];
  }, []);

   // Renders each individual watchlist item in the list
  const renderWatchlistItem = useCallback(({ item }: { item: WatchlistItem }) => {
    // Get a unique color
    const vibrantColor = getVibrantColor(item.name);
    
    return (
      <TouchableOpacity
        style={[
          styles.row,
          { 
            backgroundColor: theme.card,
            borderLeftColor: vibrantColor,
            shadowColor: theme.shadow,
          }
        ]}
        onPress={() => navigation.navigate('WatchlistDetails', { name: item.name })}
        activeOpacity={0.8} 
      >
        <View style={styles.rowContent}>
          {/* Icon container with colored background */}
          <View style={[styles.iconContainer, { backgroundColor: vibrantColor + '20' }]}>
            <Icon name="bookmark" size={20} color={vibrantColor} />
          </View>
          
          {/* Watchlist name */}
          <Text style={[styles.name, { color: theme.text }]}>{item.name}</Text>
        </View>
        <Icon name="chevron-right" size={24} color={theme.textMuted} />
      </TouchableOpacity>
    );
  }, [navigation, theme, getVibrantColor]);


  const getItemLayoutOptimized = useMemo(() => 
    getItemLayout(80, 0, 1),
    []
  );

   // Extracts unique key for each watchlist item
  const keyExtractor = useCallback((item: WatchlistItem) => item.name, []);

   // Renders the separator line between watchlist items
  const ItemSeparatorComponent = useCallback(() => (
    <View style={[styles.separator, { backgroundColor: theme.border }]} />
  ), [theme.border]);

   // Renders the empty state when no watchlists exist
  const ListEmptyComponent = useCallback(() => (
    <View style={styles.emptyContainer}>
      <View style={[styles.emptyIconContainer, { backgroundColor: theme.cardSecondary }]}>
        <Icon name="bookmark-border" size={48} color={theme.textMuted} />
      </View>
      <Text style={[styles.empty, { color: theme.textSecondary }]}>No watchlists yet.</Text>
    </View>
  ), [theme.cardSecondary, theme.textMuted, theme.textSecondary]);

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <FlatList
        data={watchlists}
        keyExtractor={keyExtractor}
        renderItem={renderWatchlistItem}
        ItemSeparatorComponent={ItemSeparatorComponent}
        ListEmptyComponent={ListEmptyComponent}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        maxToRenderPerBatch={PERFORMANCE_CONFIG.MAX_TO_RENDER_PER_BATCH}
        windowSize={PERFORMANCE_CONFIG.WINDOW_SIZE}
        initialNumToRender={PERFORMANCE_CONFIG.INITIAL_NUM_TO_RENDER}
        removeClippedSubviews={PERFORMANCE_CONFIG.REMOVE_CLIPPED_SUBVIEWS}
        getItemLayout={getItemLayoutOptimized}
      />
    </View>
  );
});

// Styles for the component
const styles = StyleSheet.create({
  // Main container
  container: { 
    flex: 1, 
    paddingTop: 24
  },
  
  // Container for the FlatList 
  listContainer: {
    paddingHorizontal: 16, 
    paddingBottom: 20,
  },
  
  // Individual watchlist row
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    justifyContent: 'space-between',
    borderRadius: 12, 
    marginVertical: 4, 
    borderLeftWidth: 4, 
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3, 
    height: 80,
  },
  
  // Container for the main content of each row
  rowContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1, 
  },
  
  // container for the bookmark icon
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18, 
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12, 
  },
  
  // Watchlist name text
  name: { 
    fontSize: 16,
    fontWeight: '500', 
    flex: 1,
  },
  
  // Separator line between items
  separator: { 
    height: 1, 
    marginLeft: 16,
    marginRight: 16,
  },
  
  // Container for empty state
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  
  // Circular container for empty state icon
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40, 
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  
  // Empty state text 
  empty: { 
    fontSize: 16,
    textAlign: 'center',
  },
});

export default WatchlistScreen;