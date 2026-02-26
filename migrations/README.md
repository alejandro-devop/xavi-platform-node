# 📦 Database Migrations

Este directorio contiene todas las migraciones de base de datos del proyecto.

## 📖 Documentación Completa

Lee la **[Guía Completa de Migraciones](../docs/MIGRATIONS_GUIDE.md)** para documentación detallada.

## ⚡ Comandos Rápidos

```bash
# Ver estado de migraciones
npm run migrate:status

# Ejecutar migraciones pendientes
npm run migrate

# Crear nueva migración
npm run migrate:create nombre_descriptivo

# Hacer rollback del último batch
npm run migrate:rollback

# Hacer rollback de N batches
npm run migrate:rollback 2
```

## 📝 Formato de Archivo

Todas las migraciones deben seguir este formato:

```sql
-- UP
-- Migration: descripcion
-- Created: 2026-02-26

-- Aquí va el SQL para aplicar cambios
CREATE TABLE ...


-- DOWN

-- Aquí va el SQL para revertir cambios
DROP TABLE ...
```

## ⚠️ Importante

- **NUNCA** modifiques migraciones ya aplicadas en producción
- **SIEMPRE** incluye sección UP y DOWN
- **SIEMPRE** prueba el rollback antes de commitear
- Usa nombres descriptivos: `add_user_avatar`, `create_posts_table`

## 🚀 Flujo de Trabajo

1. `npm run migrate:create mi_cambio`
2. Edita el archivo generado
3. `npm run migrate` (aplicar)
4. `npm run migrate:rollback` (probar rollback)
5. `npm run migrate` (volver a aplicar)
6. `git commit`
