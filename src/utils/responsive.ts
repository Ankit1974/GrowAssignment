import { Dimensions, PixelRatio } from 'react-native';

// Screen size detection
const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
const isTablet = screenWidth > 768;
const isLargeTablet = screenWidth > 1024;

// Base width for scaling (iPhone standard)
const baseWidth = 375;

// Responsive scaling function
export const scale = (size: number): number => {
  const newSize = size * (screenWidth / baseWidth);
  return Math.round(PixelRatio.roundToNearestPixel(newSize));
};

// Responsive spacing system
export const spacing = {
  xs: scale(4),
  sm: scale(8),
  md: scale(16),
  lg: scale(24),
  xl: scale(32),
  xxl: scale(48),
};

// Responsive font sizes
export const fontSize = {
  xs: scale(12),
  sm: scale(14),
  md: scale(16),
  lg: scale(18),
  xl: scale(20),
  xxl: scale(24),
  xxxl: scale(32),
};

// Responsive border radius
export const borderRadius = {
  sm: scale(4),
  md: scale(8),
  lg: scale(12),
  xl: scale(16),
  xxl: scale(24),
};

// Device type helpers
export const device = {
  isTablet,
  isLargeTablet,
  isPhone: !isTablet,
  screenWidth,
  screenHeight,
};

// Responsive padding/margin helpers
export const responsive = {
  padding: {
    xs: spacing.xs,
    sm: spacing.sm,
    md: spacing.md,
    lg: spacing.lg,
    xl: spacing.xl,
    xxl: spacing.xxl,
  },
  margin: {
    xs: spacing.xs,
    sm: spacing.sm,
    md: spacing.md,
    lg: spacing.lg,
    xl: spacing.xl,
    xxl: spacing.xxl,
  },
  // Responsive container padding based on device
  containerPadding: isTablet ? spacing.xl : spacing.md,
  // Responsive card spacing
  cardSpacing: isTablet ? spacing.lg : spacing.md,
}; 