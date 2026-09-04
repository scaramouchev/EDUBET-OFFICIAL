/** American odds helpers. +140 means 100 staked returns 140 profit; -140 means 140 staked returns 100 profit. */

export function formatOdds(odds: number) {
  return odds > 0 ? `+${odds}` : `${odds}`;
}

/** Profit (not including the returned stake) for a winning stake at the given American odds. */
export function profitFor(amount: number, odds: number) {
  return Math.round(odds > 0 ? (amount * odds) / 100 : (amount * 100) / Math.abs(odds));
}

/** Total credited back on a win: original stake + profit. */
export function payoutFor(amount: number, odds: number) {
  return amount + profitFor(amount, odds);
}

/** Implied probability (0-100) from American odds — used for the sentiment bar. */
export function impliedPercent(odds: number) {
  const p = odds > 0 ? 100 / (odds + 100) : Math.abs(odds) / (Math.abs(odds) + 100);
  return Math.round(p * 100);
}
