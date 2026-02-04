import { Component } from "react";
import {
  ActivityIndicator,
  Image,
  NativeEventEmitter,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { backgroundColor, mainColor } from "../../../core/styles";
import { useHOCS } from "../../../hocs/useHOCS";
import { useWallet } from "../../../providers/walletProvider";
import { aaveService } from "../../../services/aaveService";

const baseTab3State = {
  positions: [],
  accountData: null,
  loading: false,
  refreshing: false,
  error: null,
};

class Tab3 extends Component {
  constructor(props) {
    super(props);
    this.state = baseTab3State;
    this.EventEmitter = new NativeEventEmitter();
    this.controller = new AbortController();
  }

  async componentDidMount() {
    const { account, status } = this.props.wallet;
    if (account && status === "connected") {
      await this.fetchAaveData();
    }
  }

  async componentDidUpdate(prevProps, prevState) {
    const { account, status } = this.props.wallet;
    const prevAccount = prevProps?.wallet?.account;
    const prevStatus = prevProps?.wallet?.status;

    if (
      (account !== prevAccount || status !== prevStatus) &&
      account &&
      status === "connected"
    ) {
      await this.fetchAaveData();
    }
  }

  async fetchAaveData() {
    const { account, status } = this.props.wallet;

    if (!account || status !== "connected") return;

    try {
      await this.setStateAsync({ error: null });
      await aaveService.initialize();

      const [userPositions, userData] = await Promise.all([
        aaveService.getUserPositions(account),
        aaveService.getUserAccountData(account),
      ]);

      await this.setStateAsync({
        positions: userPositions,
        accountData: userData,
      });
    } catch (err) {
      console.error("Error fetching AAVE data:", err);
      await this.setStateAsync({
        error: err.message,
        positions: [],
        accountData: null,
      });
    }
  }

  async refreshData() {
    await this.setStateAsync({ loading: true });
    try {
      await this.fetchAaveData();
    } catch (error) {
      console.error("Error refreshing AAVE data:", error);
    } finally {
      await this.setStateAsync({ loading: false });
    }
  }

  async onRefresh() {
    await this.setStateAsync({ refreshing: true });
    try {
      await this.fetchAaveData();
    } catch (error) {
      console.error("Error refreshing:", error);
    } finally {
      await this.setStateAsync({ refreshing: false });
    }
  }

  getHealthFactorColor(healthFactor) {
    const hf = parseFloat(healthFactor);
    // Check for extremely large numbers (no debt scenario)
    if (hf > 1000000) return mainColor;
    if (hf >= 2) return mainColor;
    if (hf >= 1.5) return "#FFA500";
    if (hf >= 1.1) return "#FF6B6B";
    return "#FF0000";
  }

  getHealthFactorStatus(healthFactor) {
    const hf = parseFloat(healthFactor);
    // Check for extremely large numbers (no debt scenario)
    if (hf > 1000000) return "No Debt";
    if (hf >= 2) return "Safe";
    if (hf >= 1.5) return "Caution";
    if (hf >= 1.1) return "Danger";
    return "Critical";
  }

  formatHealthFactor(healthFactor) {
    const hf = parseFloat(healthFactor);
    // Check for extremely large numbers (no debt scenario)
    if (hf > 1000000) return "∞";
    return hf.toFixed(2);
  }

  // Utils
  async setStateAsync(value) {
    return new Promise((resolve) => {
      this.setState(
        {
          ...value,
        },
        () => resolve(),
      );
    });
  }

  render() {
    const { account, status } = this.props.wallet;
    const { positions, accountData, loading, refreshing, error } = this.state;

    if (status !== "connected") {
      return (
        <View style={styles.container}>
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>
              Connect your wallet to view AAVE positions
            </Text>
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

    const suppliedPositions = positions.filter((p) => p.hasSupplied);
    const borrowedPositions = positions.filter((p) => p.hasBorrowed);
    const hasPositions =
      suppliedPositions.length > 0 || borrowedPositions.length > 0;

    return (
      <ScrollView
        style={styles.container}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => this.onRefresh()}
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
                  {
                    color: this.getHealthFactorColor(
                      accountData.formattedHealthFactor,
                    ),
                  },
                ]}
              >
                {this.formatHealthFactor(accountData.formattedHealthFactor)}
              </Text>
              <Text
                style={[
                  styles.healthFactorStatus,
                  {
                    color: this.getHealthFactorColor(
                      accountData.formattedHealthFactor,
                    ),
                  },
                ]}
              >
                {this.getHealthFactorStatus(accountData.formattedHealthFactor)}
              </Text>
            </View>

            {/* Account Summary */}
            <View style={styles.summaryContainer}>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Total Collateral</Text>
                <Text style={styles.summaryValue}>
                  {parseFloat(accountData.formattedTotalCollateral).toFixed(4)}{" "}
                  ETH
                </Text>
              </View>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Total Debt</Text>
                <Text style={styles.summaryValue}>
                  {parseFloat(accountData.formattedTotalDebt).toFixed(4)} ETH
                </Text>
              </View>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Available to Borrow</Text>
                <Text style={styles.summaryValue}>
                  {parseFloat(accountData.formattedAvailableBorrows).toFixed(4)}{" "}
                  ETH
                </Text>
              </View>
            </View>
          </View>
        )}

        {!hasPositions ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No AAVE positions found</Text>
            <Text style={styles.emptySubtext}>
              Supply or borrow assets to see your positions here
            </Text>
          </View>
        ) : (
          <>
            {/* Supplied Assets */}
            {suppliedPositions.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>
                  Supplied Assets ({suppliedPositions.length})
                </Text>
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
                        <Text style={styles.positionSymbol}>
                          {position.symbol}
                        </Text>
                        <Text style={styles.positionName}>{position.name}</Text>
                      </View>
                    </View>

                    <View style={styles.positionRight}>
                      <Text style={styles.positionAmount}>
                        {parseFloat(position.formattedSupplied).toFixed(6)}
                      </Text>
                      <Text style={styles.positionLabel}>Supplied</Text>
                      {position.supplyAPY && (
                        <Text style={styles.apyText}>
                          APY:{" "}
                          {(parseFloat(position.supplyAPY) * 100).toFixed(2)}%
                        </Text>
                      )}
                    </View>
                  </View>
                ))}
              </View>
            )}

            {/* Borrowed Assets */}
            {borrowedPositions.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>
                  Borrowed Assets ({borrowedPositions.length})
                </Text>
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
                        <Text style={styles.positionSymbol}>
                          {position.symbol}
                        </Text>
                        <Text style={styles.positionName}>{position.name}</Text>
                      </View>
                    </View>

                    <View style={styles.positionRight}>
                      <Text
                        style={[styles.positionAmount, styles.borrowedAmount]}
                      >
                        {parseFloat(position.formattedBorrowed).toFixed(6)}
                      </Text>
                      <Text style={styles.positionLabel}>Borrowed</Text>
                      {position.borrowAPY && (
                        <Text style={styles.apyText}>
                          APY:{" "}
                          {(parseFloat(position.borrowAPY) * 100).toFixed(2)}%
                        </Text>
                      )}
                    </View>
                  </View>
                ))}
              </View>
            )}
          </>
        )}
      </ScrollView>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: backgroundColor,
    width: "100%",
  },
  header: {
    padding: 20,
    alignItems: "center",
    justifyContent: "space-between",
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0, 255, 0, 0.2)",
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "white",
    fontFamily: "Exo2_400Regular",
  },
  address: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.6)",
    fontFamily: "Exo2_400Regular",
    marginBottom: 8,
  },
  healthFactorContainer: {
    padding: 20,
  },
  healthFactorCard: {
    backgroundColor: "rgba(0, 255, 0, 0.05)",
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(0, 255, 0, 0.1)",
  },
  healthFactorValue: {
    fontSize: 36,
    fontWeight: "800",
    fontFamily: "Exo2_400Regular",
    marginBottom: 8,
  },
  healthFactorStatus: {
    fontSize: 16,
    fontWeight: "600",
    fontFamily: "Exo2_400Regular",
  },
  summaryContainer: {
    marginTop: 16,
    backgroundColor: "rgba(0, 255, 0, 0.05)",
    borderRadius: 12,
    padding: 16,
  },
  summaryItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
  },
  summaryLabel: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.7)",
    fontFamily: "Exo2_400Regular",
  },
  summaryValue: {
    fontSize: 14,
    color: "white",
    fontWeight: "600",
    fontFamily: "Exo2_400Regular",
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "white",
    fontFamily: "Exo2_400Regular",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 16,
  },
  section: {
    padding: 20,
    marginBottom: 16,
  },
  positionCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "rgba(0, 255, 0, 0.05)",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "rgba(0, 255, 0, 0.1)",
  },
  positionLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(0, 255, 0, 0.1)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  icon: {
    width: 32,
    height: 32,
    resizeMode: "contain",
  },
  placeholderIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    justifyContent: "center",
    alignItems: "center",
  },
  placeholderText: {
    color: "white",
    fontFamily: "Exo2_400Regular",
    fontWeight: "600",
    fontSize: 16,
  },
  positionInfo: {
    flex: 1,
  },
  positionSymbol: {
    fontSize: 18,
    fontWeight: "600",
    color: "white",
    fontFamily: "Exo2_400Regular",
  },
  positionName: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.6)",
    fontFamily: "Exo2_400Regular",
    marginBottom: 4,
  },
  positionRight: {
    alignItems: "flex-end",
  },
  positionAmount: {
    fontSize: 16,
    fontWeight: "600",
    color: mainColor,
    fontFamily: "Exo2_400Regular",
  },
  borrowedAmount: {
    color: "#FF6B6B",
  },
  positionLabel: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.5)",
    fontFamily: "Exo2_400Regular",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 4,
  },
  apyText: {
    fontSize: 11,
    color: "rgba(255, 255, 255, 0.4)",
    fontFamily: "Exo2_400Regular",
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
  },
  emptyText: {
    fontSize: 18,
    fontFamily: "Exo2_400Regular",
    color: "rgba(255, 255, 255, 0.6)",
    textAlign: "center",
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    fontFamily: "Exo2_400Regular",
    color: "rgba(255, 255, 255, 0.4)",
    textAlign: "center",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
    fontFamily: "Exo2_400Regular",
    color: "white",
  },
  errorContainer: {
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
  },
  errorText: {
    fontSize: 18,
    fontFamily: "Exo2_400Regular",
    color: "#FF6B6B",
    textAlign: "center",
    marginBottom: 8,
  },
  errorDetail: {
    fontSize: 14,
    fontFamily: "Exo2_400Regular",
    color: "rgba(255, 255, 255, 0.65)",
    textAlign: "center",
  },
});

// Wrapper component to inject wallet context
const Tab3WithWallet = (props) => {
  const wallet = useWallet();
  return <Tab3 {...props} wallet={wallet} />;
};

export default useHOCS(Tab3WithWallet);
