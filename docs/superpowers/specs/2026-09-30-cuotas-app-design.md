# Cuotas App — Diseño v1

Fecha: 2026-09-30
Estado: borrador para revisión

## 1. Objetivo

Aprovechar al máximo las tarjetas de crédito sin endeudarse, y saber cada mes cuánto dinero queda disponible para invertir.

Problemas actuales que resuelve:

- No se sabe cuántas cuotas faltan de cada compra.
- No se ve cuándo se solapan cuotas, en una tarjeta o entre varias.
- No hay un lugar único que junte cuotas, gastos fijos y presupuesto mensual.

### Criterios de éxito

1. Abrir la app en el celular y ver en segundos cuánto se paga de tarjetas este mes y los próximos 12.
2. Ver por tarjeta: monto del mes, cuotas activas, mes de la última cuota y total restante.
3. Antes de comprar en cuotas, ver si algún mes futuro queda con disponible negativo.
4. Ver por mes: `ingresos − gastos fijos − cuotas − presupuesto variable = disponible para invertir`.
5. Funciona offline y se instala en la pantalla de inicio.

## 2. Alcance

### v1 (este spec)

- Tarjetas, compras en cuotas, proyección mensual, resumen por tarjeta y Gantt.
- Presupuesto básico: ingresos recurrentes, gastos fijos recurrentes y presupuesto estimado por categoría.
- Vista previa "¿me alcanza?" en el formulario de compra.
- Almacenamiento local (IndexedDB) con backup JSON.
- PWA instalable y offline, publicada en GitHub Pages.

### Fuera de alcance v1 (planificado)

- **v2:** registro de gastos variables reales y comparación contra lo presupuestado.
- **v3:** sincronización en la nube con login (por ejemplo, Supabase) y uso multi-dispositivo.
- Conversión entre monedas (cotización USD/ARS).
- Cálculo de intereses, CFT o recargos. Los montos se cargan tal como figuran en el resumen.

### Supuestos

- Un solo usuario, sin login.
- Moneda principal ARS. USD está soportado a nivel modelo desde v1, y los totales se muestran separados por moneda.
- La interfaz está en español (Argentina).

## 3. Arquitectura

Stack: React + TypeScript (strict) + Vite + `vite-plugin-pwa` + Dexie (IndexedDB) + zod + Recharts + Tailwind v4. Tests con Vitest, Testing Library, `fake-indexeddb` y Playwright.

### Capas

Cada capa depende solo de las de abajo. `domain` no importa React, Dexie ni APIs del navegador.

```
src/
  domain/          lógica pura + tipos + esquemas zod
    money.ts         montos en enteros (centavos); formateo ARS/USD
    month.ts         tipo Month "YYYY-MM"; addMonths, diff, rangos
    schemas.ts       esquemas zod de todas las entidades
    installments.ts  compra → lista de cuotas {month, number, amount}
    closing.ts       fecha compra + cierre/vencimiento → mes de 1ra cuota sugerido
    budget.ts        cálculo del mes: ingresos, fijos, cuotas, variable, disponible
    projection.ts    próximos N meses agregados por tarjeta y moneda
  data/
    repository.ts    interfaces Repository<T> (contrato estable)
    dexie/           implementación IndexedDB + versiones de esquema
    backup.ts        export/import JSON versionado
  features/
    dashboard/       Inicio
    purchases/       lista, Gantt, formulario con vista previa
    budget/          ingresos, fijos, categorías, tabla mensual
    settings/        tarjetas, backup
  ui/                componentes compartidos (layout, nav, inputs de dinero, etc.)
  app/               router, providers, registro del service worker
```

### Contrato de repositorio (escalabilidad hacia v3)

```ts
interface Repository<T extends Entity> {
  list(): Promise<T[]>;            // excluye borrados lógicos
  get(id: string): Promise<T | undefined>;
  put(entity: T): Promise<void>;   // crea o actualiza; setea updatedAt
  remove(id: string): Promise<void>; // borrado lógico: setea deletedAt
  subscribe(cb: (items: T[]) => void): () => void; // reactividad
}
```

La interfaz consume solo este contrato, a través de hooks (`useCards`, `usePurchases`, etc.). En v3 se agrega una implementación nube o sincronizada sin tocar `domain/` ni `features/`.

## 4. Modelo de datos

Campos comunes a todas las entidades (`Entity`):

| Campo | Tipo | Nota |
|---|---|---|
| `id` | string (UUID v4) | generado en el cliente (apto para sync) |
| `createdAt` | string ISO | |
| `updatedAt` | string ISO | resolución de conflictos futura |
| `deletedAt` | string ISO? | borrado lógico |

Tipos base:

- `Money`: entero en centavos. Nunca se usa `float` para montos.
- `Currency`: `"ARS" | "USD"`.
- `Month`: string `"YYYY-MM"`.

### Card

