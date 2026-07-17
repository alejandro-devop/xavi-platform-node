-- UP
-- Antes, un fallo en la frontera archivaba todos los habit_logs anteriores
-- (completed_date < fecha del fallo). Eso ocultaba el historial en week/myDay.
-- Restaura logs que quedaron archivados por un fallo posterior del mismo hábito.
-- No toca logs archivados manualmente sin un fallo posterior.

UPDATE habit_logs hl
SET archived = FALSE,
    updated_at = NOW()
WHERE hl.archived = TRUE
  AND EXISTS (
    SELECT 1
    FROM habit_logs fail
    WHERE fail.habit_id = hl.habit_id
      AND fail.is_failed = TRUE
      AND fail.completed_date > hl.completed_date
  );

-- DOWN
-- No se re-archivan: el comportamiento de auto-archivo al fallar ya no existe.
