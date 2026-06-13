-- DropForeignKey
ALTER TABLE "DetalleVenta" DROP CONSTRAINT "DetalleVenta_promocionId_fkey";

-- DropForeignKey
ALTER TABLE "DetalleVenta" DROP CONSTRAINT "DetalleVenta_ventaId_fkey";

-- DropForeignKey
ALTER TABLE "Pago" DROP CONSTRAINT "Pago_ventaId_fkey";

-- CreateTable
CREATE TABLE "Producto" (
    "id" INTEGER NOT NULL,
    "nombre" TEXT NOT NULL,
    "precioVenta" DECIMAL(10,2) NOT NULL,
    "cantidadActual" INTEGER NOT NULL,

    CONSTRAINT "Producto_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "DetalleVenta" ADD CONSTRAINT "DetalleVenta_ventaId_fkey" FOREIGN KEY ("ventaId") REFERENCES "Venta"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DetalleVenta" ADD CONSTRAINT "DetalleVenta_promocionId_fkey" FOREIGN KEY ("promocionId") REFERENCES "Promocion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DetalleVenta" ADD CONSTRAINT "DetalleVenta_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "Producto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pago" ADD CONSTRAINT "Pago_ventaId_fkey" FOREIGN KEY ("ventaId") REFERENCES "Venta"("id") ON DELETE CASCADE ON UPDATE CASCADE;
