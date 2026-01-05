// API exports - Re-exporting from modular services
export * from './services/core';
export * from './services/auth';
export * from './services/schools';
export * from './services/students';
export * from './services/teachers';
export * from './services/parents';
export * from './services/classes';
export * from './services/finance';
export * from './services/reports';
export * from './services/backup';
export * from './services/settings';
export * from './services/transportation';

// Legacy compatibility for any types that were inline (none found, all were imported from types.ts)
// All original functionality is now distributed across services.
