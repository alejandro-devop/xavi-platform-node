-- UP

-- Gastos anotados desde fuera de la app (Siri, la automatización de Apple Pay
-- en Atajos). Dos columnas nulas, sin backfill:
--
-- - source: de dónde vino ('apple_pay', 'siri', 'shortcut'). Nula = desde la
--   app, como todo lo anterior. La app lo enseña en la fila del gasto.
-- - capture_ref: un id que genera el teléfono por cada captura. Si el teléfono
--   reintenta (el servidor estaba dormido, se cortó la red), el mismo ref no
--   crea un segundo gasto. Único por usuario solo cuando existe.
ALTER TABLE wallet_expenses
  ADD COLUMN IF NOT EXISTS source VARCHAR(20),
  ADD COLUMN IF NOT EXISTS capture_ref VARCHAR(64);

CREATE UNIQUE INDEX IF NOT EXISTS wallet_expenses_user_capture_ref_uq
  ON wallet_expenses (user_id, capture_ref)
  WHERE capture_ref IS NOT NULL;

-- DOWN

-- DROP INDEX IF EXISTS wallet_expenses_user_capture_ref_uq;
-- ALTER TABLE wallet_expenses DROP COLUMN IF EXISTS capture_ref, DROP COLUMN IF EXISTS source;
