import { spacing, fontSize, borderRadius } from './utils/responsive';

export const lightTheme = {
  background: '#f8f9fa',
  card: '#ffffff',
  cardSecondary: '#f8f9fa',
  text: '#1a1a1a',
  textSecondary: '#6c757d',
  textMuted: '#adb5bd',
  border: '#e9ecef',
  primary: '#007bff',
  primaryLight: '#e3f2fd',
  success: '#28a745',
  successLight: '#d4edda',
  danger: '#dc3545',
  dangerLight: '#f8d7da',
  warning: '#ffc107',
  warningLight: '#fff3cd',
  shadow: '#e0e0e0',
  elevation: 4,
  // Responsive spacing
  spacing,
  fontSize,
  borderRadius,
};

export const darkTheme = {
  background: '#121212',
  card: '#1e1e1e',
  cardSecondary: '#2d2d2d',
  text: '#ffffff',
  textSecondary: '#b0b0b0',
  textMuted: '#808080',
  border: '#333333',
  primary: '#4f8cff',
  primaryLight: '#1a2332',
  success: '#4caf50',
  successLight: '#1b3a1b',
  danger: '#f44336',
  dangerLight: '#3a1b1b',
  warning: '#ff9800',
  warningLight: '#3a2a1b',
  shadow: '#000000',
  elevation: 8,
  // Responsive spacing
  spacing,
  fontSize,
  borderRadius,
};

export type Theme = typeof lightTheme;
