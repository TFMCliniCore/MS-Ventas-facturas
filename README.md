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
* **Generación de Comprobantes:** Creación automatizada de archivos PDF corporativos para Tickets y Facturas tras el cobro exitoso, guardando la referencia (`urlPdf`) en base de datos.
* **Control de Turnos (Cierre de Caja):** Bloqueo estricto del registro de ventas si la caja asignada al usuario se encuentra en estado `CERRADO`.
* **Anulación y Desacoplamiento:** Sistema de anulación de ventas con justificación obligatoria (`motivoAnulacion`). Implementa una llamada asíncrona (`fetch`) al *MS Inventario* para la devolución del stock, evitando la congestión del hilo principal y respetando la arquitectura de microservicios.
* **Gestión de Precios y Auditoría:** Motor de bloqueo perimetral para evitar la asignación de precios que generen márgenes negativos (salvo excepciones autorizadas mediante flag). Todo cambio genera un registro inmutable en la tabla `HistorialPrecio` con ID de usuario y fecha real del servidor.
* **Motor de Promociones:** Evaluación de vigencia de descuentos utilizando el reloj interno del servidor (`new Date()`) para evitar manipulaciones desde el cliente. Implementa un algoritmo de **Prioridad de Descuentos** que selecciona el mayor beneficio para el cliente (ej. Categoría vs Volumen) bloqueando la acumulación lineal.

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

# URLs Microservicios Dependientes (Ajustar puertos según entorno)
MS_INVENTARIO_URL="http://localhost:3007/api/v1"
MS_ENTIDADES_CORE_URL="http://localhost:3001/api/v1"
🛠️ Instalación y Despliegue
Sigue estos pasos para clonar, configurar e iniciar el microservicio en tu entorno local:

1. Instalar Dependencias
Instala los módulos de Node necesarios para el framework:

Bash
npm install
2. Configurar la Base de Datos y Prisma
Asegúrate de tener la instancia de PostgreSQL corriendo en el puerto especificado en tu .env (ej. mediante Docker). Luego, sincroniza los modelos ejecutando las migraciones:

Bash
# Generar el cliente de Prisma basado en el esquema
npx prisma generate

# Aplicar las migraciones a la base de datos de desarrollo
npx prisma migrate dev --name init
3. Levantar el Servidor
Para iniciar el microservicio en modo desarrollo con recarga automática (hot-reload):

Bash
npm run start:dev
El servidor levantará por defecto en el puerto 3008 (según la configuración del archivo .env) bajo el prefijo base http://localhost:3008/api/v1.

⚠️ Notas Técnicas para Producción (Technical Debt)
Mapeo de Métodos de Pago (ventas.service.ts)
Durante el desarrollo local y las pruebas de integración, se implementó una estrategia de resiliencia en el guardado de métodos de pago utilizando connectOrCreate de Prisma:

TypeScript
metodoPago: {
  connectOrCreate: {
    where: { id: p.metodoPagoId || 1 },
    create: { id: p.metodoPagoId || 1, nombre: "Efectivo / POS" }
  }
}
Plan de acción para el paso a Producción:
Este comportamiento es temporal. En un entorno productivo, el catálogo de métodos de pago (Efectivo, Tarjeta, Transferencia) debe ser estrictamente controlado y no debe crearse "al vuelo" para evitar la duplicación de datos.

Antes del despliegue final, se debe:

Paso A: Ejecutar un script de semilla (prisma/seed.ts) que inserte los métodos de pago fijos y reales en la base de datos.

Paso B: Cambiar el bloque de código a una asignación estricta y delegar la validación temprana a NestJS (retornar 400 Bad Request si el ID del método de pago enviado por el frontend no existe).

TypeScript
// Código objetivo para Producción:
pagos: {
  create: pagos.map(p => ({
    metodoPagoId: p.metodoPagoId,
    monto: Number(p.monto),
    referencia: p.referencia || null
  }))
}