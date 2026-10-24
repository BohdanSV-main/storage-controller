import { useState, type FormEvent } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowRight } from 'lucide-react';
import { api, jsonBody } from '../../shared/api';
import { ErrorMessage } from '../../shared/ui';
import { sessionKey, type User } from '../../entities/session';

export function SignInForm() {
  const client = useQueryClient();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const login = useMutation({
    mutationFn: () =>
      api<User>('/auth/login', {
        method: 'POST',
        ...jsonBody({ email: email.trim(), password }),
      }),
    onSuccess: async (user) => {
      await client.cancelQueries();
      client.removeQueries({
        predicate: (query) => query.queryKey[0] !== 'session',
      });
      client.setQueryData(sessionKey, user);
    },
    retry: false,
  });
  function submit(event: FormEvent) {
    event.preventDefault();
    if (!login.isPending) login.mutate();
  }
  return (
    <form onSubmit={submit}>
      <label className="field">
        Email
        <input
          className="input"
          type="email"
          autoComplete="username"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="name@example.com"
          disabled={login.isPending}
        />
      </label>
      <label className="field">
        Пароль
        <input
          className="input"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="Ваш пароль"
          disabled={login.isPending}
        />
      </label>
      <ErrorMessage error={login.error} />
      <button
        className="button primary"
        style={{ width: '100%', marginTop: 16 }}
        disabled={login.isPending}
      >
        {login.isPending ? 'Входимо…' : 'Увійти в Комору'}
        <ArrowRight size={18} />
      </button>
    </form>
  );
}
