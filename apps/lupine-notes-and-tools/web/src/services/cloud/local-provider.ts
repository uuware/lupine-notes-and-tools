import { GranularStorageProvider } from './cloud-storage.interface';

// Helper to keep keys organized
const getKey = (category: string, id?: string) => {
  if (!id) return `lj_v2_${category}_list`;
  return `lj_v2_${category}_${id}`;
};

export const LocalStorageProvider: GranularStorageProvider = {
  id: 'local',
  name: 'Local Storage',
  
  isConfigured: () => true,
  
  readStats: async (): Promise<any | null> => {
    const data = localStorage.getItem('lj_v2_stats');
    return data ? JSON.parse(data) : null;
  },

  writeStats: async (stats: any): Promise<boolean> => {
    localStorage.setItem('lj_v2_stats', JSON.stringify(stats));
    return true;
  },

  listCategory: async (category: string): Promise<any[] | null> => {
    const data = localStorage.getItem(getKey(category));
    return data ? JSON.parse(data) : null;
  },

  writeCategoryList: async (category: string, listData: any[]): Promise<boolean> => {
    localStorage.setItem(getKey(category), JSON.stringify(listData));
    return true;
  },

  readItem: async (category: string, id: string): Promise<any | null> => {
    const data = localStorage.getItem(getKey(category, id));
    return data ? JSON.parse(data) : null;
  },

  writeItem: async (category: string, id: string, data: any): Promise<boolean> => {
    localStorage.setItem(getKey(category, id), JSON.stringify(data));
    return true;
  },

  deleteItem: async (category: string, id: string): Promise<boolean> => {
    localStorage.removeItem(getKey(category, id));
    return true;
  }
};
