const messages: Record<string, string> = {
  INVALID_CREDENTIALS: 'Неправильний email або пароль.',
  UNAUTHENTICATED: 'Сесія завершилася. Увійдіть знову.',
  FORBIDDEN: 'У вас немає доступу до цієї дії.',
  CSRF_ORIGIN_REJECTED:
    'Адреса застосунку не відповідає налаштуванням сервера.',
  VALIDATION_ERROR: 'Перевірте введені дані.',
  INSUFFICIENT_STOCK:
    'Доступний залишок змінився. Оновіть каталог і виберіть меншу кількість.',
  IDEMPOTENCY_CONFLICT:
    'Ця спроба вже має інші дані. Оновіть список бронювань.',
  INVALID_RESERVATION_STATUS:
    'Статус бронювання вже змінився. Оновіть його дані.',
  PRODUCT_NOT_FOUND: 'Товар не знайдено.',
  RESERVATION_NOT_FOUND: 'Бронювання не знайдено.',
  SERVICE_UNAVAILABLE:
    'Сервіс тимчасово недоступний. Спробуйте ще раз трохи пізніше.',
};

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
  ) {
    super(messages[code] ?? 'Не вдалося виконати запит. Спробуйте ще раз.');
  }
}

export async function api<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  let response: Response;
  try {
    response = await fetch('/api' + path, {
      ...options,
      credentials: 'same-origin',
      signal: options.signal ?? AbortSignal.timeout(15_000),
    });
  } catch {
    throw new ApiError(0, 'SERVICE_UNAVAILABLE');
  }
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new ApiError(
      response.status,
      body?.error?.code ??
        (response.status >= 500 ? 'SERVICE_UNAVAILABLE' : 'UNKNOWN'),
    );
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export function jsonBody(value: unknown): RequestInit {
  return {
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(value),
  };
}
