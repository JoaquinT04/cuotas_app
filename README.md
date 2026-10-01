# Cuotas

PWA para ver cuotas de tarjetas de crédito, presupuesto mensual y cuánto queda para invertir.
Los datos se guardan sólo en el dispositivo (IndexedDB). Hacé backups desde Ajustes.

## Desarrollo

    npm install
    npm run dev        # servidor local
    npm test           # tests unitarios y de componentes
    npm run e2e        # test end-to-end (Playwright)
    npm run lint && npm run typecheck

## Deploy (GitHub Pages)

1. Crear un repo en GitHub y hacer push de `main`.
2. En el repo: Settings → Pages → Source: **GitHub Actions**.
3. Cada push a `main` corre lint, typecheck, tests y e2e, y publica en `https://<usuario>.github.io/<repo>/`.

## Instalar en el celular

Abrir la URL en Chrome (Android) o Safari (iOS) → menú → **Agregar a pantalla de inicio**.
Funciona offline.

## Arquitectura

- `src/domain`: lógica pura (cuotas, cierre, presupuesto, proyección). Sin React ni DB.
- `src/data`: `Repository<T>` + Dexie. Para sincronizar en la nube (v3) se agrega otra implementación de `Repository`.
- `src/features`: pantallas. Sólo acceden a datos vía hooks de `src/app/hooks.ts`.

Spec: `docs/superpowers/specs/2026-09-30-cuotas-app-design.md`
