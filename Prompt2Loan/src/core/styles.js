import {
  Dimensions,
  PixelRatio,
  Platform,
  StatusBar,
  StyleSheet,
} from "react-native";

const normalizeFontSize = (size) => {
  let { width, height } = Dimensions.get("window");
  if (Platform.OS === "web" && height / width < 1) {
    width /= 2.3179;
    height *= 0.7668;
  }
  const scale = Math.min(width / 375, height / 667); // Based on a standard screen size
  return PixelRatio.roundToNearestPixel(size * scale);
};

export const iconSize = normalizeFontSize(16);
export const screenHeight = Dimensions.get("screen").height;
export const windowHeight = Dimensions.get("window").height;
export const backgroundColor = "#000000";
export const mainColor = "#00ff00";
export const header = 70;
export const footer = 60;

export const ratio =
  Dimensions.get("window").height / Dimensions.get("window").width;
export const StatusBarHeight = StatusBar.currentHeight;
export const NavigatorBarHeight = screenHeight - windowHeight;

// Global Styles
const GlobalStyles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor,
  },
  header: {
    height: header,
    width: "100%",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor,
  },
  main: {
    flex: 1,
    backgroundColor,
    width: "100%",
    justifyContent: "space-between",
    alignItems: "center",
  },
  footer: {
    width: "100%",
    height: footer,
    display: "flex",
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: mainColor,
    backgroundColor,
    justifyContent: "space-between",
  },
  // Header Layout
  headerItem: {
    width: "33%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  // Footer Layout
  selector: {
    height: "100%",
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    borderRightWidth: 0,
    borderLeftWidth: 0,
    borderRightColor: mainColor,
    borderLeftColor: mainColor,
  },
  selectorText: {
    fontSize: normalizeFontSize(14),
    color: "white",
    textAlign: "center",
    fontFamily: "Exo2_400Regular",
  },
  selectorSelectedText: {
    fontSize: normalizeFontSize(14),
    color: mainColor,
    textAlign: "center",
    fontFamily: "Exo2_400Regular",
  },
  inputChat: {
    borderRadius: 10,
    borderColor: mainColor,
    borderWidth: 2,
    color: "black",
    backgroundColor: "white",
    fontSize: normalizeFontSize(18),
    padding: 10,
    overflow: 'hidden', 
    outlineStyle: 'none',
    width: "84%",
  },
});

// Shared Component Styles
export const SharedStyles = StyleSheet.create({
  // Common container styles
  scrollContainer: {
    flex: 1,
    backgroundColor,
    width: "100%",
    ...(typeof window !== "undefined" && {
      scrollbarWidth: "none", // Firefox
      msOverflowStyle: "none", // IE and Edge
    }),
  },

  // Common header styles
  pageHeader: {
    padding: 24,
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0, 255, 0, 0.2)",
  },
  pageTitle: {
    fontSize: 28,
    fontWeight: "700",
    color: "white",
    fontFamily: "Exo2_400Regular",
    marginBottom: 8,
  },
  address: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.6)",
    fontFamily: "Exo2_400Regular",
  },

  // Common loading states
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 16,
  },
  loadingText: {
    color: "white",
    fontSize: 16,
    fontFamily: "Exo2_400Regular",
  },

  // Common empty states
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
  },
  emptyText: {
    color: "rgba(255, 255, 255, 0.6)",
    fontSize: 18,
    fontFamily: "Exo2_400Regular",
    textAlign: "center",
    marginBottom: 8,
  },
  emptySubtext: {
    color: "rgba(255, 255, 255, 0.4)",
    fontSize: 14,
    fontFamily: "Exo2_400Regular",
    textAlign: "center",
  },

  // Common error states
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
  },
  errorText: {
    color: "#FF6B6B",
    fontSize: 18,
    fontFamily: "Exo2_400Regular",
    textAlign: "center",
    fontWeight: "600",
    marginBottom: 8,
  },
  errorDetail: {
    color: "rgba(255, 255, 255, 0.65)",
    fontSize: 14,
    fontFamily: "Exo2_400Regular",
    textAlign: "center",
  },

  // Common icon styles
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
    fontSize: 16,
    fontWeight: "600",
    fontFamily: "Exo2_400Regular",
  },

  // Common section styles
  section: {
    padding: 20,
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
});

