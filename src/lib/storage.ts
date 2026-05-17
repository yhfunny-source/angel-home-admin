// 兼容层：处理localStorage不可用的场景（如Safari隐私模式、微信内置浏览器）
const memoryStorage: Record<string, string> = {};

function isLocalStorageAvailable(): boolean {
  try {
    const test = '__test__';
    localStorage.setItem(test, test);
    localStorage.removeItem(test);
    return true;
  } catch {
    return false;
  }
}

const hasLocalStorage = isLocalStorageAvailable();

export const storage = {
  get(key: string): string | null {
    if (hasLocalStorage) {
      return localStorage.getItem(key);
    }
    return memoryStorage[key] || null;
  },

  set(key: string, value: string): void {
    if (hasLocalStorage) {
      try {
        localStorage.setItem(key, value);
      } catch {
        memoryStorage[key] = value;
      }
    } else {
      memoryStorage[key] = value;
    }
  },

  remove(key: string): void {
    if (hasLocalStorage) {
      localStorage.removeItem(key);
    }
    delete memoryStorage[key];
  },

  clear(): void {
    if (hasLocalStorage) {
      localStorage.clear();
    }
    Object.keys(memoryStorage).forEach(k => delete memoryStorage[k]);
  },
};
