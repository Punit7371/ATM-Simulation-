import { BillCassetteInventory, DispenseResult, MultiCurrencyVault } from '../types/atm';
import { DispenserPreference } from '../types/profile';
import { CurrencyCode, CURRENCY_CONFIGS, ExchangeRateMap } from '../types/currency';
import { convertToUSD, INITIAL_EXCHANGE_RATES } from './currency';

export const DENOMINATIONS: readonly number[] = [100, 50, 20, 10];

/**
 * Calculates the total nominal cash available in a single currency's vault cassette inventory.
 */
export function calculateVaultTotal(inventory: BillCassetteInventory): number {
  if (!inventory) return 0;
  return Object.entries(inventory).reduce((total, [denom, count]) => {
    return total + Number(denom) * (Number(count) || 0);
  }, 0);
}

/**
 * Calculates the total vault value across all currency cassettes, converting to base USD equivalent.
 */
export function calculateMultiCurrencyVaultTotal(
  vault: MultiCurrencyVault,
  rates: ExchangeRateMap = INITIAL_EXCHANGE_RATES
): {
  currencyTotals: Record<CurrencyCode, number>;
  totalUSD: number;
} {
  const currencyTotals = {} as Record<CurrencyCode, number>;
  let totalUSD = 0;

  for (const [currencyStr, inventory] of Object.entries(vault)) {
    const code = currencyStr as CurrencyCode;
    const totalLocal = calculateVaultTotal(inventory);
    currencyTotals[code] = totalLocal;
    totalUSD += convertToUSD(totalLocal, code, rates);
  }

  return {
    currencyTotals,
    totalUSD: +totalUSD.toFixed(2),
  };
}

/**
 * Multi-Currency Backtracking Change-Maker Algorithm with Customer Preference weighting.
 *
 * Why greedy fails:
 * If a customer requests $60, and the vault has {50: 1, 20: 3, 10: 0}:
 * - Greedy takes 1x $50, leaves $10 remainder. Since there are 0x $10 bills, greedy FAILS.
 * - Backtracking tries 1x $50, sees it cannot complete, backtracks, and tries 0x $50,
 *   then successfully finds 3x $20 = $60!
 *
 * Supports customer preference:
 * - 'optimal' (default): Minimizes total number of bills dispensed.
 * - 'prefer_small': Favors smaller bills for easy pocket change.
 * - 'prefer_large': Strictly minimizes bill volume with larger notes.
 */
