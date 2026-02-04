import { ethers } from "ethers";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from "react-native";
import { abiBatchTokenBalances } from "../contracts/batchTokenBalances";
import { BATCH_TOKEN_BALANCES_CONTRACT, TOKEN_ADDRESSES } from "../core/constants";
import { mainColor, AssetsViewStyles as styles } from "../core/styles";
import { useWallet } from "../providers/walletProvider";

// Token configurations for Base Mainnet
const TOKENS = [
  {
    symbol: "ETH",
    name: "Ethereum",
    address: TOKEN_ADDRESSES.ETH,
    decimals: 18,
    coingeckoId: "ethereum",
    icon: require("../assets/eth.png"),
  },
  {
    symbol: "USDC",
    name: "USD Coin",
    address: TOKEN_ADDRESSES.USDC,
    decimals: 6,
    coingeckoId: "usd-coin",
    icon: require("../assets/usdc.png"),
  },
    {
    symbol: "cbBTC",
    name: "Coinbase BTC",
    address: TOKEN_ADDRESSES.CBBTC,
    decimals: 8,
    coingeckoId: "coinbase-wrapped-btc",
    icon: require("../assets/cbbtc.png"),
  },
  {
    symbol: "WETH",
    name: "Wrapped Ethereum",
    address: TOKEN_ADDRESSES.WETH,
    decimals: 18,
    coingeckoId: "weth",
    icon: require("../assets/weth.png"),
  },
  {
    symbol: "AWETH",
    name: "Aave WETH",
    address: TOKEN_ADDRESSES.AWETH,
    decimals: 18,
    coingeckoId: "aave-weth",
    icon: require("../assets/aweth.png"),
  },
    {
    symbol: "DUSDC",
    name: "Aave Debt USD Coin",
    address: TOKEN_ADDRESSES.DUSDC,
    decimals: 6,
    coingeckoId: "usd-coin",
    icon: require("../assets/usdc.png"),
  },
];

const AssetsView = () => {
  const { account, status } = useWallet();
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [totalValue, setTotalValue] = useState(0);
  const [prices, setPrices] = useState({});
  const [balances, setBalances] = useState([]);
  const [provider, setProvider] = useState(null);

  // Initialize provider
  useEffect(() => {
    const initProvider = async () => {
      if (window.ethereum) {
        const browserProvider = new ethers.providers.Web3Provider(window.ethereum);
        setProvider(browserProvider);
      }
    };
    initProvider();
  }, []);

  const fetchTokenPrices = async () => {
    try {
      const coingeckoIds = TOKENS.map(token => token.coingeckoId).join(',');
      const response = await fetch(
        `https://api.coingecko.com/api/v3/simple/price?ids=${coingeckoIds}&vs_currencies=usd`
      );
      const data = await response.json();
      
      const newPrices = {};
      TOKENS.forEach(token => {
        newPrices[token.symbol] = data[token.coingeckoId]?.usd || 0;
      });
      
      setPrices(newPrices);
    } catch (error) {
      console.error('Error fetching prices:', error);
    }
  };

  const getBalances = async () => {
    if (!provider || !account) return;

    try {
      // Filter out ETH (native token) for batch contract call
      const tokenAddresses = TOKENS.filter(token => 
        token.address !== "0x0000000000000000000000000000000000000000"
      ).map(token => token.address);

      const batchBalancesContract = new ethers.Contract(
        BATCH_TOKEN_BALANCES_CONTRACT,
        abiBatchTokenBalances,
        provider
      );

      // Get native ETH balance
      const nativeBalance = await provider.getBalance(account);

      // Get ERC-20 token balances through batch contract
      const tokenBalances = tokenAddresses.length > 0 
        ? await batchBalancesContract.batchBalanceOf(account, tokenAddresses)
        : [];

      // Merge native balance with token balances
      const balancesMerge = [nativeBalance, ...tokenBalances];

      // Format balances according to token decimals
      const formattedBalances = TOKENS.map((token, i) => 
        ethers.utils.formatUnits(balancesMerge[i] || ethers.BigNumber.from(0), token.decimals)
      );

      setBalances(formattedBalances);
    } catch (error) {
      console.error('Error fetching balances:', error);
      // Set zero balances on error
      setBalances(TOKENS.map(() => "0"));
    }
  };

  const updateAssets = () => {
    const updatedAssets = TOKENS.map((token, index) => {
      const balance = parseFloat(balances[index] || "0");
      const price = prices[token.symbol] || 0;
      const value = balance * price;

      return {
        ...token,
        balance,
        formattedBalance: balance.toFixed(6),
        price,
        value,
        formattedValue: value.toFixed(2),
        rawBalance: balances[index] || "0",
      };
    });

    const total = updatedAssets.reduce((sum, asset) => sum + asset.value, 0);
    setAssets(updatedAssets);
    setTotalValue(total);
  };

  const refreshData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchTokenPrices(),
        getBalances()
      ]);
    } catch (error) {
      console.error('Error refreshing data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch data on mount and when wallet connects
  useEffect(() => {
    if (status === 'connected' && provider && account) {
      refreshData();
    }
  }, [status, provider, account]);

  // Update assets when balances or prices change
  useEffect(() => {
    updateAssets();
  }, [balances, prices]);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await refreshData();
    } catch (error) {
      console.error('Error refreshing:', error);
    } finally {
      setRefreshing(false);
    }
  };

  if (status !== "connected") {
    return (
      <View style={styles.container}>
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>Connect your wallet to view assets</Text>
        </View>
      </View>
    );
  }

  if (loading && !refreshing) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={mainColor} />
          <Text style={styles.loadingText}>Loading balances...</Text>
        </View>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={mainColor}
          colors={[mainColor]}
        />
      }
    >
      <View style={styles.header}>
        <Text style={styles.title}>Portfolio</Text>
        <Text style={styles.totalValue}>${totalValue.toFixed(2)}</Text>
        <Text style={styles.address}>
          {account?.slice(0, 6)}...{account?.slice(-4)}
        </Text>
      </View>

      <View style={styles.assetsList}>
        {assets.map((asset, index) => (
          <View key={asset.symbol} style={styles.assetItem}>
            <View style={styles.assetLeft}>
              <View style={styles.iconContainer}>
                <Image source={asset.icon} style={styles.icon} />
              </View>
              <View style={styles.assetInfo}>
                <Text style={styles.assetSymbol}>{asset.symbol}</Text>
                <Text style={styles.assetName}>{asset.name}</Text>
              </View>
            </View>
            
            <View style={styles.assetRight}>
              <Text style={styles.assetBalance}>
                {parseFloat(asset.formattedBalance).toFixed(4)}
              </Text>
              <Text style={styles.assetValue}>${asset.formattedValue}</Text>
              <Text style={styles.assetPrice}>${asset.price.toFixed(2)}</Text>
            </View>
          </View>
        ))}
      </View>
    </ScrollView>
  );
};

export default AssetsView;