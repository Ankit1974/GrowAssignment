import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTheme } from '../ThemeContext';
import { ExploreStackParamList } from '../types/navigation';

// Props interface for the StockCard component
interface StockCardProps {
  name: string;        // company name
  symbol: string;      // Stock symbol
  price: string;       // Current stock price 
  onPress?: () => void; // Optional custom press handler
  priceColor?: string;  // Optional custom color for price text
  changeAmount?: string; // Optional change amount
  changePercentage?: string; // Optional change percentage
}

/**
 * StockCard Component
 * 
 * A card component that displays stock information.
 * Each card shows:
 * - Company initial
 * - Stock symbol
 * - Current price
 * - Optional change information
 * 
 */
const StockCard: React.FC<StockCardProps> = React.memo(({ 
  name, 
  symbol, 
  price, 
  onPress, 
  priceColor,
  changeAmount,
  changePercentage 
}) => {
  // Get navigation object for navigation
  const navigation = useNavigation<NativeStackNavigationProp<ExploreStackParamList>>();
  
  // Get current theme for styling
  const { theme } = useTheme();

  // Generate a vibrant color based on the symbol
  const getVibrantColor = (symbol: string) => {
    const colors = [
      '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
      '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9',
      '#F8C471', '#82E0AA', '#F1948A', '#85C1E9', '#D7BDE2'
    ];
    const index = symbol.charCodeAt(0) % colors.length;
    return colors[index];
  };

  const vibrantColor = getVibrantColor(symbol);

  /**
   * Handle card press events
   * navigate to the stock details screen
   */
  const handlePress = React.useCallback(() => {
    if (onPress) {
      onPress();
    } else {
      // Navigate to stock details screen with the stock symbol
      navigation.navigate('StockDetails', { symbol });
    }
  }, [onPress, navigation, symbol]);

  return (
    <TouchableOpacity 
      style={[
        styles.card, 
        { 
          backgroundColor: theme.card,
          borderColor: vibrantColor + '20',
          shadowColor: vibrantColor,
        }
      ]} 
      onPress={handlePress}
      activeOpacity={0.8}
    >
      {/* Colorful accent at top */}
      <View style={[styles.topAccent, { backgroundColor: vibrantColor }]} />
      
      {/* Header with company initial and symbol */}
      <View style={styles.header}>
        <View style={[styles.circle, { backgroundColor: vibrantColor + '20' }]}>
          <Text style={[styles.circleLetter, { color: vibrantColor }]}>
            {name.charAt(0).toUpperCase()}
          </Text>
        </View>
        <Text style={[styles.symbol, { color: theme.text }]} numberOfLines={1}>
          {symbol}
        </Text>
      </View>
      
      {/* Price section */}
      <View style={styles.priceSection}>
        <Text style={[styles.price, { color: priceColor || '#4CAF50' }]}>
          ${parseFloat(price).toFixed(2)}
        </Text>
        
        {/* Change information if available */}
        {(changeAmount || changePercentage) && (
          <View style={styles.changeContainer}>
            {changeAmount && (
              <View style={[styles.changeBadge, { backgroundColor: (priceColor || '#4CAF50') + '15' }]}>
                <Text style={[styles.changeAmount, { color: priceColor || '#4CAF50' }]}>
                  +${parseFloat(changeAmount).toFixed(2)}
                </Text>
              </View>
            )}
            {changePercentage && (
              <View style={[styles.changeBadge, { backgroundColor: (priceColor || '#4CAF50') + '15' }]}>
                <Text style={[styles.changePercentage, { color: priceColor || '#4CAF50' }]}>
                  +{parseFloat(changePercentage).toFixed(2)}%
                </Text>
              </View>
            )}
          </View>
        )}
      </View>

      {/* accent line */}
      <View style={[styles.accentLine, { backgroundColor: vibrantColor }]} />
    </TouchableOpacity>
  );
});

// Styles for the StockCard component
const styles = StyleSheet.create({
  // Main card container
  card: {
    flex: 1,
    padding: 16,
    borderWidth: 1,
    borderRadius: 16,
    minHeight: 120,
    position: 'relative',
    overflow: 'hidden',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  
  // Top accent line
  topAccent: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 4,
  },
  
  // Header section with company initial and symbol
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    marginTop: 4,
  },
  
  // Circular container for company initial
  circle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  // Stock symbol text 
  symbol: {
    fontWeight: '700',
    fontSize: 16,
    flex: 1,
  },

  // Company initial text inside circle
  circleLetter: {
    fontSize: 18,
    fontWeight: 'bold',
  },

  // Price section
  priceSection: {
    flex: 1,
    justifyContent: 'flex-end',
  },

  // Price text
  price: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
  },

  // Change information container
  changeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },

  // Change badge
  changeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },

  // Change amount text
  changeAmount: {
    fontSize: 12,
    fontWeight: '600',
  },

  // Change percentage text
  changePercentage: {
    fontSize: 12,
    fontWeight: '600',
  },

  // Decorative accent line at bottom
  accentLine: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 3,
  },
});

export default StockCard;