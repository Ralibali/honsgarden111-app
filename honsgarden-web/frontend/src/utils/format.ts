/**
 * Format utilities for consistent number display
 */

/**
 * Format a number, converting -0 to 0 and handling edge cases
 * @param value The number to format
 * @param decimals Number of decimal places (default: 0)
 * @returns Formatted string
 */
export function formatNumber(value: number, decimals: number = 0): string {
  // Handle -0 case
  if (Object.is(value, -0) || (value === 0 && 1/value === -Infinity)) {
    return '0';
  }
  
  // Round to specified decimals
  const rounded = Number(value.toFixed(decimals));
  
  // Check again after rounding (e.g., -0.001 with 0 decimals becomes -0)
  if (Object.is(rounded, -0) || rounded === 0) {
    return '0';
  }
  
  return rounded.toLocaleString('sv-SE', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  });
}

/**
 * Format currency value in SEK
 * @param value The amount
 * @param showSign Whether to show +/- sign
 * @returns Formatted string like "123 kr" or "+123 kr"
 */
export function formatCurrency(value: number, showSign: boolean = false): string {
  // Handle -0 case
  if (Object.is(value, -0) || (Math.abs(value) < 0.01)) {
    return showSign ? '±0 kr' : '0 kr';
  }
  
  const formatted = Math.abs(value).toLocaleString('sv-SE', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  });
  
  if (showSign) {
    if (value > 0) return `+${formatted} kr`;
    if (value < 0) return `-${formatted} kr`;
    return '±0 kr';
  }
  
  return `${formatted} kr`;
}

/**
 * Format percentage value
 * @param value The percentage (e.g., 0.5 for 50%)
 * @param showSign Whether to show +/- sign
 * @returns Formatted string like "50%" or "+50%"
 */
export function formatPercent(value: number, showSign: boolean = false): string {
  const percent = value * 100;
  
  // Handle -0 case
  if (Object.is(percent, -0) || Math.abs(percent) < 0.1) {
    return showSign ? '±0%' : '0%';
  }
  
  const formatted = Math.abs(percent).toFixed(1);
  
  if (showSign) {
    if (percent > 0) return `+${formatted}%`;
    if (percent < 0) return `-${formatted}%`;
    return '±0%';
  }
  
  return `${formatted}%`;
}

/**
 * Format net value with color class suggestion
 * @param value The net value
 * @returns Object with formatted value and suggested CSS class
 */
export function formatNet(value: number): { value: string; className: string } {
  if (Object.is(value, -0) || Math.abs(value) < 0.01) {
    return { value: '±0 kr', className: 'neutral' };
  }
  
  const formatted = Math.abs(value).toLocaleString('sv-SE', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  });
  
  if (value > 0) {
    return { value: `+${formatted} kr`, className: 'positive' };
  }
  if (value < 0) {
    return { value: `-${formatted} kr`, className: 'negative' };
  }
  
  return { value: '±0 kr', className: 'neutral' };
}
