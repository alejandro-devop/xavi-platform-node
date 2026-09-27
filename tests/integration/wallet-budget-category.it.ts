// La categoría opcional de un presupuesto (migración 072), contra un Postgres
// local desechable, como wallet-clean-slate.it.ts (mismas instrucciones y la
// misma guardia: esto hace TRUNCATE).
import assert from 'node:assert/strict';

const URL_LOCAL = process.env.DATABASE_URL ?? '';
if (!/^postgres(ql)?:\/\/[^@]*@(localhost|127\.0\.0\.1)[:/]/.test(URL_LOCAL)) {
  console.error('DATABASE_URL tiene que ser un Postgres local: esta prueba hace TRUNCATE.');
  process.exit(2);
}

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { Pool } = require('pg');
import path from 'node:path';
const REPO = path.resolve(__dirname, '../..');
const { budgetService } = require(`${REPO}/src/services/budget.service`);

const pool = new Pool({ connectionString: URL_LOCAL });
const q = async (sql: string, p: unknown[] = []) => (await pool.query(sql, p)).rows;

async function main() {
  require(`${REPO}/src/shared/database/drizzle`).initializeDrizzle();
  await q(
    'TRUNCATE wallet_budgets, wallet_expense_categories, wallet_wallets, users RESTART IDENTITY CASCADE'
  );
  await q(`INSERT INTO users (id, email, password, name) VALUES (1, 'a@t.dev', 'x', 'A'), (2, 'b@t.dev', 'x', 'B')`);
  const [w] = await q(
    `INSERT INTO wallet_wallets (id, user_id, name) VALUES (gen_random_uuid(), 1, 'B') RETURNING id`
  );
  const cat = async (user: number, name: string) =>
    (
      await q(
        `INSERT INTO wallet_expense_categories (id, user_id, name, type) VALUES (gen_random_uuid(), $1, $2, 'expense') RETURNING id`,
        [user, name]
      )
    )[0].id as string;
  const comida = await cat(1, 'Comida');
  const ajena = await cat(2, 'Ajena');

  const base = { walletId: w.id, name: 'Comida del mes', amount: 500000, startDate: '2026-10-01', endDate: '2026-10-31' };

  // Sin categoría: como hasta ahora.
  const sin = await budgetService.createBudget(1, { ...base, name: 'Sin categoría' });
  assert.equal(sin.categoryId, null);

  const b = await budgetService.createBudget(1, { ...base, categoryId: comida });
  assert.equal(b.categoryId, comida);

  // No se puede usar la categoría de otro usuario.
  await assert.rejects(
    budgetService.createBudget(1, { ...base, name: 'Ajeno', categoryId: ajena }),
    /permission/
  );

  // null la quita; no mandarla la deja como está.
  const igual = await budgetService.updateBudget(b.id, 1, { name: 'Comida octubre' });
  assert.equal(igual.categoryId, comida);
  const quitada = await budgetService.updateBudget(b.id, 1, { categoryId: null });
  assert.equal(quitada.categoryId, null);

  // Borrar la categoría no borra el presupuesto.
  await budgetService.updateBudget(b.id, 1, { categoryId: comida });
  await q('DELETE FROM wallet_expense_categories WHERE id = $1', [comida]);
  const [fila] = await q('SELECT category_id FROM wallet_budgets WHERE id = $1', [b.id]);
  assert.equal(fila.category_id, null);

  console.log('wallet-budget-category: OK');
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await require(`${REPO}/src/shared/database/drizzle`).closeDrizzle();
    await pool.end();
    process.exit();
  });
