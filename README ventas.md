# MS-Ventas-facturas | CliniCore TFM

Este microservicio es el componente central encargado de la orquestación del Punto de Venta (POS), el control perimetral de precios y la gestión del ciclo de vida de las facturas dentro del ecosistema de **CliniCore**. Desarrollado con **NestJS**, **TypeScript** y **Prisma ORM**, cuenta con persistencia de datos independiente en una base de datos **PostgreSQL**.

## 📦 Estructura de Módulos del Sistema

Para garantizar el orden y la mantenibilidad del código, las responsabilidades del microservicio se dividen en los siguientes módulos lógicos:

* **Módulo de Ventas:** Orquesta el flujo principal del punto de venta (POS). Se encarga de procesar las transacciones y validar que se cumplan las reglas de negocio antes de consolidar una operación.
* **Módulo de Facturas:** Gestiona el ciclo de vida de los comprobantes fiscales y legales generados, controlando estados como emisión, vigencia y almacenamiento de las referencias de impresión física.
* **Módulo de Pagos:** Administra las transacciones financieras asociadas a cada orden, registrando los importes parciales o totales vinculados a una venta antes de su cierre.
* **Módulo de Métodos de Pago:** Controla el catálogo de opciones de pago admitidas por el sistema (Efectivo, Tarjeta, etc.), regulando cómo se mapean los ingresos a nivel contable.
* **Módulo de Precios:** Centraliza las fórmulas financieras de cálculo, simula variaciones de costos y valida los márgenes de ganancia previniendo pérdidas.
* **Módulo de Promociones:** Motor encargado de auditar la vigencia temporal de campañas y ejecutar algoritmos de priorización para aplicar los mayores beneficios automáticos por volumen o categoría.
* **Módulo de Cierre de Caja (Control de Turnos):** Regula los estados de operación de las cajas (Abierto/Cerrado), impidiendo la facturación y el flujo de caja fuera de los turnos autorizados.

---

## 🚀 Funcionalidades Implementadas

* **Transacciones Atómicas (POS):** Registro seguro de ventas, detalles y métodos de pago utilizando `prisma.$transaction` para garantizar la integridad referencial (Rollback automático ante fallos de stock).
* **Validación Estricta de Payload:** Integración de `class-validator` y `class-transformer` global en el `main.ts`. Validación rigurosa de las propiedades raíz en el `CreateVentaDto` (`total`, `montoPagadoCon`, `metodoPagoId`) mapeadas limpiamente desde el Frontend.
* **Generación de Comprobantes:** Creación automatizada de archivos PDF corporativos para Tickets y Facturas tras el cobro exitoso, guardando la referencia (`urlPdf`) en base de datos.
* **Control de Turnos (Cierre de Caja):** Bloqueo estricto del registro de ventas y validación automatizada de efectivo disponible si la caja asignada al usuario se encuentra en estado `CERRADO` o reporta montos insuficientes para vueltos.
* **Anulación y Desacoplamiento:** Sistema de anulación de ventas con justificación obligatoria (`motivoAnulacion`). Implementa una llamada asíncrona (`fetch`) al *MS Inventario* para la devolución del stock, evitando la congestión del hilo principal.
* **Gestión de Precios y Auditoría:** Motor de bloqueo perimetral para evitar la asignación de precios que generen márgenes negativos. Todo cambio genera un registro inmutable en la tabla `HistorialPrecio`.
* **Motor de Promociones:** Evaluación de vigencia de descuentos utilizando el reloj interno del servidor (`new Date()`) aplicando un algoritmo de **Prioridad de Descuentos** que selecciona el mayor beneficio no acumulable.

---

## ⚙️ Variables de Entorno (`.env`)

Para que el sistema funcione correctamente, se debe crear un archivo `.env` en la raíz del proyecto tomando como base el archivo `.env.example`:

```env
# Servidor NestJS
PORT=3008
NODE_ENV=development

# Configuración Base de Datos (PostgreSQL)
POSTGRES_PORT=5438
POSTGRES_DB=ms_ventas
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres

# Cadena de conexión para Prisma (Local / Docker)
DATABASE_URL="postgresql://postgres:postgres@localhost:5438/ms_ventas?schema=public"

# URLs Microservicios Dependientes
MS_INVENTARIO_URL="http://localhost:3007/api/v1"
MS_ENTIDADES_CORE_URL="http://localhost:3001/api/v1"
🛠️ Instalación y Despliegue
Sigue estos pasos para clonar, configurar e iniciar el microservicio en tu entorno local:

1. Instalar Dependencias
Instala los módulos de Node necesarios para el framework:

Bash
npm install
2. Configurar la Base de Datos, Migraciones y Seed
Asegúrate de tener la instancia de PostgreSQL activa. Luego, sincroniza el historial completo de migraciones (incluyendo el módulo de cierres de caja) y pobla el catálogo de métodos de pago fijos:

Bash
# Generar el cliente de Prisma basado en el esquema actualizado
npx prisma generate

# Aplicar las migraciones existentes en el historial
npx prisma migrate dev

# Poblado obligatorio de la base de datos (Catálogo de Métodos de Pago, etc.)
npx prisma db seed
3. Levantar el Servidor
Para iniciar el microservicio en modo desarrollo con recarga automática (hot-reload):

Bash
npm run start:dev
El servidor levantará por defecto en el puerto 3008 bajo el prefijo base http://localhost:3008/api/v1.

🔒 Arquitectura de Datos y Asignación de Pagos
El sistema utiliza una asignación e inserción directa y fuertemente tipada de los identificadores de pago enviados por el cliente, delegando la integridad referencial a la base de datos y retornando un 400 Bad Request en caso de inconsistencias:

TypeScript
pagos: {
  create: pagos.map(p => ({
    metodoPagoId: p.metodoPagoId,
    monto: Number(p.monto),
    referencia: p.referencia || null
  }))
}