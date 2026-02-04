import { batchBalanceService } from '../services/batchBalanceService.js';

// Utility function to test the batch balance service
export const testBatchBalanceService = async (walletAddress) => {
  try {
    console.log('🔄 Initializing batch balance service...');
    await batchBalanceService.initialize();
    
    console.log('✅ Service initialized successfully');
    console.log('📊 Fetching balances for:', walletAddress);
    
    const balances = await batchBalanceService.fetchBalances(walletAddress);
    
    console.log('💰 Balances received:');
    Object.entries(balances).forEach(([token, data]) => {
      console.log(`  ${token}: ${data.formatted} (${data.raw} raw)`);
    });
    
    console.log('🔄 Starting periodic fetch (every 1 minute)...');
    batchBalanceService.startPeriodicFetch(walletAddress);
    
    // Add a listener to log updates
    const unsubscribe = batchBalanceService.addListener((newBalances) => {
      console.log('🔔 Balance update received:', new Date().toLocaleTimeString());
      Object.entries(newBalances).forEach(([token, data]) => {
        console.log(`  ${token}: ${data.formatted}`);
      });
    });
    
    // Return cleanup function
    return () => {
      console.log('🛑 Stopping batch balance service...');
      batchBalanceService.stopPeriodicFetch();
      unsubscribe();
    };
    
  } catch (error) {
    console.error('❌ Error testing batch balance service:', error);
    throw error;
  }
};

// Example usage in browser console:
// import { testBatchBalanceService } from './src/utils/testBatchBalance.js';
// const cleanup = await testBatchBalanceService('0xYourWalletAddress');
// // Later, to stop: cleanup();