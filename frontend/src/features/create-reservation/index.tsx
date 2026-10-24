import { useState, type FormEvent } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { api, ApiError, jsonBody } from '../../shared/api';
import { Dialog, ErrorMessage } from '../../shared/ui';
import { productsKey, type Product } from '../../entities/product';
import { reservationsKey, type Reservation } from '../../entities/reservation';
import { pendingReservation } from './model/pending';

export function CreateReservation({
  product,
  userId,
}: {
  product: Product;
  userId: number;
}) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(() =>
    pendingReservation.read(userId, product.id),
  );
  const [quantity, setQuantity] = useState(String(pending?.quantity ?? 1));
  const [localError, setLocalError] = useState<Error | null>(null);
  const client = useQueryClient();
  const navigate = useNavigate();
  const create = useMutation({
    mutationFn: async () => {
      const attempt = pendingReservation.begin(
        userId,
        product.id,
        Number(quantity),
      );
      setPending(attempt);
      return api<Reservation>('/reservations', {
        method: 'POST',
        ...jsonBody({
          productId: attempt.productId,
          quantity: attempt.quantity,
        }),
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': attempt.key,
        },
      });
    },
    onSuccess: async (reservation) => {
      pendingReservation.clear(userId, product.id);
      setPending(null);
      await Promise.all([
        client.invalidateQueries({ queryKey: productsKey }),
        client.invalidateQueries({ queryKey: reservationsKey }),
      ]);
      setOpen(false);
      navigate('/reservations/' + reservation.id);
    },
    onError: (error) => {
      if (
        error instanceof ApiError &&
        error.status >= 400 &&
        error.status < 500 &&
        error.status !== 401 &&
        error.status !== 408
      ) {
        pendingReservation.clear(userId, product.id);
        setPending(null);
        void client.invalidateQueries({ queryKey: productsKey });
      }
    },
    retry: false,
  });
  function submit(event: FormEvent) {
    event.preventDefault();
    if (create.isPending) return;
    const value = Number(quantity);
    if (
      !pending &&
      (!Number.isInteger(value) ||
        value < 1 ||
        value > Math.min(product.available, 2147483647))
    ) {
      setLocalError(
        new Error('Вкажіть цілу кількість у межах доступного залишку.'),
      );
      return;
    }
    setLocalError(null);
    create.mutate();
  }
  return (
    <>
      <button
        className="button small"
        disabled={product.available === 0 && !pending}
        onClick={() => setOpen(true)}
      >
        <Plus size={16} />
        {pending
          ? 'Перевірити спробу'
          : product.available === 0
            ? 'Немає в наявності'
            : 'Забронювати'}
      </button>
      {open && (
        <Dialog
          title="Забронювати товар"
          onClose={() => setOpen(false)}
          busy={create.isPending}
        >
          <p>
            <strong>{product.name}</strong>
          </p>
          <p className="muted">
            Артикул {product.articleCode} · доступно {product.available} шт.
          </p>
          {pending && (
            <p className="notice">
              Результат попередньої спроби невідомий. Повторіть її з тією самою
              кількістю.
            </p>
          )}
          <form onSubmit={submit}>
            <label className="field">
              Кількість
              <input
                className="input"
                type="number"
                min="1"
                max={
                  pending ? undefined : Math.min(product.available, 2147483647)
                }
                step="1"
                required
                value={quantity}
                onChange={(event) => setQuantity(event.target.value)}
                disabled={create.isPending || !!pending}
              />
            </label>
            <ErrorMessage error={localError ?? create.error} />
            <div className="form-actions">
              <button
                className="button quiet"
                type="button"
                disabled={create.isPending}
                onClick={() => setOpen(false)}
              >
                Закрити
              </button>
              <button className="button primary" disabled={create.isPending}>
                {create.isPending
                  ? 'Надсилаємо…'
                  : pending
                    ? 'Повторити спробу'
                    : 'Підтвердити бронювання'}
              </button>
            </div>
          </form>
        </Dialog>
      )}
    </>
  );
}
