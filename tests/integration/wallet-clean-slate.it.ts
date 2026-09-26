// Prueba de integración del clean slate contra un Postgres **local y desechable**.
// No es de Jest (no la recoge `npm test`): necesita una base de verdad, porque lo
// que importa aquí son las cascadas y la transacción, y un mock no las tiene.
//
//   initdb -D /tmp/pg-cs -U postgres --auth=trust --locale=en_US.UTF-8
//   pg_ctl -D /tmp/pg-cs -o "-p 5433 -k /tmp" start
//   createdb -h localhost -p 5433 -U postgres clean_slate_test
//   export DATABASE_URL=postgres://postgres@localhost:5433/clean_slate_test
//   npx tsx scripts/migrate.ts
//   npx tsx tests/integration/wallet-clean-slate.it.ts
//
// **Nunca con el DATABASE_URL del .env**: esa es la base de producción (Neon), y
// esto hace TRUNCATE.
import assert from 'node:assert/strict';

// Antes de cargar nada del repo: esta prueba hace TRUNCATE.
const URL_LOCAL = process.env.DATABASE_URL ?? '';
if (!/^postgres(ql)?:\/\/[^@]*@(localhost|127\.0\.0\.1)[:/]/.test(URL_LOCAL)) {
  console.error('DATABASE_URL tiene que ser un Postgres local: esta prueba hace TRUNCATE.');
  process.exit(2);
}

const { Pool } = require('pg');

import path from 'node:path';
const REPO = path.resolve(__dirname, '../..');
const { walletCleanSlateService } = require(`${REPO}/src/services/wallet-clean-slate.service`);
const { walletCleanSlateInputSchema } = require(
  `${REPO}/src/validators/schemas/wallet-clean-slate.schemas`
);

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const q = async (sql: string, p: any[] = []) => (await pool.query(sql, p)).rows;
const n = async (sql: string, p: any[] = []) => Number((await q(sql, p))[0].c);

const TABLAS = [
  'wallet_credit_card_payments',
  'wallet_credit_card_charges',
  'wallet_credit_cards',
  'wallet_scheduled_expenses',
  'wallet_expenses',
  'wallet_transfers',
  'wallet_budget_closures',
  'wallet_budgets',
  'wallet_user_settings',
  'wallet_expense_categories',
  'wallet_wallets',
  'shopping_list_items',
  'shopping_lists',
  'items',
  'users',
];