// AAVE Positions Styles
export const AavePositionsStyles = StyleSheet.create({
  container: {
    ...SharedStyles.scrollContainer,
  },
  header: {
    ...SharedStyles.pageHeader,
  },
  title: {
    ...SharedStyles.pageTitle,
  },
  address: {
    ...SharedStyles.address,
  },

  // Health Factor
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
  },
  healthFactorStatus: {
    fontSize: 16,
    fontWeight: "600",
    fontFamily: "Exo2_400Regular",
    marginTop: 8,
  },

  // Positions
  section: {
    ...SharedStyles.section,
  },
  sectionTitle: {
    ...SharedStyles.sectionTitle,
  },
  positionCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "rgba(0, 255, 0, 0.05)",
    borderRadius: 16,
    padding: 20,
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
    ...SharedStyles.iconContainer,
  },
  icon: {
    ...SharedStyles.icon,
  },
  placeholderIcon: {
    ...SharedStyles.placeholderIcon,
  },
  placeholderText: {
    ...SharedStyles.placeholderText,
  },
  positionInfo: {
    flex: 1,
  },
  positionSymbol: {
    fontSize: 18,
    fontWeight: "600",
    color: "white",
    fontFamily: "Exo2_400Regular",
    marginBottom: 4,
  },
  positionName: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.6)",
    fontFamily: "Exo2_400Regular",
  },
  positionRight: {
    alignItems: "flex-end",
  },
  positionAmount: {
    fontSize: 16,
    fontWeight: "600",
    color: mainColor,
    fontFamily: "Exo2_400Regular",
    marginBottom: 4,
  },
  positionLabel: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.5)",
    fontFamily: "Exo2_400Regular",
  },
  borrowedAmount: {
    color: "#FF6B6B",
  },

  // States
  loadingContainer: {
    ...SharedStyles.loadingContainer,
  },
  loadingText: {
    ...SharedStyles.loadingText,
  },
  emptyState: {
    ...SharedStyles.emptyState,
  },
  emptyText: {
    ...SharedStyles.emptyText,
  },
  emptySubtext: {
    ...SharedStyles.emptySubtext,
  },
  errorContainer: {
    ...SharedStyles.errorContainer,
  },
  errorText: {
    ...SharedStyles.errorText,
  },
  errorDetail: {
    ...SharedStyles.errorDetail,
  },
});

// Assets View Styles
export const AssetsViewStyles = StyleSheet.create({
  container: {
    ...SharedStyles.scrollContainer,
  },
  header: {
    ...SharedStyles.pageHeader,
  },
  title: {
    ...SharedStyles.pageTitle,
  },
  totalValue: {
    fontSize: 36,
    fontWeight: "800",
    color: mainColor,
    fontFamily: "Exo2_400Regular",
    marginBottom: 8,
  },
  address: {
    ...SharedStyles.address,
  },

  // Assets List
  assetsList: {
    padding: 16,
  },
  assetItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "rgba(0, 255, 0, 0.05)",
    borderRadius: 16,
    padding: 20,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "rgba(0, 255, 0, 0.1)",
  },
  assetLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  iconContainer: {
    ...SharedStyles.iconContainer,
  },
  icon: {
    ...SharedStyles.icon,
  },
  assetInfo: {
    flex: 1,
  },
  assetSymbol: {
    fontSize: 18,
    fontWeight: "600",
    color: "white",
    fontFamily: "Exo2_400Regular",
    marginBottom: 4,
  },
  assetName: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.6)",
    fontFamily: "Exo2_400Regular",
  },
  assetRight: {
    alignItems: "flex-end",
  },
  assetBalance: {
    fontSize: 16,
    fontWeight: "600",
    color: "white",
    fontFamily: "Exo2_400Regular",
    marginBottom: 4,
  },
  assetValue: {
    fontSize: 16,
    fontWeight: "700",
    color: mainColor,
    fontFamily: "Exo2_400Regular",
    marginBottom: 2,
  },
  assetPrice: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.5)",
    fontFamily: "Exo2_400Regular",
  },

  // States
  loadingContainer: {
    ...SharedStyles.loadingContainer,
  },
  loadingText: {
    ...SharedStyles.loadingText,
  },
  emptyState: {
    ...SharedStyles.emptyState,
  },
  emptyText: {
    ...SharedStyles.emptyText,
  },
});

