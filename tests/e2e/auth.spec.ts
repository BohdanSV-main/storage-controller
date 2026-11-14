import { test, expect } from './fixtures.js';

test('logs in, keeps the session after reload and logs out', async ({
  page,
  account,
}) => {
  await page.goto('/login');
  await page.getByLabel('Email', { exact: true }).fill(account.email);
  await page.getByLabel('Пароль', { exact: true }).fill(account.password);
  await page.getByRole('button', { name: 'Увійти в Комору' }).click();

  await expect(page).toHaveURL('/catalog');
  await expect(
    page.getByRole('heading', { name: 'Каталог товарів' }),
  ).toBeVisible();
  await expect(page.getByText(account.name, { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByText(account.name, { exact: true })).toBeVisible();

  await page.getByRole('button', { name: 'Вийти', exact: true }).click();
  await expect(page).toHaveURL('/login');
  await page.goto('/catalog');
  await expect(page).toHaveURL('/login');
  await expect(
    page.getByRole('button', { name: 'Увійти в Комору' }),
  ).toBeVisible();
});

test('rejects an incorrect password', async ({ page, account }) => {
  await page.goto('/login');
  await page.getByLabel('Email', { exact: true }).fill(account.email);
  await page
    .getByLabel('Пароль', { exact: true })
    .fill(account.password + '-wrong');
  await page.getByRole('button', { name: 'Увійти в Комору' }).click();

  await expect(page.getByRole('alert')).toHaveText(
    'Неправильний email або пароль.',
  );
  await expect(page).toHaveURL('/login');
  await page.goto('/catalog');
  await expect(page).toHaveURL('/login');
});
