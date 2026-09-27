// El historial de categorías contra un Postgres local desechable, como
// wallet-clean-slate.it.ts (mismas instrucciones y la misma guardia: esto hace
// TRUNCATE).
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
const { walletCategoryHistoryService } = require(
  `${REPO}/src/services/wallet-category-history.service`
);

const pool = new Pool({ connectionString: URL_LOCAL });
const q = async (sql: string, p: unknown[] = []) => (await pool.query(sql, p)).rows;

async function main() {
  require(`${REPO}/src/shared/database/drizzle`).initializeDrizzle();
  await q(
    'TRUNCATE wallet_expenses, wallet_scheduled_expenses, wallet_expense_categories, wallet_wallets, users RESTART IDENTITY CASCADE'
  );
  await q(`INSERT INTO users (id, email, password, name) VALUES (1, 'a@t.dev', 'x', 'A'), (2, 'b@t.dev', 'x', 'B')`);
  const [w] = await q(
    `INSERT INTO wallet_wallets (id, user_id, name) VALUES (gen_random_uuid(), 1, 'B') RETURNING id`
  );
  const [w2] = await q(
    `INSERT INTO wallet_wallets (id, user_id, name) VALUES (gen_random_uuid(), 2, 'C') RETURNING id`
  );
  const cat = async (user: number, name: string) =>
    (
      await q(
        `INSERT INTO wallet_expense_categories (id, user_id, name, type) VALUES (gen_random_uuid(), $1, $2, 'expense') RETURNING id`,
        [user, name]
      )
    )[0].id as string;
  const servicios = await cat(1, 'Servicios');
  const hogar = await cat(1, 'Hogar');
  const ajena = await cat(2, 'Ajena');

  const gasto = (user: number, wallet: string, desc: string, category: string | null, date: string) =>
    q(
      `INSERT INTO wallet_expenses (id, user_id, wallet_id, category_id, description, date, debit)
       VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, 100)`,
      [user, wallet, category, desc, date]
    );
  await gasto(1, w.id, 'Arriendo', servicios, '2026-07-26');
  await gasto(1, w.id, '  ARRIENDO ', servicios, '2026-08-26');
  await gasto(1, w.id, 'Mercado', hogar, '2026-09-20');
  await gasto(1, w.id, 'Sin categoría', null, '2026-09-21');
  await gasto(2, w2.id, 'Arriendo', ajena, '2026-09-25');

  // Una serie mensual de tres meses: cuenta una sola vez.
  const [padre] = await q(
    `INSERT INTO wallet_scheduled_expenses (id, user_id, wallet_id, category_id, amount, description, due_date, repeat_type)
     VALUES (gen_random_uuid(), 1, $1, $2, 100, 'Arriendo', '2026-09-26', 'monthly') RETURNING id`,
    [w.id, servicios]
  );
  for (const mes of ['10', '11']) {
    await q(
      `INSERT INTO wallet_scheduled_expenses (id, user_id, wallet_id, parent_id, category_id, amount, description, due_date, repeat_type)
       VALUES (gen_random_uuid(), 1, $1, $2, $3, 100, 'Arriendo', $4, 'monthly')`,
      [w.id, padre.id, servicios, `2026-${mes}-26`]
    );
  }

  const history = await walletCategoryHistoryService.history(1);
  assert.deepEqual(history, [
    { description: 'arriendo', categoryId: servicios, uses: 3, lastUsed: '2026-11-26' },
    { description: 'mercado', categoryId: hogar, uses: 1, lastUsed: '2026-09-20' },
  ]);
  console.log('wallet-category-history: OK');
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