// Wallet Button Styles
export const WalletButtonStyles = StyleSheet.create({
  button: {
    backgroundColor: mainColor,
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
    minWidth: 200,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    shadowColor: mainColor,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  loadingButton: {
    backgroundColor: "rgba(0, 255, 0, 0.7)",
    gap: 8,
  },
  disconnectButton: {
    backgroundColor: "rgba(255, 0, 0, 0.1)",
    borderWidth: 2,
    borderColor: "#ff6b6b",
    shadowColor: "#ff6b6b",
  },
  disconnectingButton: {
    backgroundColor: "rgba(255, 0, 0, 0.2)",
    borderWidth: 2,
    borderColor: "#ff6b6b",
    shadowColor: "#ff6b6b",
    gap: 8,
  },
  buttonText: {
    color: backgroundColor,
    fontSize: 16,
    fontWeight: "600",
    fontFamily: "Exo2_400Regular",
  },
  disconnectButtonText: {
    color: "#ff6b6b",
    fontSize: 16,
    fontWeight: "600",
    fontFamily: "Exo2_400Regular",
  },
  disconnectingButtonText: {
    color: "#ff6b6b",
    fontSize: 16,
    fontWeight: "600",
    fontFamily: "Exo2_400Regular",
  },
});

// Wallet Button Expanded Styles
export const WalletButtonExpandedStyles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
  },
  button: {
    ...WalletButtonStyles.button,
  },
  loadingButton: {
    ...WalletButtonStyles.loadingButton,
  },
  disconnectButton: {
    backgroundColor: "transparent",
    borderWidth: 2,
    borderColor: mainColor,
    marginTop: 16,
    minWidth: 160,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    shadowColor: mainColor,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    borderRadius: 12,
  },
  buttonText: {
    ...WalletButtonStyles.buttonText,
  },
  disconnectButtonText: {
    color: mainColor,
    fontSize: 14,
    fontWeight: "500",
    fontFamily: "Exo2_400Regular",
  },

  // Connected State
  connectedContainer: {
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
    backgroundColor: "rgba(0, 255, 0, 0.05)",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(0, 255, 0, 0.2)",
    minWidth: 280,
  },
  balanceContainer: {
    alignItems: "center",
    marginBottom: 16,
  },
  balanceLabel: {
    color: "rgba(255, 255, 255, 0.7)",
    fontSize: 12,
    fontWeight: "400",
    fontFamily: "Exo2_400Regular",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 4,
  },
  balanceAmount: {
    color: mainColor,
    fontSize: 24,
    fontWeight: "700",
    fontFamily: "Exo2_400Regular",
  },
  accountContainer: {
    alignItems: "center",
    marginBottom: 8,
  },
  accountLabel: {
    color: "rgba(255, 255, 255, 0.7)",
    fontSize: 12,
    fontWeight: "400",
    fontFamily: "Exo2_400Regular",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 4,
  },
  accountAddress: {
    color: "white",
    fontSize: 16,
    fontWeight: "500",
    fontFamily: "Exo2_400Regular",
    backgroundColor: "rgba(0, 0, 0, 0.3)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },

  // Error State
  errorContainer: {
    marginTop: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: "rgba(255, 0, 0, 0.1)",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(255, 0, 0, 0.3)",
  },
  errorText: {
    color: "#ff6b6b",
    fontSize: 14,
    fontWeight: "400",
    fontFamily: "Exo2_400Regular",
    textAlign: "center",
  },
});

// Wallet Button Header Styles
export const WalletButtonHeaderStyles = StyleSheet.create({
  button: {
    backgroundColor: mainColor,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    shadowColor: mainColor,
    shadowOffset: {
      width: 0,
      height: 0,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  loadingButton: {
    backgroundColor: "rgba(0, 255, 0, 0.7)",
    gap: 8,
  },
  disconnectButton: {
    backgroundColor: "rgba(255, 0, 0, 0.1)",
    borderWidth: 2,
    borderColor: "#ff6b6b",
    shadowColor: "#ff6b6b",
  },
  disconnectingButton: {
    backgroundColor: "rgba(255, 0, 0, 0.2)",
    borderWidth: 2,
    borderColor: "#ff6b6b",
    shadowColor: "#ff6b6b",
    gap: 8,
  },
  buttonText: {
    color: backgroundColor,
    fontSize: 14,
    fontWeight: "600",
    fontFamily: "Exo2_400Regular",
  },
  disconnectButtonText: {
    color: "#ff6b6b",
    fontSize: 14,
    fontWeight: "600",
    fontFamily: "Exo2_400Regular",
  },
  disconnectingButtonText: {
    color: "#ff6b6b",
    fontSize: 14,
    fontWeight: "600",
    fontFamily: "Exo2_400Regular",
  },
});

export default GlobalStyles;
