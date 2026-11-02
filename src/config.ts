export interface AppConfig {
  sessionSecret: string;
  appOrigin: string;
  secureCookie: boolean;
}

export interface ServerConfig extends AppConfig {
  dataSource: 'memory' | 'postgres';
}

export function readConfig(): ServerConfig {
  const dataSource = process.env.DATA_SOURCE ?? 'postgres';
  if (dataSource !== 'memory' && dataSource !== 'postgres') {
    throw new Error('DATA_SOURCE must be memory or postgres');
  }
  const sessionSecret = process.env.SESSION_SECRET;
  const appOrigin = process.env.APP_ORIGIN;

  if (!sessionSecret || sessionSecret.length < 32) {
    throw new Error('SESSION_SECRET must contain at least 32 characters');
  }

  if (!appOrigin) {
    throw new Error('APP_ORIGIN must be set');
  }

  const url = new URL(appOrigin);

  if (!['http:', 'https:'].includes(url.protocol) || appOrigin !== url.origin) {
    throw new Error(
      'APP_ORIGIN must contain only protocol, hostname and optional port',
    );
  }

  return {
    dataSource,
    sessionSecret,
    appOrigin,
    secureCookie: url.protocol === 'https:',
  };
}
