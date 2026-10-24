import { useState } from 'react';
import { useSession } from '../../entities/session';
import { useReservations } from '../../entities/reservation';
import { ReservationList } from '../../widgets/reservation-list';
import { PageHeading, StatePanel } from '../../shared/ui';

export function WarehousePage() {
  const { data: user } = useSession();
  const query = useReservations(user!.id);
  const [search, setSearch] = useState('');
  const needle = search.trim().toLowerCase();
  const all = query.data ?? [];
  const visible = all.filter((item) =>
    (
      item.product.name +
      ' ' +
      item.product.articleCode +
      ' ' +
      item.id +
      ' ' +
      item.userId
    )
      .toLowerCase()
      .includes(needle),
  );
  return (
    <>
      <PageHeading title="Видача товарів" />
      <div className="toolbar">
        <input
          className="input search"
          aria-label="Пошук бронювань"
          placeholder="Товар, номер бронювання чи користувача…"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        <span className="eyebrow">{all.length} АКТИВНИХ</span>
        <button
          className="button quiet small"
          disabled={query.isFetching}
          onClick={() => void query.refetch()}
        >
          Оновити
        </button>
      </div>
      {query.isPending ? (
        <StatePanel loading title="Завантаження бронювань…" />
      ) : query.isError ? (
        <StatePanel
          error
          title="Черга недоступна"
          retry={() => void query.refetch()}
        >
          {query.error.message}
        </StatePanel>
      ) : visible.length ? (
        <ReservationList reservations={visible} user={user!} />
      ) : (
        <StatePanel
          title={search ? 'Нічого не знайдено' : 'Немає активних бронювань'}
        >
          {search
            ? 'Спробуйте інший пошуковий запит.'
            : 'Нові активні бронювання з’являться тут.'}
        </StatePanel>
      )}
    </>
  );
}