async function sembrar() {
  await q(`TRUNCATE ${TABLAS.join(', ')} RESTART IDENTITY CASCADE`);
  for (const u of [1, 2]) {
    await q(`INSERT INTO users (id, email, password, name) VALUES ($1, $2, 'x', 'U')`, [
      u,
      `u${u}@t.dev`,
    ]);
    const [w1] = await q(
      `INSERT INTO wallet_wallets (id, user_id, name, initial_balance, balance) VALUES (gen_random_uuid(), $1, 'A', 100, 700) RETURNING id`,
      [u]
    );
    const [w2] = await q(
      `INSERT INTO wallet_wallets (id, user_id, name, initial_balance, balance) VALUES (gen_random_uuid(), $1, 'B', 50, 300) RETURNING id`,
      [u]
    );
    const [sys] = await q(
      `INSERT INTO wallet_expense_categories (id, user_id, name, type, is_system) VALUES (gen_random_uuid(), $1, 'Sistema', 'expense', true) RETURNING id`,
      [u]
    );
    const [cat] = await q(
      `INSERT INTO wallet_expense_categories (id, user_id, name, type) VALUES (gen_random_uuid(), $1, 'Comida', 'expense') RETURNING id`,
      [u]
    );
    await q(
      `INSERT INTO wallet_user_settings (user_id, credit_card_payment_category_id, period_cutoff_day) VALUES ($1, $2, 25)`,
      [u, cat.id]
    );
    const [bud] = await q(
      `INSERT INTO wallet_budgets (id, user_id, wallet_id, name, amount, balance, start_date, end_date) VALUES (gen_random_uuid(), $1, $2, 'Mes', 500, 420, '2026-09-01', '2026-09-30') RETURNING id`,
      [u, w1.id]
    );
    await q(
      `INSERT INTO wallet_budget_closures (id, budget_id, user_id, period_start, period_end, planned_amount, spent_amount, remaining_amount) VALUES (gen_random_uuid(), $1, $2, '2026-08-01', '2026-08-31', 500, 100, 400)`,
      [bud.id, u]
    );
    const [gasto] = await q(
      `INSERT INTO wallet_expenses (id, user_id, wallet_id, category_id, budget_id, date, description, debit) VALUES (gen_random_uuid(), $1, $2, $3, $4, '2026-09-10', 'Almuerzo', 80) RETURNING id`,
      [u, w1.id, cat.id, bud.id]
    );
    const [tr] = await q(
      `INSERT INTO wallet_transfers (id, user_id, from_wallet_id, to_wallet_id, amount, date, description) VALUES (gen_random_uuid(), $1, $2, $3, 20, '2026-09-11', 'Ahorro') RETURNING id`,
      [u, w1.id, w2.id]
    );
    await q(
      `INSERT INTO wallet_expenses (id, user_id, wallet_id, date, description, debit, is_outcome, transfer_id) VALUES (gen_random_uuid(), $1, $2, '2026-09-11', 'Ahorro', 20, true, $3)`,
      [u, w1.id, tr.id]
    );
    await q(
      `INSERT INTO wallet_expenses (id, user_id, wallet_id, date, description, credit, is_income, transfer_id) VALUES (gen_random_uuid(), $1, $2, '2026-09-11', 'Ahorro', 20, true, $3)`,
      [u, w2.id, tr.id]
    );
    await q(
      `INSERT INTO wallet_scheduled_expenses (id, user_id, wallet_id, category_id, amount, description, due_date, expense_id) VALUES (gen_random_uuid(), $1, $2, $3, 60, 'Internet', '2026-10-05', $4)`,
      [u, w1.id, cat.id, gasto.id]
    );
    const [card] = await q(
      `INSERT INTO wallet_credit_cards (id, user_id, name, credit_limit, current_debt, cutoff_day, payment_day) VALUES (gen_random_uuid(), $1, 'Visa', 1000, 250, 20, 5) RETURNING id`,
      [u]
    );
    await q(
      `INSERT INTO wallet_credit_card_charges (id, user_id, credit_card_id, category_id, description, amount, date) VALUES (gen_random_uuid(), $1, $2, $3, 'Cine', 300, '2026-09-12')`,
      [u, card.id, cat.id]
    );
    const [pagoGasto] = await q(
      `INSERT INTO wallet_expenses (id, user_id, wallet_id, category_id, date, description, debit) VALUES (gen_random_uuid(), $1, $2, $3, '2026-09-13', 'Pago Visa', 50) RETURNING id`,
      [u, w1.id, cat.id]
    );
    await q(
      `INSERT INTO wallet_credit_card_payments (id, user_id, credit_card_id, expense_id, amount, paid_date) VALUES (gen_random_uuid(), $1, $2, $3, 50, '2026-09-13')`,
      [u, card.id, pagoGasto.id]
    );
    const [lista] = await q(
      `INSERT INTO shopping_lists (id, user_id, name) VALUES (gen_random_uuid(), $1, 'Súper') RETURNING id`,
      [u]
    );
    const [item] = await q(
      `INSERT INTO items (id, user_id, name, price) VALUES (gen_random_uuid(), $1, 'Leche', 5) RETURNING id`,
      [u]
    );
    await q(`INSERT INTO items (id, user_id, name) VALUES (gen_random_uuid(), $1, 'Pan')`, [u]);
    await q(
      `INSERT INTO shopping_list_items (id, shopping_list_id, item_id) VALUES (gen_random_uuid(), $1, $2)`,
      [lista.id, item.id]
    );
  }
}

const cuenta = (tabla: string, u = 1) =>
  n(`SELECT count(*) c FROM ${tabla} WHERE user_id = $1`, [u]);

async function usuario2Intacto() {
  assert.equal(await cuenta('wallet_wallets', 2), 2);
  assert.equal(await cuenta('wallet_expenses', 2), 4);
  assert.equal(await cuenta('wallet_transfers', 2), 1);
  assert.equal(await cuenta('wallet_scheduled_expenses', 2), 1);
  assert.equal(await cuenta('wallet_budgets', 2), 1);
  assert.equal(await cuenta('wallet_expense_categories', 2), 2);
  assert.equal(await cuenta('wallet_credit_cards', 2), 1);
  assert.equal(await cuenta('wallet_credit_card_charges', 2), 1);
  assert.equal(await cuenta('wallet_credit_card_payments', 2), 1);
  assert.equal(await cuenta('shopping_lists', 2), 1);
  assert.equal(await cuenta('items', 2), 2);
  assert.equal(await n(`SELECT sum(balance) c FROM wallet_wallets WHERE user_id = 2`), 1000);
  assert.equal(await n(`SELECT current_debt c FROM wallet_credit_cards WHERE user_id = 2`), 250);
}

