//import 'react-native-gesture-handler';
import React from 'react';
import { ThemeProvider } from './src/ThemeContext';
import { NavigationContainer } from '@react-navigation/native';
import TabNavigator from './src/navigation/TabNavigator';

export default function App() {
  return (
    <ThemeProvider>
      <NavigationContainer>
        <TabNavigator />
      </NavigationContainer>
    </ThemeProvider>
  );
}
