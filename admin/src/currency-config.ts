export const getCurrencySymbol = (code?: string): string => {
    const c = String(code || '').trim().toUpperCase();
    if (c === 'USD') return '$';
    if (c === 'SAR') return 'ر.س';
    if (c === 'EGP') return 'ج.م';
    if (c === 'YER') return 'ر.ي';
    return c || '$';
};

export const formatCurrency = (amount: number, code?: string): string => {
    const sym = getCurrencySymbol(code);
    const decimals = (String(code || '').toUpperCase() === 'YER') ? 0 : 2;
    const n = Number(amount || 0);
    return `${sym}${n.toFixed(decimals)}`;
};
