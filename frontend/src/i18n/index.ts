import { I18n } from 'i18n-js';
import { getLocales } from 'expo-localization';
import sv from './translations/sv';
import en from './translations/en';

const i18n = new I18n({
  sv,
  en,
});

// Set default locale based on device settings
const locales = getLocales();
const deviceLocale = locales?.[0]?.languageCode || 'sv';
i18n.locale = deviceLocale.startsWith('sv') ? 'sv' : 'en';
i18n.enableFallback = true;
i18n.defaultLocale = 'sv';

export default i18n;

// Helper function to format currency based on locale
export const formatCurrency = (amount: number, locale?: string): string => {
  const currentLocale = locale || i18n.locale;
  const currency = currentLocale.startsWith('sv') ? 'SEK' : 'USD';
  
  return new Intl.NumberFormat(currentLocale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

// Helper function to format date based on locale
export const formatDate = (date: Date, format: 'short' | 'long' | 'full' = 'long'): string => {
  const options: Intl.DateTimeFormatOptions = 
    format === 'short' ? { day: 'numeric', month: 'short' } :
    format === 'long' ? { weekday: 'long', day: 'numeric', month: 'long' } :
    { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' };
  
  return new Intl.DateTimeFormat(i18n.locale, options).format(date);
};

// Helper to change language
export const setLanguage = (lang: 'sv' | 'en') => {
  i18n.locale = lang;
};

export const getLanguage = (): 'sv' | 'en' => {
  return i18n.locale.startsWith('sv') ? 'sv' : 'en';
};
