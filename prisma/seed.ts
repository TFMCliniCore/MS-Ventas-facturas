/// <reference types="node" />
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const metodos = [
    { id: 1, nombre: 'EFECTIVO' },
    { id: 2, nombre: 'TARJETA' },
    { id: 3, nombre: 'MIXTO' },
  ];

  for (const m of metodos) {
    await prisma.metodoPago.upsert({
      where: { id: m.id },
      update: {},
      create: m,
    });
  }
  console.log('Seeding completado con éxito.');
}

// Llama a main() de forma limpia una sola vez
main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });