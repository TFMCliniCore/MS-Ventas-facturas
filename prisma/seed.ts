import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Sembrando métodos de pago para POS...');

  const metodos = [
    { nombre: 'Efectivo', requiereReferencia: false },
    { nombre: 'Tarjeta', requiereReferencia: true },
    { nombre: 'Transferencia', requiereReferencia: true },
    { nombre: 'Mixto', requiereReferencia: false },
  ];

  for (const metodo of metodos) {
    await prisma.metodoPago.upsert({
      where: { nombre: metodo.nombre },
      update: {},
      create: metodo,
    });
  }

  console.log('Semilla ejecutada con éxito.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });