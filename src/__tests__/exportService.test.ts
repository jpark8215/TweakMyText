import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ExportService, createExportService } from '../services/exportService';
import { User } from '../types';

// Mock global objects
global.URL.createObjectURL = vi.fn();
global.URL.revokeObjectURL = vi.fn();

// Mock document.createElement
document.createElement = vi.fn().mockImplementation((tag) => {
  if (tag === 'a') {
    return {
      href: '',
      download: '',
      click: vi.fn()
    };
  }
  return {};
});

describe('ExportService', () => {
  let mockUpdateExports: any;
  let exportService: ExportService;
  
  // Sample test data
  const freeUser: User = {
    id: 'free-user',
    email: 'free@example.com',
    subscription_tier: 'free',
    tokens_remaining: 100000,
    daily_tokens_used: 0,
    monthly_tokens_used: 0,
    monthly_exports_used: 3, // 3 of 5 used
    last_token_reset: '2025-01-01',
    monthly_reset_date: 1,
    created_at: new Date()
  };

  const proUser: User = {
    ...freeUser,
    id: 'pro-user',
    email: 'pro@example.com',
    subscription_tier: 'pro',
    tokens_remaining: 5000000,
    monthly_exports_used: 150 // 150 of 200 used
  };

  const premiumUser: User = {
    ...freeUser,
    id: 'premium-user',
    email: 'premium@example.com',
    subscription_tier: 'premium',
    tokens_remaining: 10000000,
    monthly_exports_used: 500 // Unlimited exports
  };

  const testData = { test: 'data' };
  const testFilename = 'test-export.json';

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();
    
    // Create mock updateExports function
    mockUpdateExports = vi.fn().mockImplementation((count) => {
      return Promise.resolve({ error: null });
    });
    
    // Create export service instance
    exportService = createExportService(mockUpdateExports);
  });

  it('should create a valid export service instance', () => {
    expect(exportService).toBeDefined();
    expect(typeof exportService.exportData).toBe('function');
  });

  it('should successfully export data for free users with available exports', async () => {
    await exportService.exportData(testData, testFilename, freeUser);
    
    // Should create a file
    expect(global.URL.createObjectURL).toHaveBeenCalled();
    expect(document.createElement).toHaveBeenCalledWith('a');
    
    // Should update export count
    expect(mockUpdateExports).toHaveBeenCalledWith(1);
  });

  it('should throw error for free users who exceeded export limit', async () => {
    const limitedUser = { ...freeUser, monthly_exports_used: 5 }; // Limit reached
    
    await expect(exportService.exportData(testData, testFilename, limitedUser))
      .rejects
      .toThrow('Monthly export limit reached (5 exports)');
    
    // Should not create a file or update count
    expect(global.URL.createObjectURL).not.toHaveBeenCalled();
    expect(mockUpdateExports).not.toHaveBeenCalled();
  });

  it('should successfully export data for pro users with available exports', async () => {
    await exportService.exportData(testData, testFilename, proUser);
    
    // Should create a file
    expect(global.URL.createObjectURL).toHaveBeenCalled();
    expect(document.createElement).toHaveBeenCalledWith('a');
    
    // Should update export count
    expect(mockUpdateExports).toHaveBeenCalledWith(1);
  });

  it('should throw error for pro users who exceeded export limit', async () => {
    const limitedUser = { ...proUser, monthly_exports_used: 200 }; // Limit reached
    
    await expect(exportService.exportData(testData, testFilename, limitedUser))
      .rejects
      .toThrow('Monthly export limit reached (200 exports)');
    
    // Should not create a file or update count
    expect(global.URL.createObjectURL).not.toHaveBeenCalled();
    expect(mockUpdateExports).not.toHaveBeenCalled();
  });

  it('should successfully export data for premium users without limit', async () => {
    await exportService.exportData(testData, testFilename, premiumUser);
    
    // Should create a file
    expect(global.URL.createObjectURL).toHaveBeenCalled();
    expect(document.createElement).toHaveBeenCalledWith('a');
    
    // Should update export count (for tracking purposes)
    expect(mockUpdateExports).toHaveBeenCalledWith(1);
  });

  it('should handle export errors gracefully', async () => {
    // Mock URL.createObjectURL to throw an error
    global.URL.createObjectURL = vi.fn().mockImplementation(() => {
      throw new Error('File creation failed');
    });
    
    await expect(exportService.exportData(testData, testFilename, freeUser))
      .rejects
      .toThrow('Failed to create export file');
    
    // Should not update export count
    expect(mockUpdateExports).not.toHaveBeenCalled();
  });
});