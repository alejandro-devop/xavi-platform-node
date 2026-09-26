// Borrar una serie de programados que ya tiene pagos: `onlyPending`.
// Contra un Postgres local desechable, como wallet-clean-slate.it.ts (mismas
// instrucciones y la misma guardia: esto hace TRUNCATE).
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
const { scheduledExpenseService } = require(`${REPO}/src/services/scheduled-expense.service`);

const pool = new Pool({ connectionString: URL_LOCAL });
const q = async (sql: string, p: unknown[] = []) => (await pool.query(sql, p)).rows;

async function sembrar(padrePagado: boolean) {
  await q('TRUNCATE wallet_scheduled_expenses, wallet_wallets, users RESTART IDENTITY CASCADE');
  await q(`INSERT INTO users (id, email, password, name) VALUES (1, 'a@t.dev', 'x', 'A')`);
  const [w] = await q(
    `INSERT INTO wallet_wallets (id, user_id, name) VALUES (gen_random_uuid(), 1, 'B') RETURNING id`
  );
  const [padre] = await q(
    `INSERT INTO wallet_scheduled_expenses (id, user_id, wallet_id, amount, description, due_date, is_paid, repeat_type)
     VALUES (gen_random_uuid(), 1, $1, 100, 'Arriendo', '2026-06-26', $2, 'monthly') RETURNING id`,
    [w.id, padrePagado]
  );
  for (const [mes, pagado] of [
    ['07', true],
    ['08', false],
    ['09', false],
  ] as const) {
    await q(
      `INSERT INTO wallet_scheduled_expenses (id, user_id, wallet_id, parent_id, amount, description, due_date, is_paid, repeat_type)
       VALUES (gen_random_uuid(), 1, $1, $2, 100, 'Arriendo', $3, $4, 'monthly')`,
      [w.id, padre.id, `2026-${mes}-26`, pagado]
    );
  }
  return padre.id as string;
}

const filas = () =>
  q(
    `SELECT due_date::text AS d, is_paid, parent_id FROM wallet_scheduled_expenses ORDER BY due_date`
  );

async function main() {
  require(`${REPO}/src/shared/database/drizzle`).initializeDrizzle();
  let fallos = 0;
  const caso = async (nombre: string, fn: () => Promise<void>) => {
    try {
      await fn();
      console.log(`✓ ${nombre}`);
    } catch (e) {
      fallos++;
      console.log(`✗ ${nombre}\n   ${(e as Error).message}`);
    }
  };

  await caso('sin onlyPending, una serie con pagos se sigue negando', async () => {
    const padre = await sembrar(true);
    await assert.rejects(
      scheduledExpenseService.bulkDeleteScheduledExpenses(1, { parentId: padre }),
      /already paid/
    );
    assert.equal((await filas()).length, 4);
  });

  await caso('onlyPending con el padre pagado: quedan los dos pagados', async () => {
    const padre = await sembrar(true);
    await scheduledExpenseService.bulkDeleteScheduledExpenses(1, {
      parentId: padre,
      onlyPending: true,
    });
    const r = await filas();
    assert.deepEqual(
      r.map((x) => [x.d, x.is_paid]),
      [
        ['2026-06-26', true],
        ['2026-07-26', true],
      ]
    );
  });

  await caso('onlyPending con el padre pendiente: el hijo pagado no cae en cascada', async () => {
    const padre = await sembrar(false);
    await scheduledExpenseService.bulkDeleteScheduledExpenses(1, {
      parentId: padre,
      onlyPending: true,
    });
    const r = await filas();
    assert.deepEqual(
      r.map((x) => [x.d, x.is_paid, x.parent_id]),
      [['2026-07-26', true, null]]
    );
  });

  await caso('sin pagos, borrar la serie se la lleva entera', async () => {
    const padre = await sembrar(false);
    await q(`UPDATE wallet_scheduled_expenses SET is_paid = false`);
    await scheduledExpenseService.bulkDeleteScheduledExpenses(1, { parentId: padre });
    assert.equal((await filas()).length, 0);
  });

  await pool.end();
  await require(`${REPO}/src/shared/database/drizzle`).closeDrizzle();
  console.log(fallos ? `${fallos} fallos` : 'todo en verde');
  process.exit(fallos ? 1 : 0);
}

main();
