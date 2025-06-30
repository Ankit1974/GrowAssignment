// Environment configuration for the app
export const ENV = {
  // API Configuration
  ALPHA_VANTAGE_API_KEY: process.env.ALPHA_VANTAGE_API_KEY || 'demo',
  
  // App Configuration
  APP_NAME: process.env.APP_NAME || 'GrowAssignment',
  APP_VERSION: process.env.APP_VERSION || '1.0.0',
  
  // Feature Flags
  ENABLE_ANALYTICS: process.env.ENABLE_ANALYTICS === 'true',
  ENABLE_CRASH_REPORTING: process.env.ENABLE_CRASH_REPORTING === 'true',
  
  // Development/Production flags
  IS_DEVELOPMENT: __DEV__,
  IS_PRODUCTION: !__DEV__,
} as const;

// Validation function to ensure required environment variables are set
export const validateEnvironment = (): void => {
  const requiredVars = [
    'ALPHA_VANTAGE_API_KEY',
  ];
  
  const missingVars = requiredVars.filter(varName => {
    const value = process.env[varName];
    return !value || value === 'demo';
  });
  
  if (missingVars.length > 0 && ENV.IS_PRODUCTION) {
    console.warn(
      'Missing required environment variables:',
      missingVars.join(', ')
    );
  }
  
  // Additional security check for API key format
  if (ENV.ALPHA_VANTAGE_API_KEY && ENV.ALPHA_VANTAGE_API_KEY !== 'demo') {
    const apiKeyPattern = /^[A-Z0-9]{16}$/;
    if (!apiKeyPattern.test(ENV.ALPHA_VANTAGE_API_KEY)) {
      console.warn('Warning: API key format appears to be invalid. Please check your ALPHA_VANTAGE_API_KEY.');
    }
  }
};


validateEnvironment(); 