import React from "react";
import { View, Text, TouchableOpacity, ActivityIndicator } from "react-native";
import { useWallet } from "../providers/walletProvider";
import { mainColor, WalletButtonExpandedStyles as styles } from "../core/styles";

const ConnectButtonExpanded = () => {
  const { account, balance, status, error, connect, disconnect } = useWallet();

  const truncate = (str) =>
    `${str.substring(0, 6)}...${str.substring(str.length - 4)}`;

  if (status === "loading") {
    return (
      <TouchableOpacity style={[styles.button, styles.loadingButton]} disabled>
        <ActivityIndicator size="small" color={mainColor} />
        <Text style={styles.buttonText}>Connecting...</Text>
      </TouchableOpacity>
    );
  }

  if (status === "connected") {
    return (
      <View style={styles.connectedContainer}>
        <View style={styles.balanceContainer}>
          <Text style={styles.balanceLabel}>Balance</Text>
          <Text style={styles.balanceAmount}>
            {parseFloat(balance).toFixed(4)} ETH
          </Text>
        </View>
        <View style={styles.accountContainer}>
          <Text style={styles.accountLabel}>Account</Text>
          <Text style={styles.accountAddress}>{truncate(account)}</Text>
        </View>
        <TouchableOpacity style={[styles.button, styles.disconnectButton]} onPress={disconnect}>
          <Text style={styles.disconnectButtonText}>Disconnect</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.button} onPress={connect}>
        <Text style={styles.buttonText}>Connect Wallet</Text>
      </TouchableOpacity>
      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}
    </View>
  );
};

export default ConnectButtonExpanded;