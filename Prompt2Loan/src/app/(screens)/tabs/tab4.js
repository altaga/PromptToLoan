import { Picker } from "@react-native-picker/picker";
import { ethers } from "ethers";
import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { TOKEN_ADDRESSES } from "../../../core/constants";
import { tokensList } from "../../../core/filtered_top_tokens";
import { SharedStyles, backgroundColor, mainColor } from "../../../core/styles";
import { useHOCS } from "../../../hocs/useHOCS";
import { useWallet } from "../../../providers/walletProvider";

const {
  abi: ERC20abi,
} = require("@openzeppelin/contracts/build/contracts/ERC20.json");

// --- Constants (Moved outside component to prevent recreation) ---

const SUPPORTED_CHAINS = [
  { id: 1, name: "Ethereum", symbol: "ETH" },
  { id: 42161, name: "Arbitrum", symbol: "ETH" },
  { id: 10, name: "Optimism", symbol: "ETH" },
  { id: 8453, name: "Base", symbol: "ETH" },
  { id: 137, name: "Polygon", symbol: "POL" },
  { id: 56, name: "BNB Chain", symbol: "BNB" },
  { id: 43114, name: "Avalanche", symbol: "AVAX" },
  { id: 324, name: "zkSync Era", symbol: "ETH" },
  { id: 59144, name: "Linea", symbol: "ETH" },
  { id: 534352, name: "Scroll", symbol: "ETH" },
  { id: 5000, name: "Mantle", symbol: "ETH" },
  { id: 100, name: "Gnosis", symbol: "xDAI" },
  { id: 42220, name: "Celo", symbol: "CELO" },
  { id: 143, name: "Monad", symbol: "MON" },
];

const BASE_CHAIN_ID = 8453;

// --- Helper Functions ---

const getBaseTokens = () => {
  return [
    {
      name: "Ethereum",
      symbol: "ETH",
      address: TOKEN_ADDRESSES.ETH,
      decimals: 18,
      chainId: BASE_CHAIN_ID,
    },

    {
      name: "Wrapped ETH",
      symbol: "WETH",
      address: TOKEN_ADDRESSES.WETH,
      decimals: 18,
      chainId: BASE_CHAIN_ID,
    },
    {
      symbol: "cbBTC",
      name: "Coinbase BTC",
      address: TOKEN_ADDRESSES.CBBTC,
      decimals: 8,
      chainId: BASE_CHAIN_ID,
    },
    {
      name: "USD Coin",
      symbol: "USDC",
      address: TOKEN_ADDRESSES.USDC,
      decimals: 6,
      chainId: BASE_CHAIN_ID,
    },
    {
      name: "Aave Wrapped ETH",
      symbol: "AWETH",
      address: TOKEN_ADDRESSES.AWETH,
      decimals: 18,
      chainId: BASE_CHAIN_ID,
    },
  ];
};

const getDestinationTokens = (chainId) => {
  const numericChainId =
    typeof chainId === "string" ? parseInt(chainId) : chainId;
  const filtered = tokensList.filter(
    (token) => token.chainId === numericChainId,
  );

  if (filtered.length === 0) {
    return [
      {
        chainId: numericChainId,
        address: "0x0000000000000000000000000000000000000000",
        symbol: "ETH",
        name: "ETH",
        decimals: 18,
      },
      {
        chainId: numericChainId,
        address: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
        symbol: "USDC",
        name: "USD Coin",
        decimals: 6,
      },
    ];
  }
  return filtered;
};

// --- Main Component ---

