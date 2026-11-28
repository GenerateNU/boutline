export const MIN_FENCERS_PER_POOL = 4;
export const MAX_FENCERS_PER_POOL = 10;

export function isValidPool(number: number, fencerCount: number, maxFencers: number) {
  return Number.isInteger(number) && number >= 1 && fencerCount >= MIN_FENCERS_PER_POOL && fencerCount <= maxFencers;
}
