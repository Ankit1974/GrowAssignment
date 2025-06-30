import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import type { RouteProp } from '@react-navigation/native';
import { useTheme } from '../ThemeContext';
import { WatchlistStackParamList } from '../types/navigation';
import WatchlistScreen from '../screens/WatchlistScreen';
import WatchlistDetailsScreen from '../screens/WatchlistDetailsScreen';
import Icon from 'react-native-vector-icons/MaterialIcons';

const Stack = createStackNavigator<WatchlistStackParamList>();

const WatchlistStack = () => {
  const { theme } = useTheme();

  return (
    <Stack.Navigator
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
      <Stack.Screen
        name="WatchlistHome"
        component={WatchlistScreen}
        options={({ navigation }) => ({
          title: 'Watchlist',
          headerLeft: () => (
            <Icon
              name="arrow-back"
              size={24}
              color="#222"
              style={{ marginLeft: 16, marginRight: 34 }}
              onPress={() => navigation.goBack()}
            />
          ),
        })}
      />
      <Stack.Screen
        name="WatchlistDetails"
        component={WatchlistDetailsScreen}
        options={({ route }: { route: RouteProp<WatchlistStackParamList, 'WatchlistDetails'> }) => ({
          title: route.params.name,
        })}
      />
    </Stack.Navigator>
  );
};

export default WatchlistStack;