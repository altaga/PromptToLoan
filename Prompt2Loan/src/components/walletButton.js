import { TouchableOpacity, ActivityIndicator, Text } from "react-native";
import { useState } from "react";
import { useWallet } from "../providers/walletProvider";
import { mainColor, WalletButtonStyles as styles } from "../core/styles";

const ConnectButton = () => {
  const { status, connect, disconnect } = useWallet();
  const [isConnecting, setIsConnecting] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);

  const handleConnect = () => {
    setIsConnecting(true);
    
    // Simulate 1 second loading then connect
    setTimeout(() => {
      connect();
      setIsConnecting(false);
    }, 1000);
  };

  const handleDisconnect = () => {
    setIsDisconnecting(true);
    
    // Simulate 1 second loading then disconnect
    setTimeout(() => {
      disconnect();
      setIsDisconnecting(false);
    }, 1000);
  };

  // Show connecting state
  if (status === "loading" || isConnecting) {
    return (
      <TouchableOpacity style={[styles.button, styles.loadingButton]} disabled>
        <ActivityIndicator size="small" color={mainColor} />
        <Text style={styles.buttonText}>Connecting...</Text>
      </TouchableOpacity>
    );
  }

  // Show disconnecting state
  if (isDisconnecting) {
    return (
      <TouchableOpacity style={[styles.button, styles.disconnectingButton]} disabled>
        <ActivityIndicator size="small" color="#ff6b6b" />
        <Text style={styles.disconnectingButtonText}>Disconnecting...</Text>
      </TouchableOpacity>
    );
  }

  // Show disconnect button when connected
  if (status === "connected") {
    return (
      <TouchableOpacity style={[styles.button, styles.disconnectButton]} onPress={handleDisconnect}>
        <Text style={styles.disconnectButtonText}>Disconnect</Text>
      </TouchableOpacity>
    );
  }

  // Show connect button when disconnected
  return (
    <TouchableOpacity style={styles.button} onPress={handleConnect}>
      <Text style={styles.buttonText}>Connect Wallet</Text>
    </TouchableOpacity>
  );
};

export default ConnectButton;
