import { ethers } from "ethers";
import { TOKEN_ADDRESSES, BATCH_TOKEN_BALANCES_CONTRACT, BALANCE_REFRESH_INTERVAL } from "../core/constants";
import { abiBatchTokenBalances } from "../contracts/batchTokenBalances";

// Token configurations for Base Mainnet
const TOKENS = [
  {
    symbol: "ETH",
    address: TOKEN_ADDRESSES.ETH,
    decimals: 18,
  },
  {
    symbol: "USDC",
    address: TOKEN_ADDRESSES.USDC,
    decimals: 6,
  },
  {
    symbol: "WETH",
    address: TOKEN_ADDRESSES.WETH,
    decimals: 18,
  },
  {
    symbol: "AWETH",
    address: TOKEN_ADDRESSES.AWETH,
    decimals: 18,
  },
];

class BatchBalanceService {
  constructor() {
    this.provider = null;
    this.contract = null;
    this.listeners = [];
    this.intervalId = null;
    this.isInitialized = false;
  }

  async initialize() {
    if (this.isInitialized) return;

    if (!window.ethereum) {
      throw new Error("No ethereum provider found");
    }

    this.provider = new ethers.providers.Web3Provider(window.ethereum);
    this.contract = new ethers.Contract(
      BATCH_TOKEN_BALANCES_CONTRACT,
      abiBatchTokenBalances,
      this.provider
    );

    this.isInitialized = true;
  }

  async fetchBalances(walletAddress) {
    if (!this.isInitialized) {
      throw new Error("Service not initialized. Call initialize() first.");
    }

    try {
      // Filter out ETH (native token) for batch contract call
      const tokenAddresses = TOKENS.filter(token => 
        token.address !== "0x0000000000000000000000000000000000000000"
      ).map(token => token.address);

      // Get native ETH balance
      const nativeBalance = await this.provider.getBalance(walletAddress);

      // Get ERC-20 token balances through batch contract
      const tokenBalances = tokenAddresses.length > 0 
        ? await this.contract.batchBalanceOf(walletAddress, tokenAddresses)
        : [];

      // Merge native balance with token balances
      const balancesMerge = [nativeBalance, ...tokenBalances];

      // Format balances according to token decimals
      const balances = {};
      TOKENS.forEach((token, i) => {
        const rawBalance = balancesMerge[i] || ethers.BigNumber.from(0);
        const formattedBalance = ethers.utils.formatUnits(rawBalance, token.decimals);
        
        balances[token.symbol] = {
          raw: rawBalance.toString(),
          formatted: formattedBalance,
          decimals: token.decimals,
          address: token.address,
        };
      });

      return balances;
    } catch (error) {
      console.error('Error fetching balances:', error);
      
      // Return zero balances on error
      const balances = {};
      TOKENS.forEach(token => {
        balances[token.symbol] = {
          raw: "0",
          formatted: "0",
          decimals: token.decimals,
          address: token.address,
        };
      });
      
      return balances;
    }
  }

  startPeriodicFetch(walletAddress) {
    if (this.intervalId) {
      this.stopPeriodicFetch();
    }

    this.intervalId = setInterval(async () => {
      try {
        const balances = await this.fetchBalances(walletAddress);
        this.notifyListeners(balances);
      } catch (error) {
        console.error('Error in periodic fetch:', error);
      }
    }, BALANCE_REFRESH_INTERVAL);
  }

  stopPeriodicFetch() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  addListener(callback) {
    this.listeners.push(callback);
    
    // Return unsubscribe function
    return () => {
      const index = this.listeners.indexOf(callback);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  notifyListeners(balances) {
    this.listeners.forEach(callback => {
      try {
        callback(balances);
      } catch (error) {
        console.error('Error in listener callback:', error);
      }
    });
  }

  // Cleanup method
  destroy() {
    this.stopPeriodicFetch();
    this.listeners = [];
    this.provider = null;
    this.contract = null;
    this.isInitialized = false;
  }
}

// Export singleton instance
export const batchBalanceService = new BatchBalanceService();