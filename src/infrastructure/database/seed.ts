import { argon2Hasher } from '../security/argon2-password-hasher.js';
import { createPrismaClient } from './prisma-client.js';

const users = [
  {
    name: 'Біба Тестувальник',
    email: 'biba@example.com',
    role: 'USER',
    password: 'User-one-123!',
  },
  {
    name: 'Боба Тестувальник',
    email: 'boba@example.com',
    role: 'USER',
    password: 'User-two-123!',
  },
  {
    name: 'Андрій Работяга',
    email: 'worker@example.com',
    role: 'WORKER',
    password: 'Worker-123!',
  },
] as const;

const products = [
  {
    articleCode: 'KB-001',
    name: 'Клавіатура Logitech K120',
    desc: 'Дротова USB-клавіатура з українською розкладкою',
    onHand: 10,
  },
  {
    articleCode: 'MS-001',
    name: 'Миша Logitech B100',
    desc: 'Дротова оптична USB-миша',
    onHand: 5,
  },
  {
    articleCode: 'MN-001',
    name: 'Монітор Dell P2422H',
    desc: 'Монітор 23,8 дюйма з роздільною здатністю Full HD',
    onHand: 0,
  },
  {
    articleCode: 'CB-001',
    name: 'Кабель HDMI, 2 м',
    desc: 'Кабель для підключення монітора або проєктора',
    onHand: 15,
  },
  {
    articleCode: 'AD-001',
    name: 'Перехідник USB-C → HDMI',
    desc: 'Перехідник для підключення зовнішнього дисплея',
    onHand: 3,
  },
] as const;

async function main(): Promise<void> {
  const connectionString = process.env['DATABASE_URL'];

  if (!connectionString) {
    throw new Error('DATABASE_URL is required.');
  }

  const prisma = createPrismaClient(connectionString);

  try {
    const preparedUsers = await Promise.all(
      users.map(async ({ password, ...user }) => ({
        ...user,
        passwordHash: await argon2Hasher.hash(password),
      })),
    );

    await prisma.$transaction(async (tx) => {
      for (const user of preparedUsers) {
        await tx.user.upsert({
          where: { email: user.email },
          update: {},
          create: user,
        });
      }

      for (const { onHand, ...product } of products) {
        await tx.product.upsert({
          where: { articleCode: product.articleCode },
          update: {},
          create: {
            ...product,
            stock: {
              create: {
                onHand,
                reserved: 0,
              },
            },
          },
        });
      }
    });

    const storedUsers = await prisma.user.findMany({
      where: {
        email: { in: users.map((user) => user.email) },
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
      orderBy: { id: 'asc' },
    });

    const storedProducts = await prisma.product.findMany({
      where: {
        articleCode: {
          in: products.map((product) => product.articleCode),
        },
      },
      include: { stock: true },
      orderBy: { id: 'asc' },
    });

    console.table(storedUsers);
    console.table(
      storedProducts.map((product) => ({
        id: product.id,
        articleCode: product.articleCode,
        name: product.name,
        onHand: product.stock?.onHand,
        reserved: product.stock?.reserved,
      })),
    );

    console.log('Database seed completed.');
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error('Database seed failed:', error);
  process.exitCode = 1;
});
