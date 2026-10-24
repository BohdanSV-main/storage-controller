export const MAX_INT32 = 2_147_483_647;

export function isPositiveInt32(value: number): boolean {
  return Number.isInteger(value) && value > 0 && value <= MAX_INT32;
}
