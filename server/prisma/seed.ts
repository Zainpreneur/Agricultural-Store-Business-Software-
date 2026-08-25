import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  const adminPassword = await bcrypt.hash('Admin@123', 10);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@agristore.test' },
    update: {},
    create: {
      name: 'Store Admin',
      email: 'admin@agristore.test',
      passwordHash: adminPassword,
      role: 'ADMIN',
    },
  });

  const cashierPassword = await bcrypt.hash('Cashier@123', 10);
  await prisma.user.upsert({
    where: { email: 'cashier@agristore.test' },
    update: {},
    create: {
      name: 'Front Desk Cashier',
      email: 'cashier@agristore.test',
      passwordHash: cashierPassword,
      role: 'CASHIER',
    },
  });

  const categoryNames = ['Seeds', 'Fertilizers', 'Pesticides', 'Tools & Equipment', 'Animal Feed', 'Irrigation'];
  const categories: Record<string, string> = {};
  for (const name of categoryNames) {
    const cat = await prisma.category.upsert({ where: { name }, update: {}, create: { name } });
    categories[name] = cat.id;
  }

  const products = [
    { name: 'Hybrid Maize Seed (10kg bag)', sku: 'SEED-MAIZE-10', category: 'Seeds', unit: 'bag', costPrice: 1800, sellingPrice: 2200, stockQty: 40, reorderLevel: 10 },
    { name: 'Tomato Seed Sachet', sku: 'SEED-TOM-01', category: 'Seeds', unit: 'sachet', costPrice: 80, sellingPrice: 120, stockQty: 150, reorderLevel: 30 },
    { name: 'Urea Fertilizer (50kg)', sku: 'FERT-UREA-50', category: 'Fertilizers', unit: 'bag', costPrice: 3200, sellingPrice: 3800, stockQty: 60, reorderLevel: 15 },
    { name: 'DAP Fertilizer (50kg)', sku: 'FERT-DAP-50', category: 'Fertilizers', unit: 'bag', costPrice: 3600, sellingPrice: 4200, stockQty: 50, reorderLevel: 15 },
    { name: 'NPK Fertilizer (25kg)', sku: 'FERT-NPK-25', category: 'Fertilizers', unit: 'bag', costPrice: 1900, sellingPrice: 2400, stockQty: 45, reorderLevel: 10 },
    { name: 'Glyphosate Herbicide (1L)', sku: 'PEST-GLY-1L', category: 'Pesticides', unit: 'litre', costPrice: 650, sellingPrice: 850, stockQty: 35, reorderLevel: 8 },
    { name: 'Cypermethrin Insecticide (500ml)', sku: 'PEST-CYP-500', category: 'Pesticides', unit: 'bottle', costPrice: 420, sellingPrice: 600, stockQty: 25, reorderLevel: 8 },
    { name: 'Fungicide Copper Spray (1L)', sku: 'PEST-FUNG-1L', category: 'Pesticides', unit: 'litre', costPrice: 500, sellingPrice: 700, stockQty: 5, reorderLevel: 10 },
    { name: 'Garden Hoe', sku: 'TOOL-HOE-01', category: 'Tools & Equipment', unit: 'piece', costPrice: 450, sellingPrice: 650, stockQty: 20, reorderLevel: 5 },
    { name: 'Knapsack Sprayer (16L)', sku: 'TOOL-SPRAY-16', category: 'Tools & Equipment', unit: 'piece', costPrice: 2800, sellingPrice: 3500, stockQty: 12, reorderLevel: 3 },
    { name: 'Wheelbarrow', sku: 'TOOL-WHEEL-01', category: 'Tools & Equipment', unit: 'piece', costPrice: 3200, sellingPrice: 4000, stockQty: 8, reorderLevel: 2 },
    { name: 'Poultry Feed Grower (25kg)', sku: 'FEED-POUL-25', category: 'Animal Feed', unit: 'bag', costPrice: 1600, sellingPrice: 2000, stockQty: 55, reorderLevel: 15 },
    { name: 'Cattle Feed Concentrate (50kg)', sku: 'FEED-CATT-50', category: 'Animal Feed', unit: 'bag', costPrice: 2400, sellingPrice: 2900, stockQty: 30, reorderLevel: 10 },
    { name: 'Drip Irrigation Pipe (100m)', sku: 'IRR-PIPE-100', category: 'Irrigation', unit: 'roll', costPrice: 2200, sellingPrice: 2800, stockQty: 15, reorderLevel: 4 },
    { name: 'Sprinkler Head', sku: 'IRR-SPRINK-01', category: 'Irrigation', unit: 'piece', costPrice: 180, sellingPrice: 280, stockQty: 60, reorderLevel: 15 },
  ];

  for (const p of products) {
    await prisma.product.upsert({
      where: { sku: p.sku },
      update: {},
      create: {
        name: p.name,
        sku: p.sku,
        categoryId: categories[p.category],
        unit: p.unit,
        costPrice: p.costPrice,
        sellingPrice: p.sellingPrice,
        stockQty: p.stockQty,
        reorderLevel: p.reorderLevel,
      },
    });
  }

  const supplier1 = await prisma.supplier.create({
    data: { name: 'Green Valley Agro Distributors', phone: '+254-700-111222', address: 'Industrial Area, Nairobi' },
  });
  await prisma.supplier.create({
    data: { name: 'Kilimo Inputs Ltd', phone: '+254-700-333444', address: 'Nakuru Town' },
  });

  const customer1 = await prisma.customer.create({
    data: { name: 'John Mwangi (Mwangi Farm)', phone: '+254-711-000111', address: 'Kiambu', creditLimit: 20000 },
  });
  await prisma.customer.create({
    data: { name: 'Grace Wanjiru', phone: '+254-722-333555', address: 'Nyeri', creditLimit: 10000 },
  });
  await prisma.customer.create({ data: { name: 'Walk-in Customer', phone: '', address: '' } });

  console.log('Seed complete.');
  console.log('--------------------------------------------------');
  console.log('Admin login:   admin@agristore.test / Admin@123');
  console.log('Cashier login: cashier@agristore.test / Cashier@123');
  console.log('--------------------------------------------------');
  console.log(`Sample supplier: ${supplier1.name}`);
  console.log(`Sample customer: ${customer1.name}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
