import { Platform } from 'react-native';
import * as ExpoSecureStore from 'expo-secure-store';

type Store = {
  getItemAsync: (key: string) => Promise<string | null>;
  setItemAsync: (key: string, value: string) => Promise<void>;
  deleteItemAsync: (key: string) => Promise<void>;
};

const memoryStore = new Map<string, string>();

const hasWindowStorage = () => typeof window !== 'undefined' && !!window.localStorage;

const webStore: Store = {
  async getItemAsync(key) {
    if (hasWindowStorage()) {
      return window.localStorage.getItem(key);
    }
    return memoryStore.get(key) ?? null;
  },
  async setItemAsync(key, value) {
    if (hasWindowStorage()) {
      window.localStorage.setItem(key, value);
    }
    memoryStore.set(key, value);
  },
  async deleteItemAsync(key) {
    if (hasWindowStorage()) {
      window.localStorage.removeItem(key);
    }
    memoryStore.delete(key);
  },
};

const nativeStore: Store = {
  getItemAsync: (key) => ExpoSecureStore.getItemAsync(key),
  setItemAsync: (key, value) => ExpoSecureStore.setItemAsync(key, value),
  deleteItemAsync: (key) => ExpoSecureStore.deleteItemAsync(key),
};

export const secureStore: Store = Platform.OS === 'web' ? webStore : nativeStore;
