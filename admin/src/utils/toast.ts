export const showToast = (message: string, type: 'success' | 'error' | 'info' | 'warning' = 'info') => {
  const fn = (typeof window !== 'undefined' && (window as any).__addToast) ? (window as any).__addToast : null;
  if (fn) fn(message, type);
};