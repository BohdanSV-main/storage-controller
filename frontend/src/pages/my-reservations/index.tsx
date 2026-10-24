import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { useSession } from '../../entities/session';
import {
  useReservations,
  statusLabels,
  type ReservationStatus,
} from '../../entities/reservation';
import { ReservationList } from '../../widgets/reservation-list';
import { PageHeading, StatePanel } from '../../shared/ui';

export function MyReservationsPage() {
  const { data: user } = useSession();
  const query = useReservations(user!.id);
  const [filter, setFilter] = useState<ReservationStatus | 'ALL'>('ALL');
  const all = query.data ?? [];
  const visible = all.filter(
    (item) => filter === 'ALL' || item.status === filter,
  );
  return (
    <>
      <PageHeading title="Мої бронювання">
        <Link className="button primary" to="/catalog">
          <Plus size={18} />
          До каталогу
        </Link>
      </PageHeading>
      <div className="toolbar">
        <div className="tabs" aria-label="Фільтр статусу">
          {(['ALL', 'ACTIVE', 'ISSUED', 'CANCELLED'] as const).map((status) => (
            <button
              className="tab"
              aria-pressed={filter === status}
              key={status}
              onClick={() => setFilter(status)}
            >
              {status === 'ALL' ? 'Усі' : statusLabels[status]} ·{' '}
              {
                all.filter((item) => status === 'ALL' || item.status === status)
                  .length
              }
            </button>
          ))}
        </div>
        <button
          className="button quiet small"
          onClick={() => void query.refetch()}
          disabled={query.isFetching}
        >
          Оновити
        </button>
      </div>
      {query.isPending ? (
        <StatePanel loading title="Завантажуємо бронювання…" />
      ) : query.isError ? (
        <StatePanel
          error
          title="Не вдалося завантажити"
          retry={() => void query.refetch()}
        >
          {query.error.message}
        </StatePanel>
      ) : visible.length ? (
        <ReservationList reservations={visible} user={user!} />
      ) : (
        <StatePanel title="Бронювань немає">
          Оберіть інший статус або знайдіть потрібне в каталозі.
        </StatePanel>
      )}
    </>
  );
}
