# 📚 Sistema de Migraciones de Base de Datos

## 🎯 Visión General

Este proyecto utiliza un sistema de migraciones robusto con soporte completo para:

- ✅ Migraciones UP (aplicar cambios)
- ✅ Migraciones DOWN (revertir cambios/rollback)
- ✅ Sistema de tracking por batches
- ✅ Ejecución automática en Docker
- ✅ Transacciones seguras con rollback automático en errores
- ✅ Numeración secuencial automática

## 📋 Comandos Disponibles

### Ver Estado de Migraciones

```bash
npm run migrate:status
```

Muestra:

- Total de migraciones encontradas
- Cuántas están ejecutadas y cuántas pendientes
- Lista detallada de cada migración con su estado
- Resumen de batches

**Ejemplo de salida:**

```
📊 Migration Status
═══════════════════════════════════════════════════════════

📦 Database: xavi_db
📝 Total migrations found: 14
✅ Executed: 13
⏳ Pending: 1

Status | Batch | Migration
───────┼───────┼─────────────────────────────────────────────
   ✅  │  001  │ 001_create_users_table.sql (2024-01-15)
   ✅  │  001  │ 002_create_tokens_table.sql (2024-01-15)
   ⏳  │   -   │ 014_example_with_rollback.sql

📦 Batches (1 total):
   Batch 1: 13 migration(s)

💡 Run "npm run migrate" to execute 1 pending migration(s)
```

---

### Ejecutar Migraciones Pendientes

```bash
npm run migrate
```

- Ejecuta todas las migraciones que aún no se han aplicado
- Cada ejecución crea un nuevo "batch"
- Si una migración falla, hace rollback automático

**Ejemplo de salida:**

```
🔄 Starting migrations...
📍 Connecting to database...
⏭️  Skipping 001_create_users_table.sql (already executed)
⏭️  Skipping 002_create_tokens_table.sql (already executed)
🔧 Running 014_example_with_rollback.sql...
✅ 014_example_with_rollback.sql completed (batch 2)
✅ Successfully ran 1 migration(s) in batch 2
```

---

### Crear Nueva Migración

```bash
npm run migrate:create <nombre_de_la_migracion>
```

**Ejemplo:**

```bash
npm run migrate:create add_user_preferences
```

Esto crea un archivo: `migrations/014_add_user_preferences.sql`

**Contenido del archivo generado:**

```sql
-- UP
-- Migration: add_user_preferences
-- Created: 2026-02-26T10:30:00.000Z

-- Add your UP migration here
-- Example:
-- CREATE TABLE example (
--   id UUID PRIMARY KEY,
--   name VARCHAR(255) NOT NULL,
--   created_at TIMESTAMP NOT NULL DEFAULT NOW()
-- );


-- DOWN

-- Add your DOWN migration here (to reverse the UP migration)
-- Example:
-- DROP TABLE IF EXISTS example;
```

**Reglas para nombres:**

- Solo minúsculas
- Solo letras, números y guiones bajos
- Ejemplos válidos: `add_user_settings`, `create_posts_table`, `add_email_index`
- Ejemplos inválidos: `AddUser`, `add-user`, `add user`

---

### Hacer Rollback

```bash
npm run migrate:rollback [steps]
```

Revierte las migraciones del último batch (o múltiples batches).

**Ejemplos:**

```bash
# Revertir el último batch
npm run migrate:rollback

# Revertir los últimos 2 batches
npm run migrate:rollback 2

# Revertir todos los batches
npm run migrate:rollback 999
```

**Ejemplo de salida:**

```
🔄 Rolling back last 1 batch(es)...
📍 Connecting to database...
📦 Rolling back batches: 2
📝 Found 1 migration(s) to rollback

🔧 Rolling back 014_example_with_rollback.sql...
✅ 014_example_with_rollback.sql rolled back successfully (batch 2)

✅ Successfully rolled back 1 migration(s)
```

---

### Reiniciar Base de Datos (Fresh)

```bash
npm run migrate:fresh
```

Hace rollback de TODAS las migraciones y las vuelve a ejecutar desde cero.

⚠️ **ADVERTENCIA: Esto borra todos los datos de la base de datos!**

---

## 📝 Estructura de una Migración

Todas las migraciones nuevas deben seguir este formato:

```sql
-- UP
-- Migration: descripcion_del_cambio
-- Created: 2026-02-26
-- Description: Descripción opcional más detallada

-- Aquí va el SQL que aplica el cambio
CREATE TABLE user_preferences (
  id UUID PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  theme VARCHAR(50) DEFAULT 'light',
  notifications_enabled BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_user_preferences_user_id ON user_preferences(user_id);


-- DOWN

-- Aquí va el SQL que revierte el cambio
DROP TABLE IF EXISTS user_preferences;
```

### Reglas Importantes

1. **Separador obligatorio:** Debes tener una línea con `-- DOWN` (o `--DOWN`) que separe las secciones UP y DOWN

2. **Sección UP:** Define los cambios a aplicar (crear tablas, agregar columnas, etc.)

3. **Sección DOWN:** Define cómo revertir esos cambios (eliminar tablas, quitar columnas, etc.)

4. **Idempotencia:** Usa `IF NOT EXISTS`, `IF EXISTS` cuando sea apropiado:

   ```sql
   CREATE TABLE IF NOT EXISTS ...
   DROP TABLE IF EXISTS ...
   ALTER TABLE ... ADD COLUMN IF NOT EXISTS ...
   ```

5. **Orden inverso:** En DOWN, deshaz las operaciones en orden inverso:

   ```sql
   -- UP
   CREATE TABLE A;
   CREATE TABLE B REFERENCES A;

   -- DOWN
   DROP TABLE IF EXISTS B; -- Primero B
   DROP TABLE IF EXISTS A; -- Luego A
   ```

---

## 🐳 Ejecución Automática en Docker

Las migraciones se ejecutan automáticamente cuando:

1. **Inicias el contenedor de desarrollo:**

   ```bash
   docker compose up
   ```

2. **Despliegas a producción** (Cloud Run, etc.)

El proceso es:

1. El contenedor inicia
2. Espera a que PostgreSQL esté listo
3. Ejecuta `npm run migrate`
4. Si hay error, el contenedor falla (no inicia la app con DB inconsistente)
5. Si todo OK, inicia la aplicación

**Ver logs de migraciones en Docker:**

```bash
docker compose logs app
```

---

## 🗂️ Sistema de Batches

Cada vez que ejecutas `npm run migrate`, todas las migraciones aplicadas en esa ejecución se agrupan en un "batch".

**Ventajas:**

- **Rollback granular:** Puedes revertir solo las migraciones de un deploy específico
- **Trazabilidad:** Sabes qué migraciones se aplicaron juntas
- **Seguridad:** No reviertes accidentalmente migraciones antiguas

**Ejemplo:**

```
# Primera ejecución (batch 1)
001_create_users.sql
002_create_tokens.sql
003_create_habits.sql

# Deploy con nuevos features (batch 2)
004_add_user_preferences.sql
005_add_habit_tracking.sql

# Si el deploy 2 tiene problemas:
npm run migrate:rollback
# Solo revierte 004 y 005, deja 001, 002, 003 intactas
```

---

## 📊 Schema de Tracking

La tabla `migrations` se crea automáticamente:

```sql
CREATE TABLE migrations (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) UNIQUE NOT NULL,
  batch INTEGER NOT NULL DEFAULT 1,
  executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Campos:**

- `name`: Nombre del archivo de migración
- `batch`: Número de batch (agrupa migraciones ejecutadas juntas)
- `executed_at`: Timestamp de cuándo se ejecutó

---

## 🚨 Manejo de Errores

### Si una migración falla al aplicarse

El sistema hace rollback automático:

```bash
🔧 Running 014_bad_migration.sql...
❌ Failed to run 014_bad_migration.sql:
   column "nonexistent" does not exist

❌ Migration failed: [error details]
```

**Qué sucede:**

1. Se ejecuta `ROLLBACK` en la transacción
2. La migración NO se registra en la tabla `migrations`
3. El proceso termina con código de error
4. En Docker, el contenedor no inicia

**Solución:**

1. Corrige el SQL en el archivo de migración
2. Vuelve a ejecutar `npm run migrate`

### Si una migración no tiene DOWN

Al hacer rollback:

```bash
🔧 Rolling back 005_old_migration.sql...
⚠️  No DOWN migration found for 005_old_migration.sql, skipping...
```

La entrada se elimina de la tabla `migrations` pero no se ejecuta ningún SQL de reversión.

---

## 🔍 Verificación de Integridad

### Verificar conexión a la base de datos

```bash
# En desarrollo local
npm run migrate:status