const casos: [string, () => Promise<void>][] = [
  [
    'solo transacciones: borra historial, no mueve saldos',
    async () => {
      const r = await walletCleanSlateService.cleanSlate(1, { transactions: true });
      assert.deepEqual(
        [r.transactions, r.transfers, r.creditCardCharges, r.creditCardPayments],
        [4, 1, 1, 1]
      );
      assert.equal(await cuenta('wallet_expenses'), 0);
      assert.equal(await cuenta('wallet_transfers'), 0);
      assert.equal(await cuenta('wallet_credit_card_charges'), 0);
      assert.equal(await cuenta('wallet_credit_card_payments'), 0);
      assert.equal(await n(`SELECT sum(balance) c FROM wallet_wallets WHERE user_id = 1`), 1000);
      assert.equal(
        await n(`SELECT current_debt c FROM wallet_credit_cards WHERE user_id = 1`),
        250
      );
      assert.equal(await n(`SELECT balance c FROM wallet_budgets WHERE user_id = 1`), 420);
      // El programado sobrevive, sin su gasto enlazado.
      assert.equal(
        await n(
          `SELECT count(*) c FROM wallet_scheduled_expenses WHERE user_id = 1 AND expense_id IS NULL`
        ),
        1
      );
      assert.equal(await cuenta('wallet_wallets'), 2);
    },
  ],
  [
    'saldos a cero en billeteras y tarjetas, sin borrar nada',
    async () => {
      const r = await walletCleanSlateService.cleanSlate(1, {
        wallets: 'RESET_BALANCES',
        creditCards: 'RESET_BALANCES',
      });
      assert.equal(r.walletsReset, 2);
      assert.equal(r.creditCardsReset, 1);
      assert.equal(
        await n(
          `SELECT count(*) c FROM wallet_wallets WHERE user_id = 1 AND balance = 0 AND initial_balance = 0`
        ),
        2
      );
      assert.equal(await n(`SELECT current_debt c FROM wallet_credit_cards WHERE user_id = 1`), 0);
      assert.equal(
        await n(`SELECT credit_limit c FROM wallet_credit_cards WHERE user_id = 1`),
        1000
      );
      assert.equal(await cuenta('wallet_expenses'), 4);
    },
  ],
  [
    'borrar billeteras arrastra y cuenta movimientos, programados y presupuestos',
    async () => {
      const r = await walletCleanSlateService.cleanSlate(1, { wallets: 'DELETE' });
      assert.equal(r.walletsDeleted, 2);
      assert.equal(r.transactions, 4);
      assert.equal(r.transfers, 1);
      assert.equal(r.scheduledExpenses, 1);
      assert.equal(r.budgets, 1);
      assert.equal(await cuenta('wallet_wallets'), 0);
      assert.equal(await cuenta('wallet_budget_closures'), 0);
      // No pedidas: se quedan.
      assert.equal(await cuenta('wallet_expense_categories'), 2);
      assert.equal(await cuenta('wallet_credit_cards'), 1);
      assert.equal(r.categories, 0);
    },
  ],
  [
    'categorías: solo las propias; las de sistema y los gastos se quedan',
    async () => {
      const r = await walletCleanSlateService.cleanSlate(1, { categories: true });
      assert.equal(r.categories, 1);
      assert.equal(
        await n(`SELECT count(*) c FROM wallet_expense_categories WHERE user_id = 1 AND is_system`),
        1
      );
      assert.equal(await cuenta('wallet_expenses'), 4);
      assert.equal(
        await n(
          `SELECT count(*) c FROM wallet_expenses WHERE user_id = 1 AND category_id IS NOT NULL`
        ),
        0
      );
      assert.equal(
        await n(
          `SELECT count(*) c FROM wallet_user_settings WHERE user_id = 1 AND credit_card_payment_category_id IS NULL`
        ),
        1
      );
    },
  ],
  [
    'compras: listas, sus ítems y el catálogo',
    async () => {
      const r = await walletCleanSlateService.cleanSlate(1, { shopping: true });
      assert.equal(r.shoppingLists, 1);
      assert.equal(r.catalogItems, 2);
      assert.equal(
        await n(
          `SELECT count(*) c FROM shopping_list_items li JOIN shopping_lists l ON l.id = li.shopping_list_id WHERE l.user_id = 1`
        ),
        0
      );
    },
  ],
  [
    'borrar tarjetas sin transacciones: cuenta cargos y pagos, conserva el gasto del pago',
    async () => {
      const r = await walletCleanSlateService.cleanSlate(1, { creditCards: 'DELETE' });
      assert.equal(r.creditCardsDeleted, 1);
      assert.equal(r.creditCardCharges, 1);
      assert.equal(r.creditCardPayments, 1);
      assert.equal(r.transactions, 0);
      assert.equal(
        await n(
          `SELECT count(*) c FROM wallet_expenses WHERE user_id = 1 AND description = 'Pago Visa'`
        ),
        1
      );
    },
  ],
  [
    'todo a la vez',
    async () => {
      const r = await walletCleanSlateService.cleanSlate(1, {
        transactions: true,
        scheduledExpenses: true,
        categories: true,
        budgets: true,
        shopping: true,
        wallets: 'DELETE',
        creditCards: 'DELETE',
      });
      assert.equal(r.walletsDeleted, 2);
      assert.equal(r.creditCardsDeleted, 1);
      for (const t of [
        'wallet_wallets',
        'wallet_expenses',
        'wallet_transfers',
        'wallet_budgets',
        'wallet_scheduled_expenses',
        'wallet_credit_cards',
        'shopping_lists',
        'items',
      ])
        assert.equal(await cuenta(t), 0, t);
      assert.equal(await cuenta('wallet_expense_categories'), 1);
    },
  ],
  [
    'todo o nada: si algo falla a mitad, no se borra nada',
    async () => {
      // Un trigger que revienta al reiniciar billeteras, que va al final.
      await q(
        `CREATE OR REPLACE FUNCTION boom() RETURNS trigger AS $$ BEGIN RAISE EXCEPTION 'boom'; END $$ LANGUAGE plpgsql`
      );
      await q(
        `CREATE TRIGGER boom BEFORE UPDATE ON wallet_wallets FOR EACH ROW EXECUTE FUNCTION boom()`
      );
      try {
        await assert.rejects(
          walletCleanSlateService.cleanSlate(1, {
            transactions: true,
            shopping: true,
            wallets: 'RESET_BALANCES',
          }),
          (e: any) => {
            const texto = `${e.message} ${e.cause?.message ?? ''}`;
            console.log('   error recibido:', texto.slice(0, 160));
            return /boom/.test(texto);
          }
        );
        assert.equal(await cuenta('wallet_expenses'), 4);
        assert.equal(await cuenta('shopping_lists'), 1);
      } finally {
        await q(`DROP TRIGGER boom ON wallet_wallets`);
      }
    },
  ],
];

