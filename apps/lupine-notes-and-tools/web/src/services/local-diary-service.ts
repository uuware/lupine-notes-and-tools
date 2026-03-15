export interface LocalDiaryProps {
  id: number;
  date: string; // YYYY-MM-DD
  title: string;
  content: string;
  color?: string;
  updatedAt: number;
  orderIndex?: number;
}

const STORAGE_KEY = 'lj_diaries';

export const LocalDiaryService = {
  getAllDiaries: (): LocalDiaryProps[] => {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      const diaries: LocalDiaryProps[] = data ? JSON.parse(data) : [];
      return diaries.sort((a, b) => {
        const orderA = a.orderIndex !== undefined ? a.orderIndex : a.id;
        const orderB = b.orderIndex !== undefined ? b.orderIndex : b.id;
        return orderB - orderA;
      });
    } catch (e) {
      console.error('Failed to load diaries', e);
      return [];
    }
  },

  getDiaryById: (id: number): LocalDiaryProps | undefined => {
    return LocalDiaryService.getAllDiaries().find((d) => d.id === id);
  },

  getDiaryByDate: (dateStr: string): LocalDiaryProps | undefined => {
    return LocalDiaryService.getAllDiaries().find((d) => d.date === dateStr);
  },

  saveDiary: (diary: LocalDiaryProps): LocalDiaryProps => {
    const diaries = LocalDiaryService.getAllDiaries();
    diary.updatedAt = Date.now();

    if (diary.id <= 0) {
      diary.id = Date.now();
      const maxOrder = diaries.length > 0 ? Math.max(...diaries.map((d) => d.orderIndex ?? d.id)) : Date.now();
      diary.orderIndex = maxOrder + 1;
      diaries.unshift(diary);
    } else {
      const index = diaries.findIndex((d) => d.id === diary.id);
      if (index > -1) {
        diaries[index] = diary;
      } else {
        diaries.unshift(diary);
      }
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(diaries));
    return diary;
  },

  updateDiaryOrders: (orderedIds: number[]): boolean => {
    const diaries = LocalDiaryService.getAllDiaries();
    let updated = false;
    const len = orderedIds.length;
    orderedIds.forEach((id, idx) => {
      const diary = diaries.find((d) => d.id === id);
      if (diary) {
        diary.orderIndex = len - idx;
        updated = true;
      }
    });

    if (updated) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(diaries));
    }
    return updated;
  },

  deleteDiary: (id: number): boolean => {
    let diaries = LocalDiaryService.getAllDiaries();
    const len = diaries.length;
    diaries = diaries.filter((d) => d.id !== id);
    if (diaries.length !== len) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(diaries));
      return true;
    }
    return false;
  },
};
