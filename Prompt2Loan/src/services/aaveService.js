import { UiPoolDataProvider } from "@aave/contract-helpers";
import { AaveV3Base } from "@bgd-labs/aave-address-book";
import { ethers } from "ethers";

const RAY = ethers.BigNumber.from("1000000000000000000000000000"); // 1e27
const SECONDS_PER_YEAR = 31536000;

/**
 * Converts Aave RAY rates to APY percentage.
 */
function rayToApy(rayValue) {
  const rate = Number(ethers.utils.formatUnits(rayValue, 27));
  const apy = Math.pow(1 + rate / SECONDS_PER_YEAR, SECONDS_PER_YEAR) - 1;
  return apy; // Return as decimal (0.05 = 5%)
}

// AAVE Assets on Base
export const AAVE_ASSETS = {
  WETH: "0x4200000000000000000000000000000000000006",
  USDC: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
  aWETH: "0xD4a0e0b9149BCee3C920d2E00b5dE09138fd8bb7",
};

// Token configurations with icons
export const AAVE_TOKENS = [
  {
    symbol: "WETH",
    name: "Wrapped Ethereum",
    address: AAVE_ASSETS.WETH,
    decimals: 18,
    icon: require("../assets/weth.png"),
    canSupply: true,
    canBorrow: false,
  },
  {
    symbol: "ETH",
    name: "Ethereum",
    address: AAVE_ASSETS.WETH, // ETH uses WETH address
    decimals: 18,
    icon: require("../assets/eth.png"),
    canSupply: true,
    canBorrow: false,
  },
  {
    symbol: "USDC",
    name: "USD Coin",
    address: AAVE_ASSETS.USDC,
    decimals: 6,
    icon: require("../assets/usdc.png"),
    canSupply: false,
    canBorrow: true,
  },
];

class AaveService {
  constructor() {
    this.provider = null;
    this.uiPool = null;
    this.poolContract = null;
    this.reservesCache = null;
    this.reservesByAsset = null;
    this.isInitialized = false;
  }

  async initialize() {
    if (this.isInitialized) return;

    if (!window.ethereum) {
      throw new Error("No ethereum provider found");
    }

    this.provider = new ethers.providers.Web3Provider(window.ethereum);

    this.uiPool = new UiPoolDataProvider({
      uiPoolDataProviderAddress: AaveV3Base.UI_POOL_DATA_PROVIDER,
      provider: this.provider,
      chainId: 8453, // Base mainnet
    });

    // Import IPool ABI dynamically
    try {
      const IPoolABI =
        await import("@aave/core-v3/artifacts/contracts/interfaces/IPool.sol/IPool.json");
      this.poolContract = new ethers.Contract(
        AaveV3Base.POOL,
        IPoolABI.abi,
        this.provider,
      );
    } catch (error) {
      // Fallback minimal ABI for getUserAccountData
      const minimalABI = [
        {
          inputs: [{ internalType: "address", name: "user", type: "address" }],
          name: "getUserAccountData",
          outputs: [
            {
              internalType: "uint256",
              name: "totalCollateralBase",
              type: "uint256",
            },
            { internalType: "uint256", name: "totalDebtBase", type: "uint256" },
            {
              internalType: "uint256",
              name: "availableBorrowsBase",
              type: "uint256",
            },
            {
              internalType: "uint256",
              name: "currentLiquidationThreshold",
              type: "uint256",
            },
            { internalType: "uint256", name: "ltv", type: "uint256" },
            { internalType: "uint256", name: "healthFactor", type: "uint256" },
          ],
          stateMutability: "view",
          type: "function",
        },
      ];
      this.poolContract = new ethers.Contract(
        AaveV3Base.POOL,
        minimalABI,
        this.provider,
      );
    }

    this.isInitialized = true;
  }

  async loadReserves() {
    if (this.reservesCache) return;

    const [reserves] = await this.uiPool.getReservesData({
      lendingPoolAddressProvider: AaveV3Base.POOL_ADDRESSES_PROVIDER,
    });

    this.reservesCache = reserves;
    this.reservesByAsset = {};

    for (const r of reserves) {
      this.reservesByAsset[r.underlyingAsset.toLowerCase()] = r;
    }
  }

  async getUserReserves(user) {
    const [userReserves] = await this.uiPool.getUserReservesData({
      lendingPoolAddressProvider: AaveV3Base.POOL_ADDRESSES_PROVIDER,
      user,
    });

    return userReserves;
  }

