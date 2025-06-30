import React, { useMemo } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useTheme } from '../ThemeContext';
import ExploreStack from './ExploreStack';
import WatchlistStack from './WatchlistStack';

// bottom tab navigator instance
const Tab = createBottomTabNavigator();

/**
 * TabNavigator Component
 * 
 * Main tab navigation component that handles the bottom tab navigation
 * between Explore and Watchlist sections. 
 * 
 */
const TabNavigator: React.FC = () => {
  // Get current theme from context 
  const { theme } = useTheme();


  
  const tabBarScreenOptions = useMemo(() => ({
    // Hide headers since each stack handles its own navigation
    headerShown: false,
    
    // Tab bar styling based on current theme
    tabBarStyle: {
      backgroundColor: theme.card,
      borderTopColor: theme.border,
      borderTopWidth: 1,
      elevation: theme.elevation,
      shadowColor: theme.shadow,
    },
    
    // Tab bar colors for active and inactive states
    tabBarActiveTintColor: theme.primary,
    tabBarInactiveTintColor: theme.textSecondary,
    
    // Tab label styling
    tabBarLabelStyle: {
      fontSize: 12,
      fontWeight: '500' as const,
    },
  }), [theme]);

  // Tab screen configurations
  const exploreTabOptions = {
    tabBarIcon: ({ color, size }: { color: string; size: number }) => (
      <Icon name="explore" size={size} color={color} />
    ),
  };

  const watchlistTabOptions = {
    tabBarIcon: ({ color, size }: { color: string; size: number }) => (
      <Icon name="bookmark" size={size} color={color} />
    ),
  };

  return (
    <Tab.Navigator 
      initialRouteName="Explore"
      screenOptions={tabBarScreenOptions}
    >
      {/* Explore Tab */}
      <Tab.Screen 
        name="Explore" 
        component={ExploreStack} 
        options={exploreTabOptions}
      />
      
      {/* Watchlist Tab */}
      <Tab.Screen 
        name="Watchlist" 
        component={WatchlistStack} 
        options={watchlistTabOptions}
      />
    </Tab.Navigator>
  );
};

export default TabNavigator;