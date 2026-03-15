import { LocalDiaryService } from './local-diary-service';
import { LocalFinanceService } from './local-finance-service';
import { LocalNotesService } from './local-notes-service';
import { LocalToolsService } from './local-tools-service';

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

  exportBackup: (): string => {
    const data: BackupData = {
      notes: LocalNotesService.getAllNotes(),
      diaries: LocalDiaryService.getAllDiaries(),
      finances: LocalFinanceService.getAllRecords(),
      tools: LocalToolsService.getItems(),
      timestamp: new Date().toISOString(),
    };
    return JSON.stringify(data, null, 2);
  },

  importBackup: (jsonStr: string): boolean => {
    try {
      const data: BackupData = JSON.parse(jsonStr);
      if (Array.isArray(data.notes)) {
        localStorage.setItem('lj_notes', JSON.stringify(data.notes));
      }
      if (Array.isArray(data.diaries)) {
        localStorage.setItem('lj_diaries', JSON.stringify(data.diaries));
      }
      if (Array.isArray(data.finances)) {
        localStorage.setItem('lj_finances', JSON.stringify(data.finances));
      }
      if (Array.isArray(data.tools)) {
        localStorage.setItem('lj_tools', JSON.stringify(data.tools));
      }
      return true;
    } catch (e) {
      console.error('Failed to import backup', e);
      return false;
    }
  },

  clearAllData: () => {
    localStorage.removeItem('lj_notes');
    localStorage.removeItem('lj_diaries');
    localStorage.removeItem('lj_finances');
    localStorage.removeItem('lj_tools');
  },
};
