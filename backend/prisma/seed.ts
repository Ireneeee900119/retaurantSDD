import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const drinks = await prisma.menuCategory.upsert({
    where: { name: '手搖飲料' },
    update: {},
    create: { name: '手搖飲料', displayOrder: 1 },
  });

  const snacks = await prisma.menuCategory.upsert({
    where: { name: '輕食點心' },
    update: {},
    create: { name: '輕食點心', displayOrder: 2 },
  });

  await prisma.menuItem.createMany({
    skipDuplicates: true,
    data: [
      {
        categoryId: drinks.id,
        name: '珍珠奶茶',
        description: '經典台式珍珠奶茶，Q彈珍珠',
        price: 65,
        displayOrder: 1,
      },
      {
        categoryId: drinks.id,
        name: '抹茶拿鐵',
        description: '日式抹茶搭配鮮奶',
        price: 75,
        displayOrder: 2,
      },
      {
        categoryId: snacks.id,
        name: '雞蛋沙拉三明治',
        description: '新鮮雞蛋沙拉，軟式吐司',
        price: 55,
        displayOrder: 1,
      },
      {
        categoryId: snacks.id,
        name: '起司薯條',
        description: '酥脆薯條搭配起司醬',
        price: 60,
        displayOrder: 2,
      },
    ],
  });

  console.log('Seed complete');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
