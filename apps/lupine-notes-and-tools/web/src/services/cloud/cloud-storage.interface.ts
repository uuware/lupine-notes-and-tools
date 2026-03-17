export interface GranularStorageProvider {
  id: string;
  name: string;
  
  /**
   * Returns true if the provider has all necessary configuration 
   * (e.g. Access Tokens are present) to perform read/write.
   */
  isConfigured(): boolean;
  
  // -- App Stats --
  /**
   * Load the global app_stats.json
   */
  readStats(): Promise<any | null>;
  /**
   * Save the global app_stats.json
   */
  writeStats(stats: any): Promise<boolean>;

  // -- Category Lists (Metadata only) --
  /**
   * Load the list.json for a specific category (e.g. 'notes', 'diaries')
   */
  listCategory(category: string): Promise<any[] | null>;
  /**
   * Save the list.json array of metadata for a specific category
   */
  writeCategoryList(category: string, listData: any[]): Promise<boolean>;
  
  // -- Granular Items --
  /**
   * Load a specific item's full JSON file (e.g. /notes/123.json)
   */
  readItem(category: string, id: string): Promise<any | null>;
  /**
   * Save a specific item's full JSON file
   */
  writeItem(category: string, id: string, data: any): Promise<boolean>;
  /**
   * Delete a specific item's JSON file
   */
  deleteItem(category: string, id: string): Promise<boolean>;
}
