import { Providers } from './providers';
import { Router } from './router';
import './styles/global.css';

export function App() {
  return (
    <Providers>
      <Router />
    </Providers>
  );
}
