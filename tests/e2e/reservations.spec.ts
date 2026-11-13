import { test, expect } from './fixtures.js';

test('reserves stock and restores it after cancellation', async ({
  page,
  account,
  product,
}) => {
  await page.goto('/login');
  await page.getByLabel('Email', { exact: true }).fill(account.email);
  await page.getByLabel('Пароль', { exact: true }).fill(account.password);
  await page.getByRole('button', { name: 'Увійти в Комору' }).click();
  await expect(page).toHaveURL('/catalog');

  const card = page
    .getByRole('article')
    .filter({ hasText: product.articleCode });
  await expect(card.getByText('5', { exact: true })).toBeVisible();
  await card.getByRole('button', { name: 'Забронювати', exact: true }).click();
  await page.getByLabel('Кількість', { exact: true }).fill('2');
  await page.getByRole('button', { name: 'Підтвердити бронювання' }).click();
  await expect(page).toHaveURL(/\/reservations\/\d+$/);
  await expect(card.getByRole('heading', { name: product.name })).toBeVisible();
  await expect(card.getByText('Заброньовано', { exact: true })).toBeVisible();

  await page.getByRole('link', { name: 'Каталог', exact: true }).click();
  await expect(card.getByText('3', { exact: true })).toBeVisible();
  await page.getByRole('link', { name: 'Мої бронювання', exact: true }).click();
  await expect(card).toHaveCount(1);
  await expect(card.getByText('2 шт.', { exact: true })).toBeVisible();
  await expect(card.getByText('Заброньовано', { exact: true })).toBeVisible();
  await card.getByRole('button', { name: 'Скасувати', exact: true }).click();
  await page
    .getByRole('button', { name: 'Так, скасувати', exact: true })
    .click();
  await expect(card.getByText('Скасовано', { exact: true })).toBeVisible();
  await page.reload();
  await expect(card.getByText('Скасовано', { exact: true })).toBeVisible();
  await expect(
    card.getByRole('button', { name: 'Скасувати', exact: true }),
  ).toHaveCount(0);

  await page.getByRole('link', { name: 'Каталог', exact: true }).click();
  await expect(card.getByText('5', { exact: true })).toBeVisible();
});

test('issues a reservation without reducing available stock twice', async ({
  page,
  browser,
  baseURL,
  account,
  worker,
  product,
}) => {
  await page.goto('/login');
  await page.getByLabel('Email', { exact: true }).fill(account.email);
  await page.getByLabel('Пароль', { exact: true }).fill(account.password);
  await page.getByRole('button', { name: 'Увійти в Комору' }).click();
  await expect(page).toHaveURL('/catalog');

  const card = page
    .getByRole('article')
    .filter({ hasText: product.articleCode });

  await expect(card.getByText('5', { exact: true })).toBeVisible();
  await card.getByRole('button', { name: 'Забронювати', exact: true }).click();
  await page.getByLabel('Кількість', { exact: true }).fill('2');
  await page.getByRole('button', { name: 'Підтвердити бронювання' }).click();
  await expect(page).toHaveURL(/\/reservations\/\d+$/);

  await page.getByRole('link', { name: 'Каталог', exact: true }).click();
  await expect(card.getByText('3', { exact: true })).toBeVisible();
  await page.getByRole('link', { name: 'Мої бронювання' }).click();
  await expect(card.getByText('Заброньовано', { exact: true })).toBeVisible();

  const context = await browser.newContext({ baseURL: baseURL! });

  try {
    const staff = await context.newPage();

    await staff.goto('/login');
    await staff.getByLabel('Email', { exact: true }).fill(worker.email);
    await staff.getByLabel('Пароль', { exact: true }).fill(worker.password);
    await staff.getByRole('button', { name: 'Увійти в Комору' }).click();
    await expect(staff).toHaveURL('/warehouse');

    const ticket = staff
      .getByRole('article')
      .filter({ hasText: product.articleCode });

    await expect(ticket).toHaveCount(1);
    await expect(ticket.getByText('2 шт.', { exact: false })).toBeVisible();
    await ticket.getByRole('button', { name: 'Видати товар' }).click();
    await staff.getByRole('button', { name: 'Підтвердити видачу' }).click();
    await expect(ticket).toHaveCount(0);

    await page.reload();
    await expect(card.getByText('Скасовано', { exact: true })).toHaveCount(0);
    await expect(card.getByText('Видано', { exact: true })).toBeVisible();
    await expect(
      card.getByRole('button', { name: 'Скасувати', exact: true }),
    ).toHaveCount(0);

    await page.getByRole('link', { name: 'Каталог', exact: true }).click();
    await expect(card.getByText('3', { exact: true })).toBeVisible();
  } finally {
    await context.close();
  }
});