export function calculateDispense(
  targetAmount: number,
  inventory: BillCassetteInventory,
  preference: DispenserPreference = 'optimal',
  currency: CurrencyCode = 'USD',
  rates: ExchangeRateMap = INITIAL_EXCHANGE_RATES
): DispenseResult {
  const steps: string[] = [];
  const config = CURRENCY_CONFIGS[currency] || CURRENCY_CONFIGS.USD;
  const symbol = config.symbol;
  const denoms = [...config.denominations].sort((a, b) => b - a); // descending by default
  const step = config.step;

  if (targetAmount <= 0) {
    return {
      success: false,
      amount: targetAmount,
      currency,
      breakdown: {},
      totalBills: 0,
      errorMessage: 'Withdrawal amount must be greater than zero.',
      algorithmSteps: ['Amount is not positive.'],
    };
  }

  if (targetAmount % step !== 0) {
    return {
      success: false,
      amount: targetAmount,
      currency,
      breakdown: {},
      totalBills: 0,
      errorMessage: `Amount must be in multiples of ${symbol}${step.toLocaleString()} (available ${currency} bill denominations: ${denoms
        .map((d) => `${symbol}${d.toLocaleString()}`)
        .join(', ')}).`,
      algorithmSteps: [`${symbol}${targetAmount} is not divisible by ${step}.`],
    };
  }

  const vaultTotal = calculateVaultTotal(inventory);
  if (targetAmount > vaultTotal) {
    return {
      success: false,
      amount: targetAmount,
      currency,
      breakdown: {},
      totalBills: 0,
      errorMessage: `ATM vault does not have sufficient ${currency} cash. Available: ${symbol}${vaultTotal.toLocaleString()}`,
      algorithmSteps: [`Target ${symbol}${targetAmount} exceeds vault balance ${symbol}${vaultTotal}.`],
    };
  }

  const rateData = rates[currency] || INITIAL_EXCHANGE_RATES[currency];
  const baseEquivalentUSD = convertToUSD(targetAmount, currency, rates);

  steps.push(
    `Target: ${symbol}${targetAmount} ${currency} (USD eq: $${baseEquivalentUSD}, Rate: 1 USD = ${rateData.rate} ${currency}, Pref: ${preference}). Vault inventory: ${Object.entries(
      inventory
    )
      .map(([d, c]) => `${symbol}${d}: ${c}`)
      .join(', ')}.`
  );

  // If user prefers smaller bills, explore lower denominations first
  const denomsToUse =
    preference === 'prefer_small'
      ? [...denoms].reverse() // ascending: e.g. [10, 20, 50, 100]
      : denoms; // descending: e.g. [100, 50, 20, 10]

  let bestSolution: { [denom: number]: number } | null = null;
  let bestScore = preference === 'prefer_small' ? -Infinity : Infinity;

  const medianDenom = denoms[Math.floor(denoms.length / 2)];

  function scoreSolution(usage: { [denom: number]: number }): number {
    const totalBills = Object.values(usage).reduce((a, b) => a + b, 0);
    if (preference === 'prefer_small') {
      let smallBills = 0;
      let largeBills = 0;
      for (const [denomStr, count] of Object.entries(usage)) {
        const denom = Number(denomStr);
        if (denom <= medianDenom) {
          smallBills += count;
        } else {
          largeBills += count;
        }
      }
      return smallBills * 2 - largeBills;
    }
    // Optimal / Prefer large: minimize total count of bills
    return totalBills;
  }

  function backtrack(
    remaining: number,
    denomIdx: number,
    currentUsage: { [denom: number]: number }
  ): void {
    if (remaining === 0) {
      const score = scoreSolution(currentUsage);
      if (preference === 'prefer_small') {
        if (score > bestScore) {
          bestScore = score;
          bestSolution = { ...currentUsage };
          steps.push(`Found preferred small-bill combination: ${formatBreakdown(bestSolution, symbol)}`);
        }
      } else {
        if (score < bestScore) {
          bestScore = score;
          bestSolution = { ...currentUsage };
          steps.push(`Found valid combination with ${score} bills: ${formatBreakdown(bestSolution, symbol)}`);
        }
      }
      return;
    }

    if (denomIdx >= denomsToUse.length) {
      return;
    }

    const denom = denomsToUse[denomIdx];
    const available = inventory[denom] || 0;
    const maxPossible = Math.min(Math.floor(remaining / denom), available);

    // If prefer_small and evaluating high denominations, test smaller counts first
    const counts = [];
    if (preference === 'prefer_small' && denom > medianDenom) {
      for (let c = 0; c <= maxPossible; c++) counts.push(c);
    } else {
      for (let c = maxPossible; c >= 0; c--) counts.push(c);
    }

    for (const count of counts) {
      if (count > 0) {
        currentUsage[denom] = count;
      }
      backtrack(remaining - count * denom, denomIdx + 1, currentUsage);
      delete currentUsage[denom];
    }
  }

  backtrack(targetAmount, 0, {});

  if (!bestSolution) {
    steps.push(`Backtracking exhausted all combinations without finding an exact match with available denominations.`);
    return {
      success: false,
      amount: targetAmount,
      currency,
      breakdown: {},
      totalBills: 0,
      errorMessage: `Exact bill combination is not available in the machine vault for this amount in ${currency}. Please try a different amount.`,
      algorithmSteps: steps,
      baseEquivalentUSD,
      exchangeRateApplied: rateData.rate,
    };
  }

  const finalBreakdown = bestSolution as { [denom: number]: number };
  const cleanBreakdown: { [denom: number]: number } = {};
  let totalCount = 0;
  for (const denom of denoms) {
    if (finalBreakdown[denom] && finalBreakdown[denom] > 0) {
      cleanBreakdown[denom] = finalBreakdown[denom];
      totalCount += finalBreakdown[denom];
    }
  }

  return {
    success: true,
    amount: targetAmount,
    currency,
    breakdown: cleanBreakdown,
    totalBills: totalCount,
    algorithmSteps: steps,
    baseEquivalentUSD,
    exchangeRateApplied: rateData.rate,
  };
}

function formatBreakdown(breakdown: { [denom: number]: number }, symbol: string = '$'): string {
  return Object.entries(breakdown)
    .filter(([, count]) => count > 0)
    .map(([denom, count]) => `${count}x ${symbol}${denom}`)
    .join(', ');
}
