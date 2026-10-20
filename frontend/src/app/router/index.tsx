import { lazy, Suspense, useEffect } from 'react';
import {
  BrowserRouter,
  Navigate,
  Outlet,
  Route,
  Routes,
  useLocation,
} from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useSession } from '../../entities/session';
import { AppHeader } from '../../widgets/app-header';
import { StatePanel } from '../../shared/ui';

const Login = lazy(() =>
  import('../../pages/login').then((module) => ({ default: module.LoginPage })),
);
const Catalog = lazy(() =>
  import('../../pages/catalog').then((module) => ({
    default: module.CatalogPage,
  })),
);
const Reservations = lazy(() =>
  import('../../pages/my-reservations').then((module) => ({
    default: module.MyReservationsPage,
  })),
);
const Warehouse = lazy(() =>
  import('../../pages/warehouse').then((module) => ({
    default: module.WarehousePage,
  })),
);
const Details = lazy(() =>
  import('../../pages/reservation-details').then((module) => ({
    default: module.ReservationDetailsPage,
  })),
);
const NotFound = lazy(() =>
  import('../../pages/not-found').then((module) => ({
    default: module.NotFoundPage,
  })),
);

function ProtectedLayout() {
  const session = useSession();
  const client = useQueryClient();
  const location = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
    document.title =
      'Комора - ' +
      (location.pathname.startsWith('/catalog')
        ? 'Каталог'
        : location.pathname.startsWith('/warehouse')
          ? 'Видача товарів'
          : 'Бронювання');
  }, [location.pathname]);
  useEffect(() => {
    if (session.data === null) {
      void client
        .cancelQueries({
          predicate: (query) => query.queryKey[0] !== 'session',
        })
        .then(() =>
          client.removeQueries({
            predicate: (query) => query.queryKey[0] !== 'session',
          }),
        );
    }
  }, [session.data, client]);
  if (session.isPending)
    return (
      <main>
        <StatePanel loading title="Завантаження…" />
      </main>
    );
  if (session.isError)
    return (
      <main>
        <StatePanel
          error
          title="З’єднання тимчасово втрачено"
          retry={() => void session.refetch()}
        >
          {session.error.message}
        </StatePanel>
      </main>
    );
  if (!session.data) return <Navigate to="/login" replace />;
  return (
    <>
      <a className="skip" href="#content">
        До вмісту
      </a>
      <AppHeader user={session.data} />
      <main id="content">
        <Outlet />
      </main>
    </>
  );
}

function RolePage({ role }: { role: 'USER' | 'WORKER' }) {
  const { data } = useSession();
  return data?.role === role ? (
    <Outlet />
  ) : (
    <Navigate
      to={data?.role === 'WORKER' ? '/warehouse' : '/reservations'}
      replace
    />
  );
}

export function Router() {
  return (
    <BrowserRouter>
      <Suspense
        fallback={
          <main>
            <StatePanel loading title="Завантажуємо сторінку…" />
          </main>
        }
      >
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route element={<ProtectedLayout />}>
            <Route index element={<Navigate to="/catalog" replace />} />
            <Route path="/catalog" element={<Catalog />} />
            <Route path="/reservations/:id" element={<Details />} />
            <Route element={<RolePage role="USER" />}>
              <Route path="/reservations" element={<Reservations />} />
            </Route>
            <Route element={<RolePage role="WORKER" />}>
              <Route path="/warehouse" element={<Warehouse />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
