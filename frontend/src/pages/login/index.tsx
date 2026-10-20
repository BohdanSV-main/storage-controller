import { Package } from 'lucide-react';
import { Navigate } from 'react-router-dom';
import { useSession } from '../../entities/session';
import { SignInForm } from '../../features/sign-in';
import { StatePanel } from '../../shared/ui';
import styles from './login.module.css';

export function LoginPage() {
  const session = useSession();
  if (session.isPending)
    return (
      <main>
        <StatePanel title="Перевіряємо сесію…" loading />
      </main>
    );
  if (session.isError)
    return (
      <main>
        <StatePanel
          title="Не вдається з’єднатися"
          error
          retry={() => void session.refetch()}
        >
          Сервіс тимчасово недоступний. Ваш вхід не скасовано.
        </StatePanel>
      </main>
    );
  if (session.data)
    return (
      <Navigate
        to={session.data.role === 'WORKER' ? '/warehouse' : '/catalog'}
        replace
      />
    );
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <span className={styles.logo}>
          <Package size={29} />
          комора<span>.</span>
        </span>
      </header>
      <main className={styles.main}>
        <section className={styles.intro}>
          <h1>
            Менше пошуків.
            <br />
            Більше <span>порядку.</span>
          </h1>
        </section>
        <section className={styles.form}>
          <h2>Вхід</h2>
          <SignInForm />
          <p className={styles.help}>
            Не маєте доступу? Зверніться до відповідального за склад.
          </p>
        </section>
      </main>
    </div>
  );
}
