import { NavLink, Link } from 'react-router-dom';
import { Package, UserRound } from 'lucide-react';
import { type User } from '../../entities/session';
import { SignOutButton } from '../../features/sign-out';
import styles from './header.module.css';

export function AppHeader({ user }: { user: User }) {
  return (
    <>
      <header className={styles.header}>
        <Link to="/catalog" className={styles.logo}>
          <Package size={30} strokeWidth={1.8} />
          комора<span>.</span>
        </Link>
        <nav aria-label="Основна навігація" className={styles.nav}>
          <NavLink to="/catalog">Каталог</NavLink>
          <NavLink to={user.role === 'WORKER' ? '/warehouse' : '/reservations'}>
            {user.role === 'WORKER' ? 'Видача товарів' : 'Мої бронювання'}
          </NavLink>
        </nav>
        <div className={styles.account}>
          <UserRound size={18} />
          <div>
            <strong>{user.name}</strong>
            <small>
              {user.role === 'WORKER' ? 'Працівник складу' : 'Користувач'}
            </small>
          </div>
          <SignOutButton />
        </div>
      </header>
    </>
  );
}