  async getUserPositions(user) {
    if (!this.isInitialized) {
      throw new Error("Service not initialized. Call initialize() first.");
    }

    try {
      await this.loadReserves();
      const userReserves = await this.getUserReserves(user);
      const assets = Object.values(AAVE_ASSETS);

      const positions = assets
        .map((asset) => {
          const r = userReserves.find(
            (x) => x.underlyingAsset.toLowerCase() === asset.toLowerCase(),
          );
          if (!r) return null;

          const reserve = this.reservesByAsset[asset.toLowerCase()];
          if (!reserve) return null;

          const supplied = r.scaledATokenBalance
            .mul(reserve.liquidityIndex)
            .div(RAY);

          const borrowedVariable = r.scaledVariableDebt
            .mul(reserve.variableBorrowIndex)
            .div(RAY);

          // Find token config
          const tokenConfig = AAVE_TOKENS.find(
            (t) => t.address.toLowerCase() === asset.toLowerCase(),
          );

          return {
            asset,
            symbol: reserve.symbol,
            name: tokenConfig?.name || reserve.symbol,
            icon: tokenConfig?.icon,
            supplied,
            borrowedVariable,
            decimals: reserve.decimals,
            formattedSupplied: ethers.utils.formatUnits(
              supplied,
              reserve.decimals,
            ),
            formattedBorrowed: ethers.utils.formatUnits(
              borrowedVariable,
              reserve.decimals,
            ),
            hasSupplied: !supplied.isZero(),
            hasBorrowed: !borrowedVariable.isZero(),
            supplyAPY: reserve.liquidityRate
              ? rayToApy(reserve.liquidityRate)
              : 0,
            borrowAPY: reserve.variableBorrowRate
              ? rayToApy(reserve.variableBorrowRate)
              : 0,
          };
        })
        .filter(Boolean);

      return positions;
    } catch (error) {
      console.error("Error fetching AAVE positions:", error);
      return [];
    }
  }

  async getHealthFactor(user) {
    if (!this.isInitialized) {
      throw new Error("Service not initialized. Call initialize() first.");
    }

    try {
      const data = await this.poolContract.getUserAccountData(user);
      return data.healthFactor; // Returns BigNumber in ray (1e18)
    } catch (error) {
      console.error("Error fetching health factor:", error);
      return ethers.BigNumber.from(0);
    }
  }

  async getUserAccountData(user) {
    if (!this.isInitialized) {
      throw new Error("Service not initialized. Call initialize() first.");
    }

    try {
      const data = await this.poolContract.getUserAccountData(user);
      return {
        totalCollateralBase: data.totalCollateralBase,
        totalDebtBase: data.totalDebtBase,
        availableBorrowsBase: data.availableBorrowsBase,
        currentLiquidationThreshold: data.currentLiquidationThreshold,
        ltv: data.ltv,
        healthFactor: data.healthFactor,
        formattedHealthFactor: ethers.utils.formatUnits(data.healthFactor, 18),
        formattedTotalCollateral: ethers.utils.formatEther(
          data.totalCollateralBase,
        ),
        formattedTotalDebt: ethers.utils.formatEther(data.totalDebtBase),
        formattedAvailableBorrows: ethers.utils.formatEther(
          data.availableBorrowsBase,
        ),
      };
    } catch (error) {
      console.error("Error fetching user account data:", error);
      return {
        totalCollateralBase: ethers.BigNumber.from(0),
        totalDebtBase: ethers.BigNumber.from(0),
        availableBorrowsBase: ethers.BigNumber.from(0),
        currentLiquidationThreshold: ethers.BigNumber.from(0),
        ltv: ethers.BigNumber.from(0),
        healthFactor: ethers.BigNumber.from(0),
        formattedHealthFactor: "0",
        formattedTotalCollateral: "0",
        formattedTotalDebt: "0",
        formattedAvailableBorrows: "0",
      };
    }
  }

  formatAmount(amount, decimals) {
    return Number(ethers.utils.formatUnits(amount, decimals)).toFixed(6);
  }

  // Cleanup method
  destroy() {
    this.provider = null;
    this.uiPool = null;
    this.poolContract = null;
    this.reservesCache = null;
    this.reservesByAsset = null;
    this.isInitialized = false;
  }
}

// Export singleton instance
export const aaveService = new AaveService();
