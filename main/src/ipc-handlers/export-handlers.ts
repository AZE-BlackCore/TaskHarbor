import { ipcMain } from 'electron';
import { exportToMarkdown, ExportOptions } from '../services/exportService';

export function setupExportHandlers() {
  ipcMain.handle('export:toMarkdown', async (_event, options?: ExportOptions) => {
    try {
      const result = await exportToMarkdown(options);
      return result;
    } catch (error) {
      console.error('Error exporting to Markdown:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  });
}