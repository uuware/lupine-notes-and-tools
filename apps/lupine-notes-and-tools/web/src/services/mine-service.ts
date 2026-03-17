import { LocalDiaryService } from './local-diary-service';
import { LocalFinanceService } from './local-finance-service';
import { LocalNotesService } from './local-notes-service';
import { LocalToolsService } from './local-tools-service';
import { StorageManager } from './cloud/storage-manager';

export interface MineStats {
  noteCount: number;
  diaryCount: number;
  financeCount: number;
  totalRecords: number;
}

export interface BackupData {
  notes: any[];
  diaries: any[];
  finances: any[];
  tools: any[];
  timestamp: string;
}

export const MineService = {
  getStats: (): MineStats => {
    const notes = LocalNotesService.getAllNotes();
    const diaries = LocalDiaryService.getAllDiaries();
    const finances = LocalFinanceService.getAllRecords();

    return {
      noteCount: notes.length,
      diaryCount: diaries.length,
      financeCount: finances.length,
      totalRecords: notes.length + diaries.length + finances.length,
    };
  },

  exportBackup: async (): Promise<string> => {
    const notesMeta = LocalNotesService.getAllNotes();
    const diariesMeta = LocalDiaryService.getAllDiaries();
    const financesMeta = LocalFinanceService.getAllRecords();
    const toolsMeta = LocalToolsService.getItems();

    const getFullItems = async (metaList: any[], fetcher: (id: any) => Promise<any>) => {
       const promises = metaList.map(async (meta) => {
          try {
            const fullItem = await fetcher(meta.id);
            return fullItem || meta;
          } catch (e) {
            return meta;
          }
       });
       return Promise.all(promises);
    };

    const fullNotes = await getFullItems(notesMeta, (id) => LocalNotesService.getNoteById(Number(id)));
    const fullDiaries = await getFullItems(diariesMeta, (id) => LocalDiaryService.getDiaryById(Number(id)));
    const fullFinances = await getFullItems(financesMeta, (id) => LocalFinanceService.getRecordById(Number(id)));
    const fullTools = await getFullItems(toolsMeta, (id) => LocalToolsService.getItemById(String(id)));

    return JSON.stringify(
      {
        notes: fullNotes,
        diaries: fullDiaries,
        finances: fullFinances,
        tools: fullTools,
        timestamp: new Date().toISOString()
      },
      null,
      2
    );
  },

  importBackup: async (jsonStr: string): Promise<boolean> => {
    try {
      const data: BackupData = JSON.parse(jsonStr);
      
      const importCategory = async (items: any[], category: string, listKey: keyof Omit<import('./cloud/storage-manager').GlobalDataCache, 'stats'>) => {
          if (!Array.isArray(items)) return;
          for (const item of items) {
              // Create list metadata object by extracting preview values
              let meta = { ...item };
              if (category === 'notes' && meta.content) {
                  meta.plainText = meta.content.substring(0, 100);
                  delete meta.content;
              }
              if (category === 'diaries' && meta.content) {
                  meta.plainText = meta.content.substring(0, 100);
                  delete meta.content;
              }
              await StorageManager.saveItem(category, listKey, item, meta, true);
          }
      };

      await importCategory(data.notes, 'notes', 'notesList');
      await importCategory(data.diaries, 'diaries', 'diariesList');
      await importCategory(data.finances, 'finances', 'financesList');
      await importCategory(data.tools, 'tools', 'toolsList');
      
      return true;
    } catch (e) {
      console.error('Failed to import backup', e);
      return false;
    }
  },

  clearAllData: async () => {
    // Legacy cleanup
    localStorage.removeItem('lj_notes');
    localStorage.removeItem('lj_diaries');
    localStorage.removeItem('lj_finances');
    localStorage.removeItem('lj_tools');

    // Granular Storage V2 wipe
    const provider = StorageManager.getActiveProvider();
    const wipeCategory = async (category: keyof typeof StorageManager['providers'], listKey: keyof Omit<import('./cloud/storage-manager').GlobalDataCache, 'stats'>) => {
        const list = [...StorageManager.getCategoryList(listKey)];
        for (const item of list) {
            await provider.deleteItem(category as string, item.id);
        }
        StorageManager.getCategoryList(listKey).length = 0; // mutate RAM list directly
        await provider.writeCategoryList(category as string, []); // clear remote index
    };

    await wipeCategory('notes' as any, 'notesList');
    await wipeCategory('diaries' as any, 'diariesList');
    await wipeCategory('finances' as any, 'financesList');
    await wipeCategory('tools' as any, 'toolsList');
    
    // reset stats
    const stats = StorageManager.getStats();
    for (const k in stats) delete stats[k];
    await provider.writeStats({});
  },
};
