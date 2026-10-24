import { useState } from 'react';
import { Package, Search, Boxes } from 'lucide-react';
import { useProducts } from '../../entities/product';
import { useSession } from '../../entities/session';
import { CreateReservation } from '../../features/create-reservation';
import { PageHeading, StatePanel } from '../../shared/ui';
import styles from './catalog.module.css';

export function CatalogPage() {
  const { data: user } = useSession();
  const products = useProducts();
  const [search, setSearch] = useState('');
  const [availableOnly, setAvailableOnly] = useState(false);
  const all = products.data ?? [];
  const needle = search.trim().toLocaleLowerCase('uk');
  const visible = all.filter(
    (product) =>
      (!availableOnly || product.available > 0) &&
      (product.name + ' ' + product.articleCode)
        .toLocaleLowerCase('uk')
        .includes(needle),
  );
  return (
    <>
      <PageHeading title="Каталог товарів">
        <div className={styles.count}>
          <Boxes size={25} />
          <strong>{all.length}</strong>
          <span>позицій у каталозі</span>
        </div>
      </PageHeading>
      <div className="toolbar">
        <label className={'search ' + styles.search}>
          <Search size={18} />
          <input
            className="input"
            aria-label="Пошук товарів"
            placeholder="Назва або артикул…"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </label>
        <label className="check">
          <input
            type="checkbox"
            checked={availableOnly}
            onChange={(event) => setAvailableOnly(event.target.checked)}
          />
          Лише в наявності
        </label>
        <button
          className="button quiet small"
          onClick={() => void products.refetch()}
          disabled={products.isFetching}
        >
          Оновити
        </button>
      </div>
      {products.isPending ? (
        <StatePanel loading title="Завантаження товарів…" />
      ) : products.isError ? (
        <StatePanel
          error
          title="Каталог недоступний"
          retry={() => void products.refetch()}
        >
          {products.error.message}
        </StatePanel>
      ) : visible.length === 0 ? (
        <StatePanel
          title={all.length ? 'Нічого не знайдено' : 'Каталог порожній'}
        >
          {all.length
            ? 'Спробуйте іншу назву або вимкніть фільтр наявності.'
            : 'Товари з’являться тут після поповнення каталогу.'}
        </StatePanel>
      ) : (
        <div className="grid">
          {visible.map((product, index) => (
            <article className={styles.card} key={product.id}>
              <div className={styles.cardTop}>
                <span className="eyebrow">{product.articleCode}</span>
                <span
                  className={
                    styles.stock + (product.available ? '' : ' ' + styles.empty)
                  }
                >
                  {product.available ? 'Є в наявності' : 'Немає на складі'}
                </span>
              </div>
              <div className={styles.illustration} data-tone={index % 3}>
                <Package size={60} strokeWidth={1} />
              </div>
              <h2>{product.name}</h2>
              <p className={styles.description}>{product.desc}</p>
              <div className={styles.cardBottom}>
                <div>
                  <strong>{product.available}</strong>
                  <small>шт. доступно</small>
                </div>
                {user?.role === 'USER' && (
                  <CreateReservation product={product} userId={user.id} />
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </>
  );
}
