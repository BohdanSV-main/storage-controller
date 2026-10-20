import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../shared/api';
import { Dialog, ErrorMessage } from '../../shared/ui';
import { productsKey } from '../../entities/product';
import {
  reservationsKey,
  reservationKey,
  type ReservationDetails,
} from '../../entities/reservation';

export function CancelReservation({
  reservation,
}: {
  reservation: ReservationDetails;
}) {
  const [open, setOpen] = useState(false);
  const client = useQueryClient();
  const cancel = useMutation({
    mutationFn: () =>
      api('/reservations/' + reservation.id + '/cancel', { method: 'POST' }),
    onSuccess: async () => {
      await Promise.all([
        client.invalidateQueries({ queryKey: productsKey }),
        client.invalidateQueries({ queryKey: reservationsKey }),
        client.invalidateQueries({ queryKey: reservationKey(reservation.id) }),
      ]);
      setOpen(false);
    },
    retry: false,
  });
  return (
    <>
      <button className="button quiet small" onClick={() => setOpen(true)}>
        Скасувати
      </button>
      {open && (
        <Dialog
          title="Скасувати бронювання?"
          busy={cancel.isPending}
          onClose={() => setOpen(false)}
        >
          <p>
            {reservation.product.name} · {reservation.quantity} шт.
          </p>
          <p className="muted">
            Товар знову стане доступним для інших користувачів.
          </p>
          <ErrorMessage error={cancel.error} />
          <div className="form-actions">
            <button
              className="button quiet"
              disabled={cancel.isPending}
              onClick={() => setOpen(false)}
            >
              Залишити
            </button>
            <button
              className="button primary"
              disabled={cancel.isPending}
              onClick={() => cancel.mutate()}
            >
              {cancel.isPending ? 'Скасовуємо…' : 'Так, скасувати'}
            </button>
          </div>
        </Dialog>
      )}
    </>
  );
}