const Tab4 = () => {
  const wallet = useWallet();
  const { account, status, sendTransaction } = wallet;

  // 1. State Management - Grouped logically
  const [form, setForm] = useState({
    amount: "",
    fromToken: "ETH",
    toToken: "USDC",
    destinationChain: 8453,
    destinationAddress: "",
    useSameAddress: true,
    useSameChain: true,
  });

  const [quoteData, setQuoteData] = useState({
    quote: null,
    isQuoting: false,
    isSending: false,
    error: null,
    show: false,
  });

  // 2. Memoized Data Calculations
  // Only recalculate tokens if the chain requirements change
  const baseTokens = useMemo(() => getBaseTokens(), []);

  const activeDestinationChain = form.useSameChain
    ? BASE_CHAIN_ID
    : form.destinationChain;

  const destinationTokens = useMemo(() => {
    return getDestinationTokens(activeDestinationChain);
  }, [activeDestinationChain]);

  // 3. Helper to update form and reset quote simultaneously
  // Using useCallback ensures this function reference is stable
  const updateForm = useCallback((updates) => {
    setForm((prev) => ({ ...prev, ...updates }));
    setQuoteData((prev) => {
      // Only reset if showing a quote or there is a quote
      if (prev.show || prev.quote) {
        return { ...prev, quote: null, show: false, error: null };
      }
      return prev;
    });
  }, []);

  // 4. Action Handlers
  const handleGetQuote = useCallback(async () => {
    if (!form.amount || !account) {
      Alert.alert("Error", "Please enter amount and connect wallet");
      return;
    }

    setQuoteData((prev) => ({ ...prev, isQuoting: true, error: null }));

    try {
      const fromTokenData = baseTokens.find((t) => t.symbol === form.fromToken);
      const toTokenData = destinationTokens.find(
        (t) => t.symbol === form.toToken,
      );

      if (!fromTokenData || !toTokenData)
        throw new Error("Selected tokens not found");

      const finalDestAddr = form.useSameAddress
        ? account
        : form.destinationAddress;

      const response = await fetch("/api/quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: form.amount,
          decimals: fromTokenData.decimals,
          fromAddress: account,
          toAddress: finalDestAddr,
          fromToken: fromTokenData.address,
          toToken: toTokenData.address,
          fromChain: BASE_CHAIN_ID,
          toChain: activeDestinationChain,
        }),
      });

      const data = await response.json();
      if (data.error) throw new Error(data.error);

      setQuoteData({
        quote: data.result,
        show: true,
        isQuoting: false,
        error: null,
        isSending: false,
      });
    } catch (error) {
      setQuoteData((prev) => ({
        ...prev,
        isQuoting: false,
        error: error.message,
      }));
      Alert.alert("Quote Error", error.message);
    }
  }, [form, account, baseTokens, destinationTokens, activeDestinationChain]);

  const approveToken = async (currentQuote) => {
    const erc20Interface = new ethers.utils.Interface(ERC20abi);
    const bridgeTx = currentQuote.route.steps[0].transactionRequest;
    const data = erc20Interface.encodeFunctionData("approve", [
      bridgeTx.to,
      currentQuote.fromAmount,
    ]);
    return await sendTransaction({
      to: currentQuote.route.fromToken.address,
      data,
    });
  };

  const handleSendTransfer = async () => {
    const { quote } = quoteData;
    if (!quote) throw new Error("Please request a quote first");

    const fromTokenAddr = quote.route.fromToken.address;
    const isNative =
      fromTokenAddr === "0x0000000000000000000000000000000000000000";

    try {
      setQuoteData((prev) => ({ ...prev, isSending: true }));

      if (!isNative) {
        await approveToken(quote);
      }

      await sendTransaction(quote.route.steps[0].transactionRequest);
    } catch (err) {
      console.error(err);
      Alert.alert("Transaction Error", "Failed to send transaction");
    } finally {
      setQuoteData((prev) => ({ ...prev, isSending: false }));
    }
  };

  // Complex Toggles logic extracted
  const handleToggleSameChain = useCallback(
    (value) => {
      const newChainId = value ? BASE_CHAIN_ID : 1;

      // We calculate the new token immediately to avoid state sync issues
      const newDestTokens = getDestinationTokens(newChainId);
      const tokenExists = newDestTokens.some((t) => t.symbol === form.toToken);

      const newToToken = tokenExists
        ? form.toToken
        : newDestTokens[0]?.symbol || "ETH";

      updateForm({
        useSameChain: value,
        destinationChain: newChainId,
        toToken: newToToken,
      });
    },
    [form.toToken, updateForm],
  );

  const handleDestinationChainChange = useCallback(
    (chainId) => {
      const newDestTokens = getDestinationTokens(chainId);
      const tokenExists = newDestTokens.some((t) => t.symbol === form.toToken);

      const newToToken = tokenExists
        ? form.toToken
        : newDestTokens[0]?.symbol || "ETH";

      updateForm({
        destinationChain: chainId,
        toToken: newToToken,
      });
    },
    [form.toToken, updateForm],
  );

  // 5. Render Logic
  if (status !== "connected") {
    return (
      <View style={styles.container}>
        <View style={SharedStyles.emptyState}>
          <Text style={SharedStyles.emptyText}>Connect Wallet</Text>
          <Text style={SharedStyles.emptySubtext}>
            Please connect your wallet to use cross-chain transfers
          </Text>
        </View>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} className="scroll-container">
      <View style={styles.header}>
        <Text style={styles.title}>Cross-Chain Transfer</Text>
        <Text style={styles.subtitle}>
          Send tokens across different blockchains
        </Text>
      </View>

      <View style={styles.form}>
        {/* Amount Input */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Amount</Text>
          <TextInput
            style={styles.input}
            value={form.amount}
            onChangeText={(text) => updateForm({ amount: text })}
            placeholder="0.0"
            placeholderTextColor="rgba(255, 255, 255, 0.5)"
            keyboardType="numeric"
          />
        </View>

        {/* From Token */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>From Token</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={form.fromToken}
              onValueChange={(val) => updateForm({ fromToken: val })}
              style={styles.picker}
              dropdownIconColor={mainColor}
              itemStyle={styles.pickerItem}
              mode="dropdown"
            >
              {baseTokens.map((token) => (
                <Picker.Item
                  key={`${token.chainId}-${token.address}`}
                  label={`${token.symbol} - ${token.name}`}
                  value={token.symbol}
                  color="black"
                  style={styles.pickerItemStyle}
                />
              ))}
            </Picker>
          </View>
        </View>

        {/* To Token */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>To Token</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={form.toToken}
              onValueChange={(val) => updateForm({ toToken: val })}
              style={styles.picker}
              dropdownIconColor={mainColor}
              itemStyle={styles.pickerItem}
              mode="dropdown"
            >
              {destinationTokens.map((token) => (
                <Picker.Item
                  key={`${token.chainId}-${token.address}`}
                  label={`${token.symbol} - ${token.name}`}
                  value={token.symbol}
                  color="black"
                  style={styles.pickerItemStyle}
                />
              ))}
            </Picker>
          </View>
        </View>

        {/* Same Chain Toggle */}
        <View style={styles.toggleGroup}>
          <Text style={styles.label}>Use same chain</Text>
          <Switch
            value={form.useSameChain}
            onValueChange={handleToggleSameChain}
            trackColor={{ false: "rgba(255, 255, 255, 0.3)", true: mainColor }}
            thumbColor={
              form.useSameChain ? backgroundColor : "rgba(255, 255, 255, 0.8)"
            }
          />
        </View>

        {/* Destination Chain Selector */}
        {!form.useSameChain && (
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Destination Chain</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={form.destinationChain}
                onValueChange={handleDestinationChainChange}
                style={styles.picker}
                dropdownIconColor={mainColor}
                itemStyle={styles.pickerItem}
                mode="dropdown"
              >
                {SUPPORTED_CHAINS.map((chain) => (
                  <Picker.Item
                    key={chain.id}
                    label={`${chain.name} (${chain.symbol})`}
                    value={chain.id}
                    color="black"
                    style={styles.pickerItemStyle}
                  />
                ))}
              </Picker>
            </View>
          </View>
        )}

        {/* Same Address Toggle */}
        <View style={styles.toggleGroup}>
          <Text style={styles.label}>Use same address</Text>
          <Switch
            value={form.useSameAddress}
            onValueChange={(val) =>
              updateForm({
                useSameAddress: val,
                destinationAddress: val ? "" : form.destinationAddress,
              })
            }
            trackColor={{ false: "rgba(255, 255, 255, 0.3)", true: mainColor }}
            thumbColor={
              form.useSameAddress ? backgroundColor : "rgba(255, 255, 255, 0.8)"
            }
          />
        </View>

        {/* Destination Address Input */}
        {!form.useSameAddress && (
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Destination Address</Text>
            <TextInput
              style={styles.input}
              value={form.destinationAddress}
              onChangeText={(text) => updateForm({ destinationAddress: text })}
              placeholder="0x..."
              placeholderTextColor="rgba(255, 255, 255, 0.5)"
              autoCapitalize="none"
            />
          </View>
        )}

        {/* Quote Display */}
        {quoteData.show && quoteData.quote && (
          <QuoteDisplay quote={quoteData.quote} toTokenSymbol={form.toToken} />
        )}

        {/* Quote Error */}
        {quoteData.error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{quoteData.error}</Text>
          </View>
        )}

        {/* Action Button */}
        <TouchableOpacity
          style={[
            styles.actionButton,
            (quoteData.isQuoting || quoteData.isSending) &&
              styles.actionButtonDisabled,
          ]}
          onPress={
            quoteData.show && quoteData.quote
              ? handleSendTransfer
              : handleGetQuote
          }
          disabled={quoteData.isQuoting || quoteData.isSending}
        >
          {quoteData.isQuoting ? (
            <View style={styles.buttonContent}>
              <ActivityIndicator size="small" color={backgroundColor} />
              <Text style={styles.buttonText}>Getting Quote...</Text>
            </View>
          ) : quoteData.isSending ? (
            <View style={styles.buttonContent}>
              <ActivityIndicator size="small" color={backgroundColor} />
              <Text style={styles.buttonText}>Sending...</Text>
            </View>
          ) : quoteData.show && quoteData.quote ? (
            <Text style={styles.buttonText}>Send Transfer</Text>
          ) : (
            <Text style={styles.buttonText}>Get Quote</Text>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

// --- Sub-Components (Prevents clutter in main render) ---

const QuoteDisplay = React.memo(({ quote, toTokenSymbol }) => {
  // Memoize calculations inside display to prevent flicker
  const formattedAmount = useMemo(() => {
    if (!quote.toAmount) return `N/A ${toTokenSymbol}`;
    const decimals = quote.route?.toToken?.decimals || 6;
    const symbol = quote.route?.toToken?.symbol || toTokenSymbol;
    return `${(parseFloat(quote.toAmount) / Math.pow(10, decimals)).toFixed(6)} ${symbol}`;
  }, [quote, toTokenSymbol]);

  return (
    <View style={styles.quoteContainer}>
      <Text style={styles.quoteTitle}>Quote</Text>
      <View style={styles.quoteDetails}>
        <View style={styles.quoteRow}>
          <Text style={styles.quoteLabel}>You'll receive:</Text>
          <Text style={styles.quoteValue}>{formattedAmount}</Text>
        </View>
        <View style={styles.quoteRow}>
          <Text style={styles.quoteLabel}>Estimated time:</Text>
          <Text style={styles.quoteValue}>
            {quote.quote?.estimate.executionDuration !== undefined
              ? quote.quote?.estimate.executionDuration === 0
                ? "Instant"
                : `${Math.ceil(quote.quote?.estimate.executionDuration / 60)} minutes`
              : "~2-5 minutes"}
          </Text>
        </View>
        <View style={styles.quoteRow}>
          <Text style={styles.quoteLabel}>Network fees:</Text>
          <Text style={styles.quoteValue}>
            ${quote.gasCosts?.[0]?.amountUSD || "2-5"}
          </Text>
        </View>
        {quote.quote?.estimate?.feeCosts?.[0] && (
          <View style={styles.quoteRow}>
            <Text style={styles.quoteLabel}>Protocol fees:</Text>
            <Text style={styles.quoteValue}>
              ${quote.quote.estimate.feeCosts[0].amountUSD || "0.55"}
            </Text>
          </View>
        )}
        <View style={styles.quoteRow}>
          <Text style={styles.quoteLabel}>Route:</Text>
          <Text style={styles.quoteValue}>
            {quote.quote?.toolDetails?.name || "LiFi Bridge"}
          </Text>
        </View>
      </View>
    </View>
  );
});

const styles = {
  container: {
    flex: 1,
    backgroundColor,
    width: "100%",
    ...(typeof window !== "undefined" && {
      scrollbarWidth: "none",
      msOverflowStyle: "none",
    }),
  },
  header: {
    padding: 24,
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0, 255, 0, 0.2)",
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "white",
    fontFamily: "Exo2_400Regular",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: "rgba(255, 255, 255, 0.6)",
    fontFamily: "Exo2_400Regular",
    textAlign: "center",
  },
  form: {
    padding: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  toggleGroup: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
    paddingVertical: 10,
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    color: "white",
    fontFamily: "Exo2_400Regular",
    marginBottom: 8,
  },
  input: {
    backgroundColor: "rgba(0, 255, 0, 0.05)",
    borderWidth: 1,
    borderColor: "rgba(0, 255, 0, 0.2)",
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: "white",
    fontFamily: "Exo2_400Regular",
    minHeight: 56,
  },
  pickerContainer: {
    backgroundColor: "rgba(0, 255, 0, 0.05)",
    borderWidth: 1,
    borderColor: "rgba(0, 255, 0, 0.2)",
    borderRadius: 12,
    overflow: "hidden",
    minHeight: 56,
  },
  picker: {
    color: "white",
    backgroundColor: "transparent",
    height: 56,
    fontSize: 16,
    fontFamily: "Exo2_400Regular",
  },
  pickerItem: {
    backgroundColor: "white",
    color: "black",
    fontSize: 16,
    fontFamily: "Exo2_400Regular",
    height: 50,
  },
  pickerItemStyle: {
    backgroundColor: "white",
    color: "black",
    fontSize: 16,
    fontFamily: "Exo2_400Regular",
  },
  quoteContainer: {
    backgroundColor: "rgba(0, 255, 0, 0.05)",
    borderWidth: 1,
    borderColor: "rgba(0, 255, 0, 0.2)",
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
  },
  quoteTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: mainColor,
    fontFamily: "Exo2_400Regular",
    marginBottom: 12,
  },
  quoteDetails: {
    gap: 8,
  },
  quoteRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  quoteLabel: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.7)",
    fontFamily: "Exo2_400Regular",
  },
  quoteValue: {
    fontSize: 14,
    fontWeight: "600",
    color: "white",
    fontFamily: "Exo2_400Regular",
  },
  errorContainer: {
    backgroundColor: "rgba(255, 0, 0, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(255, 0, 0, 0.3)",
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  errorText: {
    color: "#ff6b6b",
    fontSize: 14,
    fontFamily: "Exo2_400Regular",
    textAlign: "center",
  },
  actionButton: {
    backgroundColor: mainColor,
    borderRadius: 16,
    padding: 20,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: mainColor,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  actionButtonDisabled: {
    backgroundColor: "rgba(0, 255, 0, 0.5)",
  },
  buttonContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  buttonText: {
    color: backgroundColor,
    fontSize: 18,
    fontWeight: "600",
    fontFamily: "Exo2_400Regular",
  },
};

export default useHOCS(Tab4);
