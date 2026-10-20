import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Package } from 'lucide-react';
import { useSession } from '../../entities/session';
import {
  useReservation,
  StatusBadge,
  formatDate,
} from '../../entities/reservation';
import { CancelReservation } from '../../features/cancel-reservation';
import { IssueReservation } from '../../features/issue-reservation';
import { PageHeading, StatePanel } from '../../shared/ui';
import styles from './details.module.css';

export function ReservationDetailsPage() {
  const { id } = useParams();
  const value = Number(id);
  const valid =
    !!id &&
    /^[1-9][0-9]*$/.test(id) &&
    Number.isInteger(value) &&
    value <= 2147483647;
  const query = useReservation(valid ? value : 0);
  const { data: user } = useSession();
  const back = user?.role === 'WORKER' ? '/warehouse' : '/reservations';
  if (!valid)
    return (
      <StatePanel error title="Некоректний номер бронювання">
        Перевірте адресу сторінки.
      </StatePanel>
    );
  if (query.isPending)
    return <StatePanel loading title="Завантаження бронювання…" />;
  if (query.isError)
    return (
      <>
        <Link className="back" to={back}>
          <ArrowLeft size={16} />
          До списку
        </Link>
        <StatePanel
          error
          title="Не вдалося відкрити бронювання"
          retry={() => void query.refetch()}
        >
          {query.error.message}
        </StatePanel>
      </>
    );
  const item = query.data;
  return (
    <>
      <Link className="back" to={back}>
        <ArrowLeft size={16} />
        До списку бронювань
      </Link>
      <PageHeading title={'Бронювання №' + String(item.id).padStart(4, '0')} />
      <article className={styles.ticket}>
        <div className={styles.main}>
          <div className={styles.top}>
            <Package size={36} />
            <StatusBadge status={item.status} />
          </div>
          <p className="eyebrow">{item.product.articleCode}</p>
          <h2>{item.product.name}</h2>
          <div className={styles.quantity}>
            <strong>{item.quantity}</strong>
            <span>одиниць товару</span>
          </div>
          <dl className={styles.meta}>
            <div>
              <dt>Створено</dt>
              <dd>{formatDate(item.createdAt)}</dd>
            </div>
            <div>
              <dt>Користувач</dt>
              <dd>№{item.userId}</dd>
            </div>
            {item.closedAt && (
              <div>
                <dt>{item.status === 'ISSUED' ? 'Видано' : 'Скасовано'}</dt>
                <dd>{formatDate(item.closedAt)}</dd>
              </div>
            )}
            {item.issuedById && (
              <div>
                <dt>Працівник</dt>
                <dd>№{item.issuedById}</dd>
              </div>
            )}
          </dl>
        </div>
        <aside className={styles.side}>
          {item.status === 'ACTIVE' && user?.role === 'USER' && (
            <p>Для отримання товару назвіть працівнику номер бронювання.</p>
          )}
          {item.status === 'ACTIVE' &&
            (user?.role === 'WORKER' ? (
              <IssueReservation reservation={item} />
            ) : (
              <CancelReservation reservation={item} />
            ))}
          <Link to="/catalog">Повернутися до каталогу ↗</Link>
        </aside>
      </article>
    </>
  );
}