async function main() {
  if (process.env.DATABASE_URL !== URL_LOCAL) {
    console.error('Algo cambió DATABASE_URL al cargar el código; no se sigue.');
    process.exit(2);
  }
  require(`${REPO}/src/shared/database/drizzle`).initializeDrizzle();
  // Validación
  assert.equal(walletCleanSlateInputSchema.safeParse({}).success, false, 'vacío');
  assert.equal(
    walletCleanSlateInputSchema.safeParse({
      wallets: 'KEEP',
      creditCards: 'KEEP',
      transactions: false,
    }).success,
    false,
    'todo KEEP'
  );
  assert.equal(walletCleanSlateInputSchema.safeParse({ wallets: 'RESET_BALANCES' }).success, true);
  assert.equal(walletCleanSlateInputSchema.safeParse({ wallets: 'NUKE' }).success, false);
  console.log('✓ validación');

  let fallos = 0;
  for (const [nombre, caso] of casos) {
    await sembrar();
    try {
      await caso();
      await usuario2Intacto();
      console.log(`✓ ${nombre}`);
    } catch (e: any) {
      fallos++;
      console.log(`✗ ${nombre}\n   ${e.message}`);
    }
  }
  await pool.end();
  await require(`${REPO}/src/shared/database/drizzle`).closeDrizzle();
  console.log(fallos ? `${fallos} fallos` : 'todo en verde');
  process.exit(fallos ? 1 : 0);
}

main();
