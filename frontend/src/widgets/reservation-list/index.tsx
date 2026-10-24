import { Link } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';
import { type User } from '../../entities/session';
import {
  type ReservationDetails,
  StatusBadge,
  formatDate,
} from '../../entities/reservation';
import { CancelReservation } from '../../features/cancel-reservation';
import { IssueReservation } from '../../features/issue-reservation';
import styles from './list.module.css';

export function ReservationList({
  reservations,
  user,
}: {
  reservations: ReservationDetails[];
  user: User;
}) {
  return (
    <div className={styles.list}>
      {reservations.map((reservation) => (
        <article className={styles.ticket} key={reservation.id}>
          <div className={styles.number}>
            <span className="eyebrow">БРОНЮВАННЯ</span>
            <Link to={'/reservations/' + reservation.id}>
              №{String(reservation.id).padStart(4, '0')}
            </Link>
            <small>{formatDate(reservation.createdAt)}</small>
          </div>
          <div className={styles.product}>
            <span className="eyebrow">{reservation.product.articleCode}</span>
            <h2>
              <Link to={'/reservations/' + reservation.id}>
                {reservation.product.name}
              </Link>
            </h2>
            <p>
              {reservation.quantity} шт.
              {user.role === 'WORKER' && (
                <span> · Користувач №{reservation.userId}</span>
              )}
            </p>
          </div>
          <div className={styles.actions}>
            <StatusBadge status={reservation.status} />
            <div className={styles.buttons}>
              {reservation.status === 'ACTIVE' &&
                (user.role === 'WORKER' ? (
                  <IssueReservation reservation={reservation} />
                ) : (
                  <CancelReservation reservation={reservation} />
                ))}
              <Link
                className="icon-button"
                aria-label={'Деталі бронювання ' + reservation.id}
                to={'/reservations/' + reservation.id}
              >
                <ArrowUpRight size={20} />
              </Link>
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}
