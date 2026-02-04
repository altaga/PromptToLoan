import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { ethers } from "ethers";

const WalletContext = createContext();

export const WalletProvider = ({ children }) => {
  const [account, setAccount] = useState(null);
  const [balance, setBalance] = useState(null);
  const [status, setStatus] = useState("loading"); // 'loading' | 'connected' | 'disconnected'
  const [error, setError] = useState(null);
  const [txLoading, setTxLoading] = useState(false);

  const COOKIE_NAME = "wallet_session";

  // --- Cookie Helpers (Original) ---
  const setCookie = (name, value, days) => {
    const date = new Date();
    date.setTime(date.getTime() + days * 24 * 60 * 60 * 1000);
    document.cookie = `${name}=${value};expires=${date.toUTCString()};path=/;SameSite=Lax`;
  };

  const getCookie = (name) => {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(";").shift();
  };

  const deleteCookie = (name) => {
    document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
  };

  // --- Wallet Actions ---
  const disconnect = useCallback(() => {
    setAccount(null);
    setBalance(null);
    deleteCookie(COOKIE_NAME);
    setStatus("disconnected");
  }, []);

  const updateAccountData = useCallback(async (walletAddress, provider) => {
    setAccount(walletAddress);
    setCookie(COOKIE_NAME, walletAddress, 7);

    try {
      const balanceWei = await provider.getBalance(walletAddress);
      setBalance(ethers.utils.formatEther(balanceWei));
      setStatus("connected");
    } catch (err) {
      setStatus("connected");
    }
  }, []);

  const connect = async () => {
    if (!window.ethereum) {
      setError("No provider found");
      return;
    }
    setStatus("loading");
    try {
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const accounts = await provider.send("eth_requestAccounts", []);
      await updateAccountData(accounts[0], provider);
      setError(null);
    } catch (err) {
      setError("User rejected connection");
      setStatus("disconnected");
    }
  };

  /**
   * sendTransaction (Modified for Arbitrary Transactions)
   * @param {Object} txConfig - { to, value, data, gasLimit, etc. }
   */
  const sendTransaction = async (txConfig) => {
    if (!window.ethereum || !account) {
      setError("Wallet not connected");
      return;
    }

    setTxLoading(true);
    setError(null);

    try {
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const signer = provider.getSigner();

      // Send the arbitrary transaction (can include 'data' for contract calls)
      const tx = await signer.sendTransaction(txConfig);
      
      const receipt = await tx.wait();

      // Refresh data
      await updateAccountData(account, provider);
      setTxLoading(false);
      return receipt;
    } catch (err) {
      console.error(err);
      setTxLoading(false);
      const msg = err.reason || err.message || "Transaction failed";
      setError(msg);
      throw err;
    }
  };

  // --- Effects & Listeners ---
  useEffect(() => {
    const init = async () => {
      const savedAccount = getCookie(COOKIE_NAME);
      if (savedAccount && window.ethereum) {
        try {
          const provider = new ethers.providers.Web3Provider(window.ethereum);
          const accounts = await provider.listAccounts();
          if (accounts.length > 0) {
            await updateAccountData(accounts[0], provider);
          } else {
            disconnect();
          }
        } catch (e) {
          disconnect();
        }
      } else {
        setStatus("disconnected");
      }
    };

    init();

    if (window.ethereum) {
      const handleAccounts = (accounts) => {
        if (accounts.length > 0) {
          const provider = new ethers.providers.Web3Provider(window.ethereum);
          updateAccountData(accounts[0], provider);
        } else {
          disconnect();
        }
      };

      const handleChainChanged = () => window.location.reload();

      window.ethereum.on("accountsChanged", handleAccounts);
      window.ethereum.on("chainChanged", handleChainChanged);

      return () => {
        window.ethereum.removeListener("accountsChanged", handleAccounts);
        window.ethereum.removeListener("chainChanged", handleChainChanged);
      };
    }
  }, [updateAccountData, disconnect]);

  return (
    <WalletContext.Provider
      value={{
        account,
        balance,
        status,
        error,
        txLoading,
        connect,
        disconnect,
        sendTransaction,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
};

export const useWallet = () => useContext(WalletContext);