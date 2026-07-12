/**
 * ISO currency code → display symbol. Steam's Turkey region has priced games
 * in USD since 2024, so the default when the code is unknown is '$'.
 */
export function currencySymbol(code?: string | null): string {
  switch (code) {
    case 'TRY':
      return '₺';
    case 'EUR':
      return '€';
    case 'GBP':
      return '£';
    case 'USD':
    case undefined:
    case null:
      return '$';
    default:
      return code + ' ';
  }
}