| Campo | Tipo | Regla |
|---|---|---|
| `name` | string | 1–40 caracteres |
| `color` | string hex | para los gráficos |
| `closingDay` | number? | 1–31 |
| `dueDay` | number? | 1–31 |
| `archived` | boolean | default `false`; oculta la tarjeta del formulario de compra, pero sus cuotas siguen contando |

### Purchase

| Campo | Tipo | Regla |
|---|---|---|
| `cardId` | string | debe existir |
| `description` | string | 1–80 caracteres |
| `currency` | Currency | |
| `installmentAmount` | Money | > 0 |
| `installmentsCount` | number | entero 1–72 |
| `firstMonth` | Month | mes en que se paga la cuota 1 |
| `purchaseDate` | string ISO date? | referencia |
| `category` | string? | libre |

En el formulario, si se carga el total: `installmentAmount = round(total / installmentsCount)`. Se guarda el valor de la cuota; la diferencia de redondeo no se modela.

### Income / FixedExpense

| Campo | Tipo | Regla |
|---|---|---|
| `name` | string | 1–40 caracteres |
| `amount` | Money | > 0 |
| `currency` | Currency | |
| `startMonth` | Month | |
| `endMonth` | Month? | ≥ `startMonth`; ausente = sin fin |
| `category` | string | solo FixedExpense |

Aplica a todo mes `m` con `startMonth ≤ m ≤ endMonth`.

### BudgetCategory

| Campo | Tipo | Regla |
|---|---|---|
| `name` | string | 1–40 caracteres |
| `monthlyAmount` | Money | ≥ 0 |
| `currency` | Currency | |

Aplica a todos los meses (v1 no maneja vigencia por categoría).

### Meta

Registro único con `schemaVersion` y `lastBackupAt?`.

### Datos derivados (no persistidos)

Las cuotas nunca se guardan: se calculan desde `Purchase`. La cuota `n` (1..N) cae en `addMonths(firstMonth, n − 1)`. Una compra está **activa** en el mes `m` si `firstMonth ≤ m ≤ addMonths(firstMonth, N − 1)`, y **terminada** si el mes actual es posterior a la última cuota.

## 5. Reglas de negocio

### 5.1 Sugerencia del mes de la primera cuota (`closing.ts`)

Entrada: `purchaseDate`, `closingDay?` y `dueDay?` de la tarjeta.

1. Si la tarjeta no tiene `closingDay`, no hay sugerencia: el usuario elige el mes (por defecto, el mes siguiente a la compra).
2. `closingDay` efectivo del mes = `min(closingDay, último día del mes)`.
3. Si el día de compra ≤ cierre efectivo, el mes de cierre es el mes de la compra. Si no, es el mes siguiente.
4. Si hay `dueDay` y `dueDay > closingDay`, el mes de pago es el mismo mes de cierre. Si no (o si no hay `dueDay`), es el mes siguiente al de cierre.
5. El mes de pago es el `firstMonth` sugerido. El usuario siempre puede editarlo, y el valor editado prevalece.

### 5.2 Cálculo del mes (`budget.ts`)

Para un mes `m` y una moneda `c`:

```
ingresos(m,c)  = Σ Income aplicables
fijos(m,c)     = Σ FixedExpense aplicables
cuotas(m,c)    = Σ installmentAmount de Purchases activas en m
variable(m,c)  = Σ BudgetCategory.monthlyAmount
disponible     = ingresos − fijos − cuotas − variable
```

Las monedas nunca se suman entre sí. Todo resultado es `Record<Currency, …>`, y en la interfaz solo se muestran las monedas con datos.

### 5.3 Proyección (`projection.ts`)

`project(from: Month, count: number)` devuelve un item por mes con: cuotas por tarjeta y moneda, el desglose de 5.2 y el detalle de cada cuota (`purchaseId`, `number/total`, `amount`). Valor por defecto: 12 meses desde el mes actual.

### 5.4 Resumen por tarjeta

Para cada tarjeta y moneda: monto del mes actual, cantidad de compras activas, mes de la última cuota pendiente y total restante (cuotas con mes ≥ actual).

### 5.5 Vista previa "¿me alcanza?"

Con el borrador del formulario válido, se calcula la proyección con y sin la compra nueva, para los meses que abarca. Se muestra el disponible antes y después por mes, y se marca en rojo todo mes con disponible < 0. La vista previa es informativa y no bloquea el guardado.

## 6. Pantallas

Mobile-first. Navegación inferior: **Inicio · Compras · Presupuesto · Ajustes**, más un botón flotante **+** (nueva compra) visible en Inicio y Compras.

### Inicio

- Tarjeta destacada: disponible del mes actual, verde si es ≥ 0 y rojo si es < 0.
- Selector de mes (◀ ▶).
- Gráfico de barras apiladas por tarjeta, próximos 12 meses, con la línea de disponible. Al tocar un mes se abre el detalle del mes.
- Lista de resumen por tarjeta (5.4).

