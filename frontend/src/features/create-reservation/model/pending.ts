interface PendingReservation {
  key: string;
  productId: number;
  quantity: number;
}
const storageKey = (userId: number, productId: number) =>
  `komora:reservation:${userId}:${productId}`;

export const pendingReservation = {
  read(userId: number, productId: number): PendingReservation | null {
    try {
      const raw = sessionStorage.getItem(storageKey(userId, productId));
      if (!raw) return null;
      const value = JSON.parse(raw) as PendingReservation;
      return typeof value.key === 'string' &&
        value.productId === productId &&
        Number.isInteger(value.quantity) &&
        value.quantity > 0 &&
        value.quantity <= 2147483647
        ? value
        : null;
    } catch {
      return null;
    }
  },
  begin(
    userId: number,
    productId: number,
    quantity: number,
  ): PendingReservation {
    const existing = this.read(userId, productId);
    if (existing) return existing;
    const next = { key: crypto.randomUUID(), productId, quantity };
    sessionStorage.setItem(storageKey(userId, productId), JSON.stringify(next));
    return next;
  },
  clear(userId: number, productId: number) {
    sessionStorage.removeItem(storageKey(userId, productId));
  },
};
