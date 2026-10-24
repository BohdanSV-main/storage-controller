import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Check } from 'lucide-react';
import { api } from '../../shared/api';
import { Dialog, ErrorMessage } from '../../shared/ui';
import { productsKey } from '../../entities/product';
import {
  reservationsKey,
  reservationKey,
  type ReservationDetails,
} from '../../entities/reservation';

export function IssueReservation({
  reservation,
}: {
  reservation: ReservationDetails;
}) {
  const [open, setOpen] = useState(false);
  const client = useQueryClient();
  const issue = useMutation({
    mutationFn: () =>
      api('/reservations/' + reservation.id + '/issue', { method: 'POST' }),
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
      <button className="button teal small" onClick={() => setOpen(true)}>
        <Check size={16} />
        Видати товар
      </button>
      {open && (
        <Dialog
          title="Підтвердити видачу?"
          busy={issue.isPending}
          onClose={() => setOpen(false)}
        >
          <p>
            <strong>{reservation.product.name}</strong> · {reservation.quantity}{' '}
            шт.
          </p>
          <p className="muted">
            Підтвердіть після передачі всієї кількості товару.
          </p>
          <ErrorMessage error={issue.error} />
          <div className="form-actions">
            <button
              className="button quiet"
              disabled={issue.isPending}
              onClick={() => setOpen(false)}
            >
              Назад
            </button>
            <button
              className="button teal"
              disabled={issue.isPending}
              onClick={() => issue.mutate()}
            >
              {issue.isPending ? 'Підтверджуємо…' : 'Підтвердити видачу'}
            </button>
          </div>
        </Dialog>
      )}
    </>
  );
}
