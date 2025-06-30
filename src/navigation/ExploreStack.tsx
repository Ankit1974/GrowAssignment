import React, { useState } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useTheme } from '../ThemeContext';
import { ExploreStackParamList } from '../types/navigation';
import ExploreScreen from '../screens/ExploreScreen';
import TopGainerScreen from '../screens/TopGainerScreen';
import TopLoserScreen from '../screens/TopLoserScreen';
import StockDetailsScreen from '../screens/StockDetailsScreen';
import AddToWatchlistModal from '../screens/AddToWatchlistModal';

// stack navigator for route params
const Stack = createNativeStackNavigator<ExploreStackParamList>();

/**
 * ExploreStack
 *
 * This component sets up the navigation stack for the Explore section of the app.
 * It manages navigation between the Explore home, Top Gainers, Top Losers, and Stock Details screens.
 * It also manages the state for showing the AddToWatchlistModal when the bookmark icon is pressed.
 */
const ExploreStack = () => {
  // Get the current theme from context for styling
  const { theme } = useTheme();

  // State to control the visibility of the AddToWatchlistModal
  const [watchlistModalVisible, setWatchlistModalVisible] = useState(false);
  // State to store the symbol of the stock to add to the watchlist
  const [modalSymbol, setModalSymbol] = useState<string | null>(null);

  return (
    <>
      {/* Stack Navigator for Explore section */}
      <Stack.Navigator 
        initialRouteName="ExploreHome"
        screenOptions={{
          headerStyle: {
            backgroundColor: theme.card,
          },
          headerTintColor: theme.text, 
          headerTitleStyle: {
            fontWeight: 'bold', 
          },
          headerShadowVisible: false,
        }}
      >
        {/* Main Explore screen */}
        <Stack.Screen name="ExploreHome" component={ExploreScreen} options={{ headerShown: false }} />
        {/* Top Gainers screen */}
        <Stack.Screen name="TopGainer" component={TopGainerScreen} options={{ title: 'Top Gainers' }} />
        {/* Top Losers screen */}
        <Stack.Screen name="TopLoser" component={TopLoserScreen} options={{ title: 'Top Losers' }} />
        {/* Stock Details screen with a bookmark icon in the header */}
        <Stack.Screen 
          name="StockDetails" 
          component={StockDetailsScreen} 
          options={({ route }: { route: RouteProp<ExploreStackParamList, 'StockDetails'> }) => ({
            title: 'Stock Details',
            // Add a bookmark icon to the header's right side
            headerRight: () => (
              <Icon
                name="bookmark-border"
                size={28}
                color={theme.text}
                style={{ marginRight: 16 }}
                onPress={() => {
                  // When pressed, open the AddToWatchlistModal for the current stock symbol
                  setModalSymbol(route.params.symbol);
                  setWatchlistModalVisible(true);
                }}
              />
            ),
          })} 
        />
      </Stack.Navigator>
      {/* Modal for adding a stock to the watchlist */}
      <AddToWatchlistModal
        visible={watchlistModalVisible}
        onClose={() => setWatchlistModalVisible(false)} 
        symbol={modalSymbol || ''} // Pass the selected stock symbol
      />
    </>
  );
};

export default ExploreStack;
