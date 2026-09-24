-- UP

-- La hora de reloj a la que ocurrió (o se registró) el seguimiento de un hábito.
-- Sirve para leer a qué horas se cae un hábito; la métrica se deriva en cliente.
--
-- **Nula, sin DEFAULT y sin backfill, y es lo más importante de esta migración.**
-- Un DEFAULT '00:00' —o rellenarla hacia atrás desde created_at, que está en UTC—
-- fabricaría un pico falso a medianoche en esa lectura y nadie lo notaría hasta
-- tenerlo pintado. Las filas anteriores se quedan NULL: «sin hora» es un dato,
-- no un hueco que haya que tapar.
--
-- Ojo con el falso amigo: habit_logs.time ya existe y es **duración en minutos**.
-- time_of_day es un reloj de pared. Conviven en la misma fila y no se tocan.
--
-- Se guarda y se devuelve la misma cadena local «HH:mm», sin zona horaria y sin
-- convertir a UTC, igual que vida_night_bed_time (migración 068).
ALTER TABLE habit_logs
  ADD COLUMN IF NOT EXISTS time_of_day TIME;

-- DOWN

-- ALTER TABLE habit_logs DROP COLUMN IF EXISTS time_of_day;
