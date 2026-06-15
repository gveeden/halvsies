export const currencySymbols: Record<string, string> = {
  USD: "$",
  EUR: "€",
  GBP: "£",
};

export function getCurrencySymbol(currencyCode: string | undefined): string {
  if (!currencyCode) return "$";
  return currencySymbols[currencyCode] || "$";
}
