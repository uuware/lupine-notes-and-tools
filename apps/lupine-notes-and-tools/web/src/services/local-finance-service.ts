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

class LocalFinanceServiceCls {
  private readonly STORAGE_KEY = 'lj_finances';

  getAllRecords(): LocalFinanceProps[] {
    try {
      const dataStr = localStorage.getItem(this.STORAGE_KEY);
      if (dataStr) {
        let records: LocalFinanceProps[] = JSON.parse(dataStr);
        records.sort((a, b) => {
          if (a.orderIndex !== undefined && b.orderIndex !== undefined) {
            return a.orderIndex - b.orderIndex;
          }
          return b.updatedAt - a.updatedAt;
        });
        return records;
      }
    } catch (e) {
      console.error('Failed to parse local finances', e);
    }
    return [];
  }

  saveRecord(record: Partial<LocalFinanceProps> & { id?: number }): LocalFinanceProps {
    const records = this.getAllRecords();
    const now = Date.now();
    let existingIndex = -1;

    if (record.id) {
      existingIndex = records.findIndex((r) => r.id === record.id);
    }

    if (existingIndex >= 0) {
      const existing = records[existingIndex];
      const updated = { ...existing, ...record, updatedAt: now };
      records[existingIndex] = updated as LocalFinanceProps;
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(records));
      return updated;
    } else {
      const newRecord: LocalFinanceProps = {
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
      records.unshift(newRecord);
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(records));
      return newRecord;
    }
  }

  deleteRecord(id: number) {
    const records = this.getAllRecords();
    const filtered = records.filter((r) => r.id !== id);
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(filtered));
  }

  getRecordById(id: number): LocalFinanceProps | undefined {
    return this.getAllRecords().find((r) => r.id === id);
  }

  updateRecordOrders(orderedIds: number[]) {
    const records = this.getAllRecords();
    orderedIds.forEach((id, index) => {
      const record = records.find((r) => r.id === id);
      if (record) {
        record.orderIndex = index;
      }
    });
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(records));
  }
}

export const LocalFinanceService = new LocalFinanceServiceCls();
