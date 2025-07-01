# 📈 GrowAssignment - Stock Market App

A modern React Native application for tracking stock market data with real-time updates, watchlist management, and beautiful UI.

![React Native](https://img.shields.io/badge/React%20Native-0.80.0-blue)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0.4-blue)
![License](https://img.shields.io/badge/License-MIT-green)

## ✨ Features

- 📊 **Real-time Stock Data** - Top gainers and losers from Alpha Vantage API
- 🔍 **Smart Search** - Debounced search with local + API results
- 📋 **Watchlist Management** - Create and manage multiple watchlists
- 📱 **Stock Details** - Interactive charts and detailed information
- 🌙 **Dark/Light Theme** - Smooth theme switching
- ⚡ **Performance Optimized** - Fast scrolling and efficient data loading

## 🚀 Quick Start

### Prerequisites

- Node.js >= 18
- React Native CLI
- Android Studio (Android) / Xcode (iOS)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd GrowAssignment
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Setup environment**
   
   Create a `.env` file in the root directory with your API key:
   ```bash
   # Create .env file
   echo "ALPHA_VANTAGE_API_KEY=your_actual_api_key_here" > .env
   ```
   
   Or manually create `.env` file and add:
   ```
   ALPHA_VANTAGE_API_KEY=your_actual_api_key_here
   ```

4. **Run the app**

   **Android:**
   ```bash
   npm run android
   ```

   **iOS:**
   ```bash
   npm run ios
   ```

   **Start Metro:**
   ```bash
   npm start
   ```

## 📱 Screens

| Screen | Purpose | Key Features |
|--------|---------|--------------|
| **Explore** | Main discovery screen | Search, Top Gainers/Losers, Real-time data |
| **Top Gainers** | Best performing stocks | Grid layout, Price updates, Navigation |
| **Top Losers** | Worst performing stocks | Grid layout, Price updates, Navigation |
| **Stock Details** | Individual stock view | Charts, Add to watchlist, Company info |
| **Watchlist** | Manage watchlists | Multiple lists, Persistent storage |
| **Watchlist Details** | View watchlist stocks | Add/remove stocks, Performance tracking |
| **Add to Watchlist** | Modal for adding stocks | Create new or select existing watchlist |

## 🏗️ Project Structure

```
src/
├── components/          # Reusable components
│   └── StockCard.tsx   # Stock display card
├── navigation/         # Navigation setup
│   ├── TabNavigator.tsx
│   ├── ExploreStack.tsx
│   └── WatchlistStack.tsx
├── screens/            # All app screens
├── services/           # API and data services
│   └── api.ts         # Alpha Vantage API integration
├── theme.ts           # Theme definitions
├── ThemeContext.tsx   # Theme management
└── utils/             # Performance utilities
```

## 🛠️ Tech Stack

- **React Native** 0.80.0
- **React** 19.1.0
- **TypeScript** 5.0.4
- **React Navigation** v7
- **Alpha Vantage API** - Stock market data
- **AsyncStorage** - Local data persistence
- **React Native Chart Kit** - Stock charts

## 🔧 Available Scripts

```bash
npm start          # Start Metro bundler
npm run android    # Run on Android
npm run ios        # Run on iOS
npm test           # Run tests
npm run lint       # Lint code
```

## 📊 API Integration

The app uses **Alpha Vantage API** for real-time stock data:

- **TOP_GAINERS_LOSERS** - Fetch top gainers and losers
- **SYMBOL_SEARCH** - Search for stocks
- **TIME_SERIES_DAILY** - Historical data for charts

### API Features
- ✅ Error handling with retry logic
- ✅ Data validation
- ✅ Rate limiting protection
- ✅ Request timeout management

## 🔒 Security

### API Key Management
- **Environment Variables**: All API keys are stored in environment variables
- **No Hardcoded Keys**: The app never contains hardcoded API keys in source code
- **Git Ignore**: `.env` files are automatically ignored by Git
- **Validation**: API key format is validated at runtime

### Best Practices
- ✅ Use environment variables for sensitive data
- ✅ Never commit API keys to version control
- ✅ Use different keys for development and production
- ✅ Monitor API usage and rate limits
- ✅ Validate API responses before processing

### Security Features
- **Input Validation**: All user inputs are validated
- **Error Handling**: Secure error messages that don't expose sensitive data
- **Data Sanitization**: API responses are validated and sanitized
- **Timeout Protection**: API requests have timeout limits

## 🎨 Theming

The app supports both light and dark themes:

- **Light Theme**: Clean white backgrounds, dark text
- **Dark Theme**: Dark backgrounds, light text
- **Dynamic Switching**: Toggle themes at runtime
- **Context-based**: React Context for theme management

## ⚡ Performance Optimizations

- **React.memo** - Prevents unnecessary re-renders
- **useCallback/useMemo** - Function and value memoization
- **FlatList optimizations** - getItemLayout, removeClippedSubviews
- **Debounced search** - Reduces API calls
- **Parallel API requests** - Faster data loading

## 📱 Platform Support

| Platform | Minimum Version | Target Version |
|----------|----------------|----------------|
| Android | API 21 (5.0) | Latest stable |
| iOS | 12.0 | Latest stable |

## 🧪 Testing

```bash
npm test
```

Includes:
- Unit tests for components
- Integration tests for API
- Performance monitoring

## 🚀 Build & Deploy

### Android
```bash
cd android
./gradlew assembleRelease
```

### iOS
```bash
cd ios
xcodebuild -workspace GrowAssignment.xcworkspace -scheme GrowAssignment -configuration Release
```

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Troubleshooting

### Common Issues

**Metro bundler issues:**
```bash
npx react-native start --reset-cache
```

**Android build issues:**
```bash
cd android && ./gradlew clean
```

**iOS build issues:**
```bash
cd ios && pod install
```

### Getting Help

- 📖 Check the [React Native docs](https://reactnative.dev/docs/getting-started)
- 🐛 Create an issue in this repository
- 💬 Ask questions in the discussions

## 🔮 Roadmap

- [ ] Real-time WebSocket updates
- [ ] Push notifications for price alerts
- [ ] Portfolio tracking
- [ ] Advanced charting features
- [ ] Offline mode support
- [ ] Multi-language support

## 📦 Download APKs

You can download the latest debug APKs for Android below:

- [Universal APK (all devices)](android/app/build/outputs/apk/debug/app-universal-debug.apk)
- [ARM64-v8a APK](android/app/build/outputs/apk/debug/app-arm64-v8a-debug.apk)
- [armeabi-v7a APK](android/app/build/outputs/apk/debug/app-armeabi-v7a-debug.apk)
- [x86 APK](android/app/build/outputs/apk/debug/app-x86-debug.apk)
- [x86_64 APK](android/app/build/outputs/apk/debug/app-x86_64-debug.apk)

> **Note:** These APKs are debug builds. For production, generate a release APK using the instructions in the Build & Deploy section.

### Release APKs

You can download the latest release APKs for Android below:

- [Universal Release APK (all devices)](android/app/build/outputs/apk/release/app-universal-release.apk)
- [ARM64-v8a Release APK](android/app/build/outputs/apk/release/app-arm64-v8a-release.apk)
- [armeabi-v7a Release APK](android/app/build/outputs/apk/release/app-armeabi-v7a-release.apk)
- [x86 Release APK](android/app/build/outputs/apk/release/app-x86-release.apk)
- [x86_64 Release APK](android/app/build/outputs/apk/release/app-x86_64-release.apk)

> **Note:** These APKs are release builds optimized for production use.

---

**Made with ❤️ using React Native**

⭐ **Star this repository if you found it helpful!**
