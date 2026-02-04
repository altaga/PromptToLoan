import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ActivityIndicator,
  ScrollView,
  RefreshControl,
  Image,
} from "react-native";
import { useWallet } from "../providers/walletProvider";
import { mainColor, AavePositionsStyles as styles } from "../core/styles";
import { aaveService } from "../services/aaveService";

const AavePositions = () => {
  const { account, status } = useWallet();
  const [positions, setPositions] = useState([]);
  const [accountData, setAccountData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const fetchAaveData = async () => {
    if (!account || status !== "connected") return;

    try {
      setError(null);
      await aaveService.initialize();
      
      const [userPositions, userData] = await Promise.all([
        aaveService.getUserPositions(account),
        aaveService.getUserAccountData(account)
      ]);

      setPositions(userPositions);
      setAccountData(userData);
    } catch (err) {
      console.error('Error fetching AAVE data:', err);
      setError(err.message);
      setPositions([]);
      setAccountData(null);
    }
  };

  const refreshData = async () => {
    setLoading(true);
    try {
      await fetchAaveData();
    } catch (error) {
      console.error('Error refreshing AAVE data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch data on mount and when wallet connects
  useEffect(() => {
    if (status === 'connected' && account) {
      refreshData();
    }
  }, [status, account]);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await fetchAaveData();
    } catch (error) {
      console.error('Error refreshing:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const getHealthFactorColor = (healthFactor) => {
    const hf = parseFloat(healthFactor);
    if (hf >= 2) return mainColor; // Green - Safe
    if (hf >= 1.5) return "#FFA500"; // Orange - Caution
    if (hf >= 1.1) return "#FF6B6B"; // Red - Danger
    return "#FF0000"; // Dark Red - Critical
  };

  const getHealthFactorStatus = (healthFactor) => {
    const hf = parseFloat(healthFactor);
    if (hf >= 2) return "Safe";
    if (hf >= 1.5) return "Caution";
    if (hf >= 1.1) return "Danger";
    return "Critical";
  };

  if (status !== "connected") {
    return (
      <View style={styles.container}>
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>Connect your wallet to view AAVE positions</Text>
        </View>
      </View>
    );
  }

  if (loading && !refreshing) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={mainColor} />
          <Text style={styles.loadingText}>Loading AAVE positions...</Text>
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Error loading AAVE data</Text>
          <Text style={styles.errorDetail}>{error}</Text>
        </View>
      </View>
    );
  }

  const suppliedPositions = positions.filter(p => p.hasSupplied);
  const borrowedPositions = positions.filter(p => p.hasBorrowed);
  const hasPositions = suppliedPositions.length > 0 || borrowedPositions.length > 0;

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
        <Text style={styles.title}>AAVE Positions</Text>
        <Text style={styles.address}>
          {account?.slice(0, 6)}...{account?.slice(-4)}
        </Text>
      </View>

      {/* Health Factor */}
      {accountData && (
        <View style={styles.healthFactorContainer}>
          <Text style={styles.sectionTitle}>Health Factor</Text>
          <View style={styles.healthFactorCard}>
            <Text 
              style={[
                styles.healthFactorValue, 
                { color: getHealthFactorColor(accountData.formattedHealthFactor) }
              ]}
            >
              {parseFloat(accountData.formattedHealthFactor).toFixed(2)}
            </Text>
            <Text 
              style={[
                styles.healthFactorStatus,
                { color: getHealthFactorColor(accountData.formattedHealthFactor) }
              ]}
            >
              {getHealthFactorStatus(accountData.formattedHealthFactor)}
            </Text>
          </View>
        </View>
      )}

      {!hasPositions ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>No AAVE positions found</Text>
          <Text style={styles.emptySubtext}>Supply or borrow assets to see your positions here</Text>
        </View>
      ) : (
        <>
          {/* Supplied Assets */}
          {suppliedPositions.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Supplied Assets</Text>
              {suppliedPositions.map((position, index) => (
                <View key={`supplied-${index}`} style={styles.positionCard}>
                  <View style={styles.positionLeft}>
                    <View style={styles.iconContainer}>
                      {position.icon ? (
                        <Image source={position.icon} style={styles.icon} />
                      ) : (
                        <View style={styles.placeholderIcon}>
                          <Text style={styles.placeholderText}>
                            {position.symbol.charAt(0)}
                          </Text>
                        </View>
                      )}
                    </View>
                    <View style={styles.positionInfo}>
                      <Text style={styles.positionSymbol}>{position.symbol}</Text>
                      <Text style={styles.positionName}>{position.name}</Text>
                    </View>
                  </View>
                  
                  <View style={styles.positionRight}>
                    <Text style={styles.positionAmount}>
                      {parseFloat(position.formattedSupplied).toFixed(6)}
                    </Text>
                    <Text style={styles.positionLabel}>Supplied</Text>
                  </View>
                </View>
              ))}
            </View>
          )}

          {/* Borrowed Assets */}
          {borrowedPositions.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Borrowed Assets</Text>
              {borrowedPositions.map((position, index) => (
                <View key={`borrowed-${index}`} style={styles.positionCard}>
                  <View style={styles.positionLeft}>
                    <View style={styles.iconContainer}>
                      {position.icon ? (
                        <Image source={position.icon} style={styles.icon} />
                      ) : (
                        <View style={styles.placeholderIcon}>
                          <Text style={styles.placeholderText}>
                            {position.symbol.charAt(0)}
                          </Text>
                        </View>
                      )}
                    </View>
                    <View style={styles.positionInfo}>
                      <Text style={styles.positionSymbol}>{position.symbol}</Text>
                      <Text style={styles.positionName}>{position.name}</Text>
                    </View>
                  </View>
                  
                  <View style={styles.positionRight}>
                    <Text style={[styles.positionAmount, styles.borrowedAmount]}>
                      {parseFloat(position.formattedBorrowed).toFixed(6)}
                    </Text>
                    <Text style={styles.positionLabel}>Borrowed</Text>
                  </View>
                </View>
              ))}
            </View>
          )}
        </>
      )}
    </ScrollView>
  );
};

export default AavePositions;