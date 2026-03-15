export type ToolType = 'days_matter' | 'habit' | 'todo' | 'focus';

export type DaysMatterCycle = 'one-off' | 'monthly' | 'yearly';

export interface ToolCategoryDef {
  id: ToolType;
  label: string;
  icon: string;
  color: string;
}

export const TOOL_CATEGORIES: ToolCategoryDef[] = [
  { id: 'days_matter', label: 'Days Matter', icon: 'ma-calendar-star', color: '#ff4d4f' },
  { id: 'habit', label: 'Habit Tracker', icon: 'ma-calendar-check', color: '#52c41a' },
  { id: 'todo', label: 'To-Do', icon: 'ma-format-list-checks', color: '#1890ff' },
  { id: 'focus', label: 'Focus (Timer)', icon: 'ma-timer-outline', color: '#722ed1' },
];

export interface DaysMatterPayload {
  cycle: DaysMatterCycle;
  targetDate: string; // YYYY-MM-DD
}

export interface HabitTrackerPayload {
  checkInDates: string[]; // YYYY-MM-DD
}

export interface TodoPayload {
  description: string;
  isCompleted: boolean;
}

export type FocusAnimation = 'hourglass' | 'candle' | 'incense';

export interface FocusPayload {
  durationMinutes: number;
  animationTheme: FocusAnimation;
  remainingSeconds?: number;
}

export interface ToolItem {
  id: string;
  sortIndex: number;
  type: ToolType;
  title: string;
  color?: string; // tag color

  // Conditional payloads
  daysMatter?: DaysMatterPayload;
  habit?: HabitTrackerPayload;
  todo?: TodoPayload;
  focus?: FocusPayload;
}

export class LocalToolsService {
  private static readonly STORAGE_KEY = 'lj_tools';

  static getItems(): ToolItem[] {
    const raw = localStorage.getItem(this.STORAGE_KEY);
    if (!raw) return [];
    try {
      const items = JSON.parse(raw) as ToolItem[];
      return items.sort((a, b) => a.sortIndex - b.sortIndex);
    } catch {
      return [];
    }
  }

  static saveItems(items: ToolItem[]) {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(items));
  }

  static addItem(item: ToolItem) {
    const items = this.getItems();
    // Prepend by giving it a lower sort index or appending
    const maxIndex = items.length > 0 ? Math.max(...items.map((i) => i.sortIndex)) : 0;
    item.sortIndex = maxIndex + 1;
    items.push(item);
    this.saveItems(items);
  }

  static updateItem(updated: ToolItem) {
    const items = this.getItems();
    const idx = items.findIndex((i) => i.id === updated.id);
    if (idx !== -1) {
      items[idx] = updated;
      this.saveItems(items);
    }
  }

  static deleteItem(id: string) {
    let items = this.getItems();
    items = items.filter((i) => i.id !== id);
    this.saveItems(items);
  }

  static reorderItems(ids: string[]) {
    const items = this.getItems();
    const map = new Map<string, ToolItem>();
    items.forEach((i) => map.set(i.id, i));

    const newItems: ToolItem[] = [];
    ids.forEach((id, index) => {
      const item = map.get(id);
      if (item) {
        item.sortIndex = index;
        newItems.push(item);
        map.delete(id);
      }
    });

    // Add any remaining items that weren't in the ids array
    let nextIndex = ids.length;
    map.forEach((item) => {
      item.sortIndex = nextIndex++;
      newItems.push(item);
    });

    this.saveItems(newItems);
  }

  // Helper APIs for Habit
  static isHabitCheckedInToday(habit?: HabitTrackerPayload): boolean {
    if (!habit || !habit.checkInDates) return false;
    const today = this.getTodayDateString();
    return habit.checkInDates.includes(today);
  }

  static getHabitStreak(habit?: HabitTrackerPayload): number {
    if (!habit || !habit.checkInDates || habit.checkInDates.length === 0) return 0;

    // Convert to set for O(1) lookups
    const dates = new Set(habit.checkInDates);
    let streak = 0;
    let d = new Date();

    // Check if today is present, if not, we check yesterday
    if (!dates.has(this.getDateString(d))) {
      d.setDate(d.getDate() - 1);
      if (!dates.has(this.getDateString(d))) {
        return 0; // neither checked in today or yesterday, streak is broken
      }
    }

    // Work backwards counting consecutive checks
    while (dates.has(this.getDateString(d))) {
      streak++;
      d.setDate(d.getDate() - 1);
    }
    return streak;
  }

  static getNextTargetDate(targetDateStr: string, cycle: DaysMatterCycle): Date | null {
    if (!targetDateStr) return null;
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const parts = targetDateStr.split('-');

    if (cycle === 'yearly' && parts.length >= 2) {
      const month = parseInt(parts[parts.length - 2], 10) - 1;
      const day = parseInt(parts[parts.length - 1], 10);
      let yearOffset = 0;
      while (yearOffset < 100) {
        const tryDate = new Date(today.getFullYear() + yearOffset, month, day);
        if (tryDate.getDate() === day && tryDate.getMonth() === month && tryDate.getTime() >= today.getTime()) {
          return tryDate;
        }
        yearOffset++;
      }
    } else if (cycle === 'monthly') {
      const day = parseInt(parts[parts.length - 1], 10);
      let monthOffset = 0;
      while (monthOffset < 120) {
        const tryDate = new Date(today.getFullYear(), today.getMonth() + monthOffset, day);
        if (tryDate.getDate() === day && tryDate.getTime() >= today.getTime()) {
          return tryDate;
        }
        monthOffset++;
      }
    } else if (parts.length >= 3) {
      // one-off
      const y = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10) - 1;
      const d = parseInt(parts[2], 10);
      return new Date(y, m, d);
    }

    // Fallback if bad format
    return new Date(targetDateStr);
  }

  static calculateDaysToTarget(targetDateStr: string, cycle?: DaysMatterCycle): number {
    const target = this.getNextTargetDate(targetDateStr, cycle || 'one-off');
    if (!target) return 0;

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    return Math.ceil((target.getTime() - today) / (1000 * 60 * 60 * 24));
  }

  static toggleHabitDate(id: string, dateStr: string) {
    const items = this.getItems();
    const idx = items.findIndex((i) => i.id === id);
    if (idx !== -1 && items[idx].type === 'habit') {
      if (!items[idx].habit) items[idx].habit = { checkInDates: [] };
      if (!items[idx].habit!.checkInDates) items[idx].habit!.checkInDates = [];

      const dates = items[idx].habit!.checkInDates;
      const dIdx = dates.indexOf(dateStr);
      if (dIdx !== -1) {
        dates.splice(dIdx, 1);
      } else {
        dates.push(dateStr);
      }
      this.saveItems(items);
    }
  }

  static clearHabitData(id: string) {
    const items = this.getItems();
    const idx = items.findIndex((i) => i.id === id);
    if (idx !== -1 && items[idx].type === 'habit' && items[idx].habit) {
      items[idx].habit!.checkInDates = [];
      this.saveItems(items);
    }
  }

  // Helpers for formatting dates
  static getTodayDateString(): string {
    return this.getDateString(new Date());
  }

  static getYesterdayDateString(): string {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return this.getDateString(d);
  }

  private static getDateString(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }
}
