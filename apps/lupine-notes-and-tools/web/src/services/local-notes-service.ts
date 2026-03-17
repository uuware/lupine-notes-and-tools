export interface LocalNoteProps {
  id: number;
  title: string;
  content: string; // HTML string
  updatedAt: number;
  images?: string[]; // Optional base64 strings
  color?: string; // Optional color tag
  orderIndex?: number;
}

import { StorageManager } from './cloud/storage-manager';

export const LocalNotesService = {
  // Returns only the metadata list (synchronous from RAM Cache)
  getAllNotes: (): Partial<LocalNoteProps>[] => {
    try {
      const notesList = [...StorageManager.getCategoryList('notesList')];
      return notesList.sort((a, b) => {
        const orderA = a.orderIndex !== undefined ? a.orderIndex : a.id;
        const orderB = b.orderIndex !== undefined ? b.orderIndex : b.id;
        return orderB - orderA;
      });
    } catch (e) {
      console.error('Failed to load notes list', e);
      return [];
    }
  },

  // Now an ASYNC function that lazily fetches the actual file body
  getNoteById: async (id: number): Promise<LocalNoteProps | undefined> => {
      return await StorageManager.readItem('notes', id.toString());
  },

  // Saves the item and automatically manages the list.json update
  saveNote: async (note: LocalNoteProps): Promise<LocalNoteProps> => {
    const list = LocalNotesService.getAllNotes();
    note.updatedAt = Date.now();

    if (note.id <= 0) {
      note.id = Date.now();
      const maxOrder = list.length > 0 ? Math.max(...list.map((n) => n.orderIndex ?? n.id!)) : Date.now();
      note.orderIndex = maxOrder + 1;
    }

    // Extract just what's needed for the List view
    const listMetadata: Partial<LocalNoteProps> = {
      id: note.id,
      title: note.title || '',
      updatedAt: note.updatedAt,
      color: note.color,
      orderIndex: note.orderIndex,
    };

    // We save the full `note` item to its own file, and `listMetadata` to the `list.json`
    await StorageManager.saveItem('notes', 'notesList', note, listMetadata);
    return note;
  },

  updateNoteOrders: async (orderedIds: number[]): Promise<boolean> => {
    const list = LocalNotesService.getAllNotes();
    let updated = false;
    const len = orderedIds.length;
    
    // We only update the list metadata for order indexes since order only matters in the list
    orderedIds.forEach((id, idx) => {
      const noteMeta = list.find((n) => n.id === id);
      if (noteMeta) {
        noteMeta.orderIndex = len - idx;
        updated = true;
      }
    });

    if (updated) {
       // Since we didn't update a specific item, we manually trigger a list save.
       // A cleaner approach long term is to just let `StorageManager` write the list
       await StorageManager.getActiveProvider().writeCategoryList('notes', list);
    }
    return updated;
  },

  deleteNote: async (id: number): Promise<boolean> => {
    let list = LocalNotesService.getAllNotes();
    const len = list.length;
    list = list.filter((n) => n.id !== id);
    
    if (list.length !== len) {
       // 1. Remove from list cache synchronously to guarantee immediate UI refresh
       StorageManager.getCategoryList('notesList').splice(0, len, ...list); 
       
       // 2. Perform network operations
       await StorageManager.getActiveProvider().writeCategoryList('notes', list);
       await StorageManager.getActiveProvider().deleteItem('notes', id.toString());
       return true;
    }
    return false;
  },
};
