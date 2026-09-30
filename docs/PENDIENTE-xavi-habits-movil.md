# Pendiente para XaviHabits móvil (2026-09-30)

Trabajo del backend que salió al construir la app Flutter
(`alejandro-devop/xavi-habits-flutter`). La app no parchea nada de esto desde
el cliente: se comporta igual que la web y espera el arreglo aquí.

## 1. Validadores de identidad — empezado en esta rama

**Síntoma:** elegir una identidad desde un hito no se completa, ni en la web ni
en el móvil. El propósito se crea sin la evidencia y el enlace al hábito falla
con «Validation failed».

**Causa** (`src/validators/schemas/habit.schemas.ts`):
- `habitPurposeInputSchema` no declaraba `description` y Zod la descartaba.
- `habitPurposeEditInputSchema` tampoco la declaraba, y su `refine` no la
  contaba como campo editable («At least one field required» si iba sola).
- `habitEditFields` no incluía `purposeId`, así que `habitEdit({id, purposeId})`
  sin otro campo se rechazaba.

**Hecho en esta rama:** los cuatro cambios en ese archivo (5 líneas). El
servicio (`habit-purpose.service.ts`) ya guardaba `description`.

**Falta:**
- Pruebas en `tests/unit/validators/habit.schemas.test.ts`: `description` pasa
  en add y edit; edit con solo `description` es válido; `habitEdit` con solo
  `{id, purposeId}` es válido.
- `npm test`, merge y despliegue en Render.
- Probar de punta a punta: en la app, marcar un hábito sin propósito hasta un
  hito, elegir una identidad y comprobar que el propósito guarda la línea
  «Ganado el YYYY-MM-DD · racha7 · …» y queda enlazado.

## 2. Objetivo de sueño aparte (D-S6 del tracker del sueño)

El arco de «Sueño» se mide contra un objetivo que se configura aparte de la
noche planeada. Hace falta un campo nuevo en `user_settings` (por ejemplo
`vida_sleep_goal_minutes`, entero, nulo = sin objetivo), su migración, y
exponerlo en `UserSettings` y `UpdateUserSettingsInput`. Detalle en
`xavi-habits-flutter/docs/fases/15-tracker-sueno.md`.

## 3. Purgar las noches viejas (D-S3)

El usuario decidió purgar las filas de `sleep_logs` del módulo de Sueño que se
borró de la web (anteriores al 2026-09-22). Es un borrado en producción: hacerlo
con un script o migración revisable, con un `SELECT count(*)` antes, y nunca
desde la app.

## 4. `sleep_date` depende de la zona horaria del proceso

El validador convierte `'YYYY-MM-DD'` en medianoche UTC y la columna la guarda
en hora local: con el proceso en America/Bogota, `sleepDate "2026-09-23"` se
guarda como el 22 y el filtro de `sleepLogs` se corre un día. En producción
(UTC) no pasa. Arreglo sugerido: tratar `sleep_date` como fecha pura de punta a
punta, o fijar `TZ=UTC` en el proceso.

## 5. Otros hallazgos (anotados, sin decidir)

- `activity_day_plan_items` tiene `UNIQUE (user_id, activity_id, date)`: una
  actividad no puede estar dos veces en el plan del día, aunque la plantilla sí
  lo admite. Fallan `activityDayPlanSet` y `activityDayPlanItemAdd`.
- Un salvavidas en un día que ya tiene registro inserta una segunda fila en
  `habit_logs`.
- El salvavidas solo se acepta para hoy o ayer con el «hoy» del servidor en UTC.
- Un alta de seguimiento sin `count` guarda `count: 1` también en hábitos de
  tiempo y booleanos.
- `sleepLogAdd` con fecha repetida responde error interno (23505) en vez de un
  error de validación.