### Detalle del mes

Cuotas del mes (descripción, tarjeta, n/N, monto), fijos, ingresos, variable y el cálculo final.

### Compras

- Lista agrupada por tarjeta; filtro Activas / Terminadas / Todas.
- Cada item muestra descripción, n/N en el mes actual, barra de progreso y monto restante.
- Alternar a vista **Gantt**: una fila por compra activa y columnas por mes, con barras del color de la tarjeta, para ver los solapamientos.
- Al tocar una compra: editar o eliminar (con confirmación).

### Formulario de compra

Tarjeta, descripción, moneda, cantidad de cuotas, un toggle "Total / Valor cuota" con su monto, fecha de compra (por defecto hoy), mes de la 1ra cuota (sugerido y editable, con la leyenda "sugerido según cierre") y categoría opcional. Debajo, la vista previa (5.5).

### Presupuesto

Secciones Ingresos, Gastos fijos y Categorías, con alta, edición y baja. Tabla mensual de los próximos 12 meses con el desglose de 5.2.

### Ajustes

- Tarjetas: alta, edición y baja. Bloquea la baja si la tarjeta tiene compras activas; ofrece archivarla o borrar sus compras.
- Backup: exportar e importar.
- Versión de la app.

### Estado vacío

Sin tarjetas, Inicio muestra una guía: "Agregá tu primera tarjeta" y luego "Cargá una compra".

## 7. Manejo de errores y datos

- **Validación:** los esquemas zod de `domain/schemas.ts` se usan en formularios e importación. Los errores se muestran junto al campo, en español.
- **Persistencia:** al iniciar se llama a `navigator.storage.persist()`. Si IndexedDB no está disponible, se muestra un banner fijo: "No se pueden guardar datos en este navegador (¿modo incógnito?)".
- **Recordatorio de backup:** banner si `lastBackupAt` es nulo o tiene más de 30 días, y hay datos cargados.
- **Export:** archivo JSON `{ app: "cuotas-app", schemaVersion, exportedAt, data: {...todas las tablas} }`. Se descarga como `cuotas-backup-YYYY-MM-DD.json`. Actualiza `lastBackupAt`.
- **Import:**
  1. Parsear y validar con zod.
  2. Si `schemaVersion` es menor, migrar. Si es mayor, rechazar con "Backup de una versión más nueva de la app".
  3. Mostrar resumen (cantidades por entidad) y pedir confirmación.
  4. Antes de reemplazar, descargar automáticamente un backup del estado actual.
  5. Reemplazar todas las tablas en una transacción.
- **Migraciones:** versiones de Dexie (`db.version(n).upgrade(...)`) y migradores del backup en `backup.ts`, en ambos casos con la misma numeración de `schemaVersion`.
- **Errores inesperados:** un error boundary a nivel app con el mensaje "Algo salió mal" y los botones "Recargar" y "Exportar backup".

## 8. PWA y deploy

- `vite-plugin-pwa` con `registerType: "prompt"`. Cuando hay versión nueva aparece el aviso "Actualización disponible · Recargar".
- Manifest: nombre "Cuotas", íconos 192/512 y maskable, `display: standalone`, colores de tema claro y oscuro.
- Todo funciona offline, porque no hay red en v1.
- Repositorio en GitHub. Un workflow de GitHub Actions corre en cada push a `main`: lint → typecheck → tests → build → deploy a GitHub Pages. Se configura `base` de Vite según el nombre del repo.

## 9. Testing

| Capa | Herramienta | Cobertura esperada |
|---|---|---|
| `domain/` | Vitest (TDD) | todas las reglas de 5.x; casos borde: cambio de año, 1 cuota, 72 cuotas, cierre 31 en febrero, compra el día del cierre, `dueDay` ausente, `dueDay` < `closingDay`, compras terminadas, multi-moneda |
| `data/` | Vitest + `fake-indexeddb` | CRUD, borrado lógico excluido de `list`, `subscribe`, backup ida y vuelta, rechazo de versión mayor |
| `features/` | Testing Library | formulario de compra (toggle total/cuota, sugerencia de mes, validación) y vista previa |
| e2e | Playwright (viewport móvil) | crear tarjeta → cargar compra → verla en Inicio y en Compras |

Calidad: TypeScript `strict`, ESLint y Prettier. El CI falla ante cualquier error.

## 10. Evolución prevista

- **v2 (gastos reales):** nueva entidad `Expense { amount, currency, category, date }` y una vista real vs presupuesto por categoría. No requiere cambios en el modelo existente.
- **v3 (nube):** implementación de `Repository` sobre Supabase, auth y sincronización por `updatedAt`/`deletedAt`. Los UUID generados en el cliente evitan colisiones.
- **Moneda:** agregar la cotización como entidad para mostrar un total consolidado opcional.
