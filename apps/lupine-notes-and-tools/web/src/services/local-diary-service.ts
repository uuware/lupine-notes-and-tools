export interface LocalDiaryProps {
  id: number;
  date: string; // YYYY-MM-DD
  title: string;
  content: string;
  color?: string;
  updatedAt: number;
  orderIndex?: number;
}

import { StorageManager } from './cloud/storage-manager';

export const LocalDiaryService = {
  getAllDiaries: (): Partial<LocalDiaryProps>[] => {
    try {
      const diariesList = [...StorageManager.getCategoryList('diariesList')];
      return diariesList.sort((a, b) => {
        const orderA = a.orderIndex !== undefined ? a.orderIndex : a.id;
        const orderB = b.orderIndex !== undefined ? b.orderIndex : b.id;
        return orderB - orderA;
      });
    } catch (e) {
      console.error('Failed to load diaries list', e);
      return [];
    }
  },

  getDiaryById: async (id: number): Promise<LocalDiaryProps | undefined> => {
    return await StorageManager.readItem('diaries', id.toString());
  },

  getDiaryByDate: async (dateStr: string): Promise<LocalDiaryProps | undefined> => {
    const listMatch = LocalDiaryService.getAllDiaries().find((d) => d.date === dateStr);
    if (!listMatch || !listMatch.id) return undefined;
    
    return await StorageManager.readItem('diaries', listMatch.id.toString());
  },

  saveDiary: async (diary: LocalDiaryProps): Promise<LocalDiaryProps> => {
    const list = LocalDiaryService.getAllDiaries();
    diary.updatedAt = Date.now();

    if (diary.id <= 0) {
      diary.id = Date.now();
      const maxOrder = list.length > 0 ? Math.max(...list.map((d) => d.orderIndex ?? d.id!)) : Date.now();
      diary.orderIndex = maxOrder + 1;
    }

    const listMetadata: Partial<LocalDiaryProps> = {
      id: diary.id,
      date: diary.date,
      title: diary.title,
      color: diary.color,
      updatedAt: diary.updatedAt,
      orderIndex: diary.orderIndex,
    };

    await StorageManager.saveItem('diaries', 'diariesList', diary, listMetadata);
    return diary;
  },

  updateDiaryOrders: async (orderedIds: number[]): Promise<boolean> => {
    const list = LocalDiaryService.getAllDiaries();
    let updated = false;
    const len = orderedIds.length;
    orderedIds.forEach((id, idx) => {
      const diaryMeta = list.find((d) => d.id === id);
      if (diaryMeta) {
        diaryMeta.orderIndex = len - idx;
        updated = true;
      }
    });

    if (updated) {
       await StorageManager.getActiveProvider().writeCategoryList('diaries', list);
    }
    return updated;
  },

  deleteDiary: async (id: number): Promise<boolean> => {
    let list = LocalDiaryService.getAllDiaries();
    const len = list.length;
    list = list.filter((d) => d.id !== id);
    
    if (list.length !== len) {
       StorageManager.getCategoryList('diariesList').splice(0, len, ...list); 
       await StorageManager.getActiveProvider().writeCategoryList('diaries', list);
       await StorageManager.getActiveProvider().deleteItem('diaries', id.toString());
       return true;
    }
    return false;
  },
};
