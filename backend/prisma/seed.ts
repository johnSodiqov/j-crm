import { PrismaClient, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';
const prisma = new PrismaClient();
async function main() {
  const password = await bcrypt.hash('admin123', 10);
  const sellerPassword = await bcrypt.hash('seller123', 10);
  await prisma.user.upsert({ where: { email: 'admin@example.com' }, update: {}, create: { name: 'Администратор', email: 'admin@example.com', password, role: Role.ADMIN } });
  await prisma.user.upsert({ where: { email: 'seller@example.com' }, update: {}, create: { name: 'Продавец', email: 'seller@example.com', password: sellerPassword, role: Role.SELLER } });
  const drinks = await prisma.category.upsert({ where: { name: 'Напитки' }, update: {}, create: { name: 'Напитки' } });
  const snacks = await prisma.category.upsert({ where: { name: 'Снэки' }, update: {}, create: { name: 'Снэки' } });
  await prisma.product.upsert({ where: { sku: 'PEPSI-1L' }, update: {}, create: { name: 'Pepsi 1L', sku: 'PEPSI-1L', categoryId: drinks.id, purchasePrice: 7000, salePrice: 10000, stock: 25, minStock: 5 } });
  await prisma.product.upsert({ where: { sku: 'CHIPS-001' }, update: {}, create: { name: 'Чипсы классические', sku: 'CHIPS-001', categoryId: snacks.id, purchasePrice: 9000, salePrice: 14000, stock: 14, minStock: 5 } });
}
main().finally(() => prisma.$disconnect());
