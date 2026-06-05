import { 
  initConnection, 
  endConnection, 
  fetchProducts, 
  getAvailablePurchases, 
  requestPurchase, 
  finishTransaction, 
  purchaseUpdatedListener, 
  purchaseErrorListener,
  Purchase
} from 'expo-iap';
import { saveSetting } from '../db/database';
import { useWorkoutStore } from '../store/workoutStore';

export const PREMIUM_PRODUCT_ID = 'com.gekirennomad.trenote.premium';

let iapInitialized = false;
let purchaseUpdateSubscription: any = null;
let purchaseErrorSubscription: any = null;

export const initIAPConnection = async (): Promise<boolean> => {
  if (iapInitialized) return true;
  try {
    await initConnection();
    iapInitialized = true;
    console.log('IAP connection initialized successfully');
    return true;
  } catch (e) {
    console.warn('Failed to initialize IAP connection:', e);
    return false;
  }
};

export const setupIAPListeners = (
  onSuccess: () => void,
  onError: (errorMsg: string) => void
) => {
  // Clean up existing listeners if any
  if (purchaseUpdateSubscription) {
    purchaseUpdateSubscription.remove();
  }
  if (purchaseErrorSubscription) {
    purchaseErrorSubscription.remove();
  }

  // Listener for purchase updates
  purchaseUpdateSubscription = purchaseUpdatedListener(async (purchase: Purchase) => {
    console.log('Purchase update received:', purchase);
    const receipt = purchase.purchaseToken;
    if (receipt) {
      try {
        // Complete transaction first
        await finishTransaction({ purchase, isConsumable: false });
        
        // Grant premium entitlement locally in SQLite database
        await saveSetting('premium_until', 'perpetual');
        await saveSetting('ai_tokens_balance', '20'); // Reset AI tokens to 20 for premium
        
        // Update Zustand store
        useWorkoutStore.getState().setPremiumUntil('perpetual');
        useWorkoutStore.getState().setAITokensBalance(20);
        
        onSuccess();
      } catch (err) {
        console.error('Failed to finish transaction:', err);
        onError('トランザクションの完了に失敗しました。');
      }
    }
  });

  // Listener for purchase errors
  purchaseErrorSubscription = purchaseErrorListener((error: any) => {
    console.warn('Purchase error received:', error);
    onError(error.message || '購入プロセス中にエラーが発生しました。');
  });
};

export const fetchPremiumProducts = async () => {
  try {
    await initIAPConnection();
    const products = await fetchProducts({
      skus: [PREMIUM_PRODUCT_ID],
      type: 'in-app'
    });
    console.log('Fetched products:', products);
    return products;
  } catch (e) {
    console.warn('Failed to fetch products:', e);
    return [];
  }
};

export const purchasePremium = async () => {
  try {
    await initIAPConnection();
    console.log('Requesting purchase for SKU:', PREMIUM_PRODUCT_ID);
    await requestPurchase({
      request: {
        apple: { sku: PREMIUM_PRODUCT_ID },
        google: { skus: [PREMIUM_PRODUCT_ID] }
      },
      type: 'in-app'
    });
  } catch (e: any) {
    console.warn('Purchase request failed:', e);
    throw e;
  }
};

export const restorePurchases = async (): Promise<boolean> => {
  try {
    await initIAPConnection();
    console.log('Restoring purchases...');
    const purchases = await getAvailablePurchases();
    console.log('Available purchases:', purchases);
    
    const premiumPurchase = purchases.find((p: Purchase) => p.productId === PREMIUM_PRODUCT_ID);
    if (premiumPurchase) {
      // Restore entitlement locally
      await saveSetting('premium_until', 'perpetual');
      await saveSetting('ai_tokens_balance', '20');
      useWorkoutStore.getState().setPremiumUntil('perpetual');
      useWorkoutStore.getState().setAITokensBalance(20);
      return true;
    }
    return false;
  } catch (e) {
    console.warn('Failed to restore purchases:', e);
    return false;
  }
};

export const cleanupIAP = () => {
  if (purchaseUpdateSubscription) {
    purchaseUpdateSubscription.remove();
    purchaseUpdateSubscription = null;
  }
  if (purchaseErrorSubscription) {
    purchaseErrorSubscription.remove();
    purchaseErrorSubscription = null;
  }
  try {
    endConnection();
    iapInitialized = false;
  } catch (e) {
    console.warn('Error ending IAP connection:', e);
  }
};
