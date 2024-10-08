import { fetchMockedConversionRates } from "../mocks/conversionRates";

export const convertToCZK = (amount: number, currency: string): number => {
  const conversionRates = fetchMockedConversionRates();
  const rate = conversionRates[currency] || 1; // Default to 1 if currency not found
  return amount * rate;
};
