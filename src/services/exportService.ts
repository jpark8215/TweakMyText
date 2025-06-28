import { User } from '../types';
import { getSubscriptionLimits } from '../utils/subscriptionValidator';
import { secureLog } from '../utils/errorHandler';

// Centralized export service to eliminate code duplication
export class ExportService {
  private updateExports: (count: number) => Promise<{ error: Error | null }>;
  
  constructor(updateExportsFunction: (count: number) => Promise<{ error: Error | null }>) {
    this.updateExports = updateExportsFunction;
  }
  
  async exportData(data: any, filename: string, user: User): Promise<void> {
    secureLog('Export attempt:', {
      userTier: user.subscription_tier,
      currentExports: user.monthly_exports_used,
      filename: filename.replace(/[^a-zA-Z0-9.-]/g, '[SANITIZED]')
    });
    
    // Validate export limits
    await this.validateExportLimits(user);
    
    // Create and download file
    await this.createAndDownloadFile(data, filename);
    
    // Update export count
    const { error } = await this.updateExports(1);
    if (error) {
      secureLog('Export count update failed:', { error: error.message });
      throw error;
    }
    
    secureLog('Export completed successfully');
  }
  
  private async validateExportLimits(user: User): Promise<void> {
    const limits = getSubscriptionLimits(user);
    
    if (limits.exportLimit === -1) {
      // Unlimited exports for Premium
      return;
    }
    
    const currentExports = user.monthly_exports_used || 0;
    if (currentExports >= limits.exportLimit) {
      throw new Error(`Monthly export limit reached (${limits.exportLimit} exports)`);
    }
  }
  
  private async createAndDownloadFile(data: any, filename: string): Promise<void> {
    try {
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      secureLog('File creation failed:', { error });
      throw new Error('Failed to create export file');
    }
  }
}

// Factory function to create export service instance
export const createExportService = (updateExportsFunction: (count: number) => Promise<{ error: Error | null }>) => {
  return new ExportService(updateExportsFunction);
};