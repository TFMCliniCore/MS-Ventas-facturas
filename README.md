# CliniCore MS-Ventas-facturas

Componente central del ecosistema **CliniCore** encargado de la orquestación del Punto de Venta (POS), la gestión del ciclo de vida de facturas/comprobantes, el control perimetral de precios, el motor de promociones y la administración de turnos y cierres de caja. Desarrollado con **NestJS**, **TypeScript** y **Prisma ORM**, respaldado por una base de datos **PostgreSQL 16**.

---

## Responsabilidades
* **Orquestación POS:** Procesamiento atómico de transacciones (`prisma.$transaction`) con reversión automática (*rollback*) de stock e inventario ante errores.
* **Control de Turnos y Cajas:** Bloqueo perimetral de facturación y validación de efectivo en caja si el turno no está en estado `ABIERTA`.
* **Auditoría e Historial de Precios:** Bloqueo de precios con margen negativo y registro inmutable en `HistorialPrecio`.
* **Motor de Promociones:** Evaluación en tiempo real de vigencias (`new Date()`) aplicando algoritmos de prioridad no acumulables por producto o categoría.
* **Comprobantes y Facturación:** Generación de PDF corporativos para Tickets/Facturas almacenados en disco local y servidos estáticamente.
* **Integración asíncrona:** Comunicación con `MS-Inventario` (desacoplamiento de devolución de stock) y `MS-Entidades-Core`.

---

## Stack Tecnológico
* **Framework:** NestJS 10 (TypeScript)
* **ORM & DB:** Prisma ORM + PostgreSQL 16
* **Validación:** `class-validator` + `class-transformer` (Pipe global en `main.ts`)
* **Documentación:** Swagger / OpenAPI
* **Contenedores:** Docker / Docker Compose

---

## Variables de Entorno
Crea un archivo `.env` en la raíz del proyecto tomando como plantilla `.env.example`:

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
```

---

## Estructura de Módulos del Sistema

| Módulo | Descripción |
| :--- | :--- |
| **Ventas** | Gestiona el carrito POS, procesamiento transaccional, sincronización local de productos y anulación de ventas. |
| **Facturas** | Genera y sirve físicamente los archivos PDF de tickets y facturas comerciales. |
| **Cierres de Caja** | Controla el flujo de turnos (Apertura/Cierre), cálculo de saldos esperados vs. conteo físico (arqueo). |
| **Precios** | Registra el histórico de precios, calcula márgenes de ganancia e impide ventas a pérdida. |
| **Pagos** | Asienta el desglose transaccional de pagos vinculados a una orden (Efectivo, Tarjeta, Transferencia). |
| **Métodos de Pago** | Catálogo administrable de métodos de pago admitidos en la plataforma. |
| **Promociones** | Aplica descuentos automáticos temporales ajustados por categoría o producto. |

---

## Despliegue y Ejecución

### Opción A: Despliegue Local

1. **Instalar dependencias:**
   ```bash
   npm install
   ```

2. **Migraciones y Seed de Base de Datos:**
   ```bash
   npx prisma generate
   npx prisma migrate dev
   npx prisma db seed
   ```

3. **Iniciar servidor en desarrollo:**
   ```bash
   npm run start:dev
   ```
   *El microservicio estará disponible en:* `http://localhost:3008/api/v1`

---

### Opción B: Despliegue con Docker

```bash
docker compose up --build
```
* **Servicio:** `http://localhost:3008`
* **PostgreSQL:** `localhost:5438`

---

## Documentación de la API (Swagger)

Con el servidor en ejecución, puedes consultar la interfaz interactiva OpenAPI / Swagger en:

* **UI Swagger:** `http://localhost:3008/api/v1/ventas/docs`
* **JSON OpenAPI:** `http://localhost:3008/api/v1/ventas/docs-json`

---

## Catálogo de Endpoints

### 1. Ventas y Operaciones POS (`/api/v1/ventas`)
| Método | Ruta | Descripción |
| :--- | :--- | :--- |
| `POST` | `/api/v1/ventas/sync-productos` | Sincroniza el catálogo local consultando a `MS-Inventario` |
| `GET` | `/api/v1/ventas/productos` | Obtiene el catálogo local rápido de productos cargado en el POS |
| `POST` | `/api/v1/ventas` | Registra y procesa una nueva venta (Transacción atómica) |
| `GET` | `/api/v1/ventas` | Lista el historial general de transacciones de venta |
| `GET` | `/api/v1/ventas/:id` | Muestra el desglose, ítems y pagos de una venta específica |
| `PATCH`| `/api/v1/ventas/:id/anular` | Anula una venta activa y solicita devolución de stock a `MS-Inventario` |

