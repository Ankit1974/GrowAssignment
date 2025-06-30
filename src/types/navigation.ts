export type RootStackParamList = {
  ExploreHome: undefined;
  TopGainer: undefined;
  TopLoser: undefined;
  StockDetails: { symbol: string };
  WatchlistHome: undefined;
  WatchlistDetails: { name: string };
};

export type ExploreStackParamList = {
  ExploreHome: undefined;
  TopGainer: undefined;
  TopLoser: undefined;
  StockDetails: { symbol: string };
};

export type WatchlistStackParamList = {
  WatchlistHome: undefined;
  WatchlistDetails: { name: string };
}; 