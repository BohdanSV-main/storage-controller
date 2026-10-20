# Запуск Комори

Потрібні Node.js 24, PostgreSQL та налаштований бекенд із застосованими міграціями.

У першому PowerShell-терміналі, з кореня проєкту:

```powershell
npm run build
$env:APP_ORIGIN = 'http://127.0.0.1:5173'
npm start
```

У другому терміналі:

```powershell
cd frontend
npm ci
npm run dev
```

Відкрити http://127.0.0.1:5173. Бекенд має працювати на http://127.0.0.1:3000.