### 2. Cierres de Caja y Turnos (`/api/v1/cierres-caja`)
| Método | Ruta | Descripción |
| :--- | :--- | :--- |
| `GET` | `/api/v1/cierres-caja/activa` | Consulta el turno o caja actualmente abierto |
| `GET` | `/api/v1/cierres-caja` | Lista historial de turnos (parámetros opcionales: `limite`, `estado`) |
| `POST` | `/api/v1/cierres-caja` | Inicia un nuevo turno registrando el monto inicial de apertura |
| `PATCH`| `/api/v1/cierres-caja/:id/cerrar` | Ejecuta el arqueo, calcula diferencias y cierra la caja |

### 3. Gestión de Precios (`/api/v1/precios`)
| Método | Ruta | Descripción |
| :--- | :--- | :--- |
| `POST` | `/api/v1/precios` | Actualiza o establece lista de precio de un producto validando margen |
| `GET` | `/api/v1/precios/historial` | Consulta la bitácora global de cambios de precios (`?limite=10`) |
| `GET` | `/api/v1/precios/historial/:productoId` | Muestra las variaciones históricas de un producto |

### 4. Procesamiento de Pagos y Métodos (`/api/v1/pagos`, `/api/v1/metodos-pago`)
| Método | Ruta | Descripción |
| :--- | :--- | :--- |
| `POST` | `/api/v1/pagos/venta/:ventaId` | Registra y desacopla transacciones de pago vinculadas a una venta |
| `GET` | `/api/v1/metodos-pago` | Obtiene el catálogo de formas de pago activas |
| `POST` | `/api/v1/metodos-pago` | Crea un nuevo método de pago aceptado |
| `DELETE`| `/api/v1/metodos-pago/:id` | Deshabilita o elimina un método de pago existente |

### 5. Facturación y PDF (`/api/v1/facturas` y static)
| Método | Ruta | Descripción |
| :--- | :--- | :--- |
| `POST` | `/api/v1/facturas/generar-manual` | Genera y fuerza el guardado en disco del comprobante en PDF |
| `GET` | `/facturas/:filename` | Sirve/descarga el archivo PDF físicamente (*Ruta pública exenta del prefijo global*) |

---

## Ejemplos de Request / Response

### Registrar Venta (`POST /api/v1/ventas`)
**Body:**
```json
{
  "clienteId": 12,
  "sucursalId": 1,
  "subtotal": 100.00,
  "descuento": 10.00,
  "impuestos": 19.00,
  "total": 109.00,
  "detalles": [
    {
      "productoId": 5,
      "cantidad": 2,
      "precioUnitario": 50.00,
      "subtotal": 100.00,
      "promocionId": 1
    }
  ],
  "pagos": [
    {
      "metodoPagoId": 1,
      "monto": 109.00,
      "referencia": "TRANS-88492"
    }
  ]
}
```

**Response (201 Created):**
```json
{
  "id": 102,
  "codigo": "FACT-200926-A9X",
  "total": 109.00,
  "estado": "COMPLETADA",
  "createdAt": "2026-09-20T14:30:00.000Z",
  "factura": {
    "numeroComprobante": "TK-102",
    "tipoComprobante": "TICKET",
    "urlPdf": "/facturas/comprobante_102.pdf"
  }
}
```

### Procesar Cierre de Caja (`PATCH /api/v1/cierres-caja/1/cerrar`)
**Body:**
```json
{
  "totalReal": 350.00,
  "efectivoReal": 200.00,
  "tarjetaReal": 100.00,
  "transferenciaReal": 50.00,
  "observaciones": "Cuadre exitoso sin novedad"
}
```

---

## Modelo de Datos (Prisma)

```
 [ CierreCaja ] 1 ─── N [ Venta ] 1 ─── 1 [ Factura ]
                          │     │
                          │     └─── N [ Pago ] N ─── 1 [ MetodoPago ]
                          │
                          └─── N [ DetalleVenta ] N ─── 1 [ Producto ]
                                       │
                                       └─── N ─── 0..1 [ Promocion ]
```

* **Venta:** Encabezado con totales, estados (`PENDIENTE`, `COMPLETADA`, `ANULADA`) y motivos de anulación.
* **DetalleVenta:** Desglose de ítems con referencias a productos sincronizados localmente y promociones aplicadas.
* **CierreCaja:** Turno operativo con arqueos (`efectivoReal`, `tarjetaReal`, `transferenciaReal`) y cálculo automático de diferencias.
* **HistorialPrecio:** Registro inmutable de variaciones de precios y cálculo de margen de ganancia.
```
eof
