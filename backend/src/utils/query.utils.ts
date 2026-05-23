export const str = (val: any): string => String(val ?? '');
export const optStr = (val: any): string | undefined => val ? String(val) : undefined;
export const num = (val: any): number => parseFloat(String(val ?? 0));
export const bool = (val: any): boolean => val === true || val === 'true';
