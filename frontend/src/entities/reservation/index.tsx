import { useQuery } from '@tanstack/react-query';
import { api } from '../../shared/api';
import styles from './reservation.module.css';

export type ReservationStatus = 'ACTIVE' | 'CANCELLED' | 'ISSUED';
export interface Reservation {
  id: number;
  userId: number;
  productId: number;
  quantity: number;
  status: ReservationStatus;
  createdAt: string;
  closedAt: string | null;
  issuedById: number | null;
}
export interface ReservationDetails extends Reservation {
  product: { id: number; name: string; articleCode: string };
}
export const reservationsKey = ['reservations'] as const;
export const reservationKey = (id: number) => ['reservation', id] as const;
export const statusLabels: Record<ReservationStatus, string> = {
  ACTIVE: 'Заброньовано',
  CANCELLED: 'Скасовано',
  ISSUED: 'Видано',
};
export function useReservations(userId: number) {
  return useQuery({
    queryKey: [...reservationsKey, userId],
    queryFn: ({ signal }) =>
      api<ReservationDetails[]>('/reservations', { signal }),
  });
}
export function useReservation(id: number) {
  return useQuery({
    queryKey: reservationKey(id),
    queryFn: ({ signal }) =>
      api<ReservationDetails>('/reservations/' + id, { signal }),
    enabled: Number.isInteger(id) && id > 0 && id <= 2147483647,
  });
}
export function StatusBadge({ status }: { status: ReservationStatus }) {
  return (
    <span className={styles.badge + ' ' + styles[status]}>
      {statusLabels[status]}
    </span>
  );
}
export function formatDate(value: string) {
  return new Intl.DateTimeFormat('uk-UA', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}
