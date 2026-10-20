import { useEffect, useId, useRef, type ReactNode } from 'react';
import {
  AlertCircle,
  ArrowUpRight,
  LoaderCircle,
  PackageOpen,
  X,
} from 'lucide-react';
import styles from './ui.module.css';

export function PageHeading({
  title,
  children,
}: {
  title: string;
  children?: ReactNode;
}) {
  return (
    <div className={styles.heading}>
      <div>
        <h1>{title}</h1>
      </div>
      {children}
    </div>
  );
}

export function StatePanel({
  title,
  children,
  loading = false,
  error = false,
  retry,
}: {
  title: string;
  children?: ReactNode;
  loading?: boolean;
  error?: boolean;
  retry?: () => void;
}) {
  const Icon = loading ? LoaderCircle : error ? AlertCircle : PackageOpen;
  return (
    <section
      className={styles.state}
      role={error ? 'alert' : 'status'}
      aria-busy={loading}
    >
      <Icon className={loading ? 'spin' : ''} size={36} aria-hidden="true" />
      <h2>{title}</h2>
      {children && <p>{children}</p>}
      {retry && (
        <button className="button" onClick={retry}>
          Спробувати ще раз <ArrowUpRight size={18} />
        </button>
      )}
    </section>
  );
}

export function ErrorMessage({ error }: { error: unknown }) {
  return error ? (
    <p role="alert" className={styles.error}>
      {error instanceof Error
        ? error.message
        : 'Щось пішло не так. Спробуйте ще раз.'}
    </p>
  ) : null;
}

export function Dialog({
  title,
  onClose,
  busy = false,
  children,
}: {
  title: string;
  onClose: () => void;
  busy?: boolean;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => {
    const dialog = ref.current;
    dialog?.showModal();
    return () => dialog?.close();
  }, []);
  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      className={styles.dialog}
      onCancel={(event) => {
        event.preventDefault();
        if (!busy) onClose();
      }}
    >
      <div className={styles.dialogTitle}>
        <h2 id={titleId}>{title}</h2>
        <button
          className="icon-button"
          aria-label="Закрити"
          disabled={busy}
          onClick={onClose}
        >
          <X size={22} />
        </button>
      </div>
      {children}
    </dialog>
  );
}
