# ✅ Checklist: Completar Tests Unitarios

## Fase 1: Arreglar Infraestructura de Mocks ⚠️

- [ ] Leer `docs/FIXING_DRIZZLE_MOCKS.md` completamente
- [ ] Abrir `src/services/wallet.service.ts` y ver cómo usa Drizzle
- [ ] Actualizar `tests/helpers/mocks.ts`:
  - [ ] Agregar estructura `query.tableName.findFirst/findMany`
  - [ ] Arreglar chain de `insert().values().returning()`
  - [ ] Arreglar chain de `update().set().where().returning()`
  - [ ] Arreglar chain de `delete().where().returning()`
- [ ] Crear helpers: `mockInsertChain()`, `mockUpdateChain()`, `mockDeleteChain()`

## Fase 2: Arreglar Tests de Servicios

### Wallet Service

- [ ] Actualizar `tests/unit/services/wallet.service.test.ts`
- [ ] Cambiar `mockDb.select()...` por `mockDb.query.walletWallets.findFirst()`
- [ ] Usar helpers para insert/update/delete chains
- [ ] Ejecutar: `npm test wallet.service`
- [ ] Verificar: todos los tests pasan ✅

### Expense Category Service

- [ ] Actualizar `tests/unit/services/expense-category.service.test.ts`
- [ ] Aplicar mismo patrón que wallet
- [ ] Ejecutar: `npm test expense-category.service`
- [ ] Verificar: todos los tests pasan ✅

### Expense Service

- [ ] Actualizar `tests/unit/services/expense.service.test.ts`
- [ ] Aplicar mismo patrón + mocks de transacciones
- [ ] Mockear: `pool.query('BEGIN')`, `COMMIT`, `ROLLBACK`
- [ ] Ejecutar: `npm test expense.service`
- [ ] Verificar: todos los tests pasan ✅

## Fase 3: Validar Tests Existentes

- [ ] Ejecutar: `npm test auth.test`
  - [ ] Verificar: 8/8 tests pasan
- [ ] Ejecutar: `npm test auth.controller.test`
  - [ ] Verificar: 6/6 tests pasan
- [ ] Ejecutar: `npm test wallet.resolvers.test`
  - [ ] Verificar: 10/10 tests pasan

## Fase 4: Coverage y Reporte Final

- [ ] Ejecutar: `npm test`
  - [ ] Verificar: todos los tests (89) pasan
- [ ] Ejecutar: `npm run test:coverage`
  - [ ] Verificar: coverage >= 70% en todas las métricas
- [ ] Revisar reporte en `coverage/lcov-report/index.html`
- [ ] Capturar resultados en `docs/TEST_SUMMARY.md`

## Fase 5: Próximas Expansiones (Opcional)

### Tests de Validators (Fácil, 1 hora)

- [ ] Crear `tests/unit/validators/auth.validator.test.ts`
- [ ] Crear `tests/unit/validators/wallet.validator.test.ts`
- [ ] Probar: schemas válidos, inválidos, edge cases

### Tests de Utilities (Medio, 1-2 horas)

- [ ] JWT utilities (generate, verify, decode)
- [ ] Password utilities (hash, compare)
- [ ] ID generation utilities

### Más GraphQL Resolvers (Medio, 2-3 horas)

- [ ] Expense category resolvers
- [ ] Expense resolvers
- [ ] Probar: queries, mutations, nested resolvers

### Integration Tests (Difícil, futuro)

- [ ] Setup Docker Compose para DB de test
- [ ] Tests con DB real (no mocks)
- [ ] E2E tests de flujos completos

---

## 🎯 Objetivo Mínimo Viable

Para considerar la fase de tests unitarios completa:

✅ Todos los tests de servicios pasan (63 tests)  
✅ Todos los tests de resolvers pasan (10 tests)  
✅ Todos los tests de middleware pasan (8 tests)  
✅ Todos los tests de controllers pasan (6 tests)  
✅ Coverage >= 70% en branches, functions, lines, statements  
✅ CI/CD puede ejecutar `npm test` exitosamente

**Total: 89 tests pasando con 70%+ coverage**

---

## 📊 Tracking de Progreso

```bash
# Ver tests que fallan
npm test 2>&1 | grep "FAIL"

# Ver resumen de coverage
npm run test:coverage 2>&1 | grep -A10 "Coverage summary"

# Contar tests totales
grep -r "it('should" tests/ | wc -l
```

---

**Creado**: 2024-02-24  
**Tiempo estimado total**: 2-3 horas  
**Prioridad**: Alta (bloquea deployments con confianza)
