export type CurrencyOption = {
  code: string;
  name: string;
  symbol: string;
};

export const SUPPORTED_CURRENCIES: CurrencyOption[] = [
  { code: 'NZD', name: 'New Zealand Dollar', symbol: 'NZ$' },
  { code: 'AUD', name: 'Australian Dollar', symbol: 'A$' },
  { code: 'USD', name: 'US Dollar', symbol: 'US$' },
  { code: 'SGD', name: 'Singapore Dollar', symbol: 'S$' },
  { code: 'GBP', name: 'British Pound', symbol: '£' },
  { code: 'EUR', name: 'Euro', symbol: '€' },
  { code: 'CAD', name: 'Canadian Dollar', symbol: 'C$' },
  { code: 'LKR', name: 'Sri Lankan Rupee', symbol: 'Rs' },
  { code: 'INR', name: 'Indian Rupee', symbol: '₹' },
  { code: 'MYR', name: 'Malaysian Ringgit', symbol: 'RM' },
  { code: 'AED', name: 'UAE Dirham', symbol: 'د.إ' },
  { code: 'JPY', name: 'Japanese Yen', symbol: '¥' },
  { code: 'CHF', name: 'Swiss Franc', symbol: 'CHF' },
  { code: 'ZAR', name: 'South African Rand', symbol: 'R' },
];

export function currencyLabel(code: string) {
  const found = SUPPORTED_CURRENCIES.find((c) => c.code === code);
  return found ? `${found.code} — ${found.name}` : code;
}