# En Docker
docker compose exec app npm run migrate:status
```

### Verificar que las migraciones están sincronizadas

Si trabajas en equipo, siempre verifica el estado antes de crear nuevas migraciones:

```bash
git pull
npm run migrate:status
npm run migrate  # Si hay pendientes
```

---

## 📖 Flujo de Trabajo Recomendado

### Para Desarrollo Local

1. **Verificar estado actual:**

   ```bash
   npm run migrate:status
   ```

2. **Crear nueva migración:**

   ```bash
   npm run migrate:create add_new_feature
   ```

3. **Editar el archivo de migración:**
   - Agregar SQL en sección UP
   - Agregar SQL de reversión en sección DOWN

4. **Aplicar migración:**

   ```bash
   npm run migrate
   ```

5. **Probar que funciona:**
   - Verifica que los cambios se aplicaron correctamente
   - Prueba la funcionalidad

6. **Probar rollback:**

   ```bash
   npm run migrate:rollback
   npm run migrate  # Volver a aplicar
   ```

7. **Commit:**
   ```bash
   git add migrations/
   git commit -m "feat: add [descripción] migration"
   ```

### Para Trabajo en Equipo

1. **Antes de crear migraciones nuevas:**

   ```bash
   git pull
   npm run migrate
   ```

2. **Nunca modifiques migraciones ya commiteadas:**
   - Si una migración ya está en `main`, NO la edites
   - Crea una nueva migración para corregir

3. **Comunicación:**
   - Si una migración afecta a otros, avisa al equipo
   - Documenta cambios importantes

### Para Producción

1. **Las migraciones se ejecutan automáticamente** al desplegar

2. **Si algo falla:**
   - El deploy falla (no se inicia con DB inconsistente)
   - Revisa los logs
   - Corrige y vuelve a desplegar

3. **Para hacer rollback en producción:**

   ```bash
   # Conéctate al contenedor/instancia
   gcloud run services proxy xavi-api --port=8080

   # Ejecuta rollback
   npm run migrate:rollback
   ```

---

## 🎓 Ejemplos Prácticos

### Ejemplo 1: Agregar columna a tabla existente

```sql
-- UP
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS avatar_url VARCHAR(500);

-- DOWN
ALTER TABLE users
  DROP COLUMN IF EXISTS avatar_url;
```

### Ejemplo 2: Crear tabla con relaciones

```sql
-- UP
CREATE TABLE posts (
  id UUID PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  content TEXT,
  published BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_posts_user_id ON posts(user_id);
CREATE INDEX idx_posts_published ON posts(published);

-- DOWN
DROP TABLE IF EXISTS posts;
```

### Ejemplo 3: Modificar datos existentes

```sql
-- UP
-- Migrar usuarios antiguos al nuevo formato
UPDATE users
  SET email = LOWER(email)
  WHERE email != LOWER(email);

-- DOWN
-- No podemos revertir exactamente, pero documentamos
-- Este cambio no se puede revertir de forma segura
-- Se normalizaron emails a minúsculas
```

### Ejemplo 4: Crear índice

```sql
-- UP
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_habits_user_id_status
  ON habits(user_id, status);

-- DOWN
DROP INDEX IF EXISTS idx_habits_user_id_status;
```

---

## 🔧 Troubleshooting

### "Migration table not found"

**Solución:** Ejecuta `npm run migrate` para crear la tabla.

### "Migration file not found during rollback"

**Solución:** El archivo de migración fue eliminado pero está registrado en la DB.

```sql
-- Eliminar manualmente de la DB
DELETE FROM migrations WHERE name = '014_missing_migration.sql';
```

### "Cannot execute DOWN migration"

**Solución:** La migración no tiene sección DOWN. Edita el archivo y agrega la sección DOWN.

### "Database connection refused"

**Solución:** Verifica que PostgreSQL esté corriendo y las credenciales sean correctas.

```bash
# Verificar Docker
docker compose ps

# Verificar .env
cat .env | grep DB_
```

---

## 🎯 Mejores Prácticas

### ✅ Hacer

- Siempre incluir sección UP y DOWN
- Usar transacciones (automático)
- Probar rollback antes de commitear
- Nombres descriptivos de migraciones
- Usar `IF NOT EXISTS` / `IF EXISTS`
- Documentar cambios complejos con comentarios
- Crear índices necesarios
- Migrar datos cuando cambies estructuras

### ❌ Evitar

- Modificar migraciones ya aplicadas en producción
- Olvidar la sección DOWN
- Migraciones sin rollback posible sin documentar
- Hacer cambios destructivos sin backup
- Asumir estado de datos (usar conditional updates)
- Nombres genéricos: `update.sql`, `fix.sql`

---

## 📞 Comandos de Referencia Rápida

```bash
# Ver estado
npm run migrate:status

# Aplicar pendientes
npm run migrate

# Crear nueva
npm run migrate:create nombre_descriptivo

# Rollback último batch
npm run migrate:rollback

# Rollback múltiples batches
npm run migrate:rollback 3

# Reiniciar desde cero (⚠️ PELIGROSO)
npm run migrate:fresh

# Ver logs en Docker
docker compose logs app -f
```

---

## 🔗 Recursos Adicionales

- [Drizzle ORM Docs](https://orm.drizzle.team/)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Deployment Guide](./DEPLOYMENT_GUIDE.md)

---

_Última actualización: Febrero 26, 2026_
