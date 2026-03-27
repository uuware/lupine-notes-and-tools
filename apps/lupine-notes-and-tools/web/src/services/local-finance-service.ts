export interface FinanceItemProps {
  amount: string;
  remark: string;
}

export interface LocalFinanceProps {
  id: number;
  title: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  color: string; // hex
  items: FinanceItemProps[]; // At least 3 initially
  remark: string; // height 100
  updatedAt: number;
  orderIndex?: number;
}

import { StorageManager } from './cloud/storage-manager';

class LocalFinanceServiceCls {
  getAllRecords(): Partial<LocalFinanceProps>[] {
    try {
      let recordsList = [...StorageManager.getCategoryList('financesList')];
        recordsList.sort((a, b) => {
          if (a.orderIndex !== undefined && b.orderIndex !== undefined) {
            return a.orderIndex - b.orderIndex;
          }
          return b.updatedAt! - a.updatedAt!;
        });
        return recordsList;
    } catch (e) {
      console.error('Failed to parse local finances list', e);
    }
    return [];
  }

  async saveRecord(record: Partial<LocalFinanceProps> & { id?: number }): Promise<LocalFinanceProps> {
    const list = this.getAllRecords();
    const now = Date.now();
    let existingIndex = -1;

    if (record.id) {
      existingIndex = list.findIndex((r) => r.id === record.id);
    }

    let finalRecord: LocalFinanceProps;

    if (existingIndex >= 0) {
      const existingMeta = list[existingIndex];
      // Since existing is only metadata in the list, we MUST merge the new record with the lazy loaded full body
      const existingFull = await this.getRecordById(existingMeta.id!) || existingMeta; 
      finalRecord = { ...existingFull, ...record, updatedAt: now } as LocalFinanceProps;
    } else {
      finalRecord = {
        id: record.id || now,
        title: record.title || '',
        date: record.date || '',
        time: record.time || '',
        color: record.color || '#4080ff',
        items: record.items || [],
        remark: record.remark || '',
        updatedAt: now,
        orderIndex: record.orderIndex || now,
      };
    }

    const listMetadata: Partial<LocalFinanceProps> = {
       id: finalRecord.id,
       title: finalRecord.title,
       date: finalRecord.date,
       time: finalRecord.time,
       color: finalRecord.color,
       updatedAt: finalRecord.updatedAt,
       orderIndex: finalRecord.orderIndex,
       items: finalRecord.items
    };

    await StorageManager.saveItem('finances', 'financesList', finalRecord, listMetadata);
    return finalRecord;
  }

  async deleteRecord(id: number) {
    let list = this.getAllRecords();
    const len = list.length;
    list = list.filter((r) => r.id !== id);
    
    if (list.length !== len) {
       StorageManager.getCategoryList('financesList').splice(0, len, ...list); 
       await StorageManager.getActiveProvider().writeCategoryList('finances', list);
       await StorageManager.getActiveProvider().deleteItem('finances', id.toString());
    }
  }

  async getRecordById(id: number): Promise<LocalFinanceProps | undefined> {
    return await StorageManager.readItem('finances', id.toString());
  }

  async updateRecordOrders(orderedIds: number[]) {
    const list = this.getAllRecords();
    orderedIds.forEach((id, index) => {
      const recordMeta = list.find((r) => r.id === id);
      if (recordMeta) {
        recordMeta.orderIndex = index;
      }
    });
    
    await StorageManager.getActiveProvider().writeCategoryList('finances', list);
  }
}

export const LocalFinanceService = new LocalFinanceServiceCls();
