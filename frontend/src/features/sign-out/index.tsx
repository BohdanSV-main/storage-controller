import { useMutation, useQueryClient } from '@tanstack/react-query';
import { LogOut } from 'lucide-react';
import { api } from '../../shared/api';
import { sessionKey } from '../../entities/session';
import { ErrorMessage } from '../../shared/ui';

export function SignOutButton() {
  const client = useQueryClient();
  const logout = useMutation({
    mutationFn: () => api<void>('/auth/logout', { method: 'POST' }),
    onSuccess: async () => {
      await client.cancelQueries();
      client.removeQueries({
        predicate: (query) => query.queryKey[0] !== 'session',
      });
      client.setQueryData(sessionKey, null);
    },
    retry: false,
  });
  return (
    <div>
      <button
        className="button quiet small"
        disabled={logout.isPending}
        onClick={() => logout.mutate()}
      >
        <LogOut size={16} />
        {logout.isPending ? 'Виходимо…' : 'Вийти'}
      </button>
      <ErrorMessage error={logout.error} />
    </div>
  );
}
