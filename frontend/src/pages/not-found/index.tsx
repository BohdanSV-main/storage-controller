import { Link } from 'react-router-dom';
import { StatePanel } from '../../shared/ui';

export function NotFoundPage() {
  return (
    <>
      <StatePanel title="Сторінку не знайдено">
        Перевірте адресу або поверніться до каталогу.
      </StatePanel>
      <div className="form-actions">
        <Link className="button primary" to="/catalog">
          До каталогу
        </Link>
      </div>
    </>
  );
}
