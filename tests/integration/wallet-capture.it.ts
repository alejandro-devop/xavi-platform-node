// Anotar gastos desde fuera de la app (Siri, Apple Pay), contra un Postgres
// local desechable, como wallet-clean-slate.it.ts (mismas instrucciones y la
// misma guardia: esto hace TRUNCATE).
import assert from 'node:assert/strict';

const URL_LOCAL = process.env.DATABASE_URL ?? '';
if (!/^postgres(ql)?:\/\/[^@]*@(localhost|127\.0\.0\.1)[:/]/.test(URL_LOCAL)) {
  console.error('DATABASE_URL tiene que ser un Postgres local: esta prueba hace TRUNCATE.');
  process.exit(2);
}
process.env.JWT_ACCESS_SECRET ??= 'secreto-de-prueba';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { Pool } = require('pg');
import path from 'node:path';
const REPO = path.resolve(__dirname, '../..');
const { walletCaptureService } = require(`${REPO}/src/services/wallet-capture.service`);
const { generateCaptureToken, verifyCaptureToken } = require(
  `${REPO}/src/shared/utils/capture-token`
);
const { verifyAccessToken } = require(`${REPO}/src/shared/utils/jwt`);

const pool = new Pool({ connectionString: URL_LOCAL });
const q = async (sql: string, p: unknown[] = []) => (await pool.query(sql, p)).rows;

async function main() {
  require(`${REPO}/src/shared/database/drizzle`).initializeDrizzle();

  // El token de captura sirve para capturar y para nada más.
  const token = generateCaptureToken(1);
  assert.equal(verifyCaptureToken(token), 1);
  assert.throws(() => verifyAccessToken(token));

  await q(
    'TRUNCATE wallet_expenses, wallet_expense_categories, wallet_wallets, users RESTART IDENTITY CASCADE'
  );
  await q(`INSERT INTO users (id, email, password, name) VALUES (1, 'a@t.dev', 'x', 'A')`);
  const billetera = async (name: string, principal: boolean) =>
    (
      await q(
        `INSERT INTO wallet_wallets (id, user_id, name, is_main, balance) VALUES (gen_random_uuid(), 1, $1, $2, 1000000) RETURNING id`,
        [name, principal]
      )
    )[0].id as string;
  const efectivo = await billetera('Efectivo', true);
  const bancolombia = await billetera('Bancolombia', false);
  const [comida] = await q(
    `INSERT INTO wallet_expense_categories (id, user_id, name, type) VALUES (gen_random_uuid(), 1, 'Comida', 'expense') RETURNING id`
  );
  await q(
    `INSERT INTO wallet_expenses (id, user_id, wallet_id, category_id, description, date, debit) VALUES (gen_random_uuid(), 1, $1, $2, 'Almuerzo', '2026-09-01', 20000)`,
    [efectivo, comida.id]
  );

  // Apple Pay: la billetera sale del nombre de la tarjeta; la categoría, del historial.
  const r1 = await walletCaptureService.capture(1, {
    amount: 45000,
    description: 'Almuerzo',
    ref: 'ref-apple-0001',
    source: 'apple_pay',
    date: '2026-09-27',
    cardName: 'Bancolombia Débito',
  });
  assert.equal(r1.walletName, 'Bancolombia');
  assert.equal(r1.categoryName, 'Comida');
  assert.equal(r1.duplicate, false);
  const [fila] = await q(
    'SELECT source, capture_ref, debit, wallet_id FROM wallet_expenses WHERE id = $1',
    [r1.id]
  );
  assert.equal(fila.source, 'apple_pay');
  assert.equal(fila.wallet_id, bancolombia);
  assert.equal(Number(fila.debit), 45000);
  const [saldo] = await q('SELECT balance FROM wallet_wallets WHERE id = $1', [bancolombia]);
  assert.equal(Number(saldo.balance), 955000, 'el saldo baja como con cualquier gasto');

  // El mismo ref no crea otro gasto.
  const r2 = await walletCaptureService.capture(1, {
    amount: 45000,
    description: 'Almuerzo',
    ref: 'ref-apple-0001',
    source: 'apple_pay',
    cardName: 'Bancolombia Débito',
  });
  assert.equal(r2.duplicate, true);
  assert.equal(r2.id, r1.id);
  const [{ n }] = await q(
    "SELECT count(*)::int AS n FROM wallet_expenses WHERE capture_ref = 'ref-apple-0001'"
  );
  assert.equal(n, 1);

  // Siri, sin tarjeta: la billetera principal; algo que no se parece a nada, sin categoría.
  const r3 = await walletCaptureService.capture(1, {
    amount: 12000,
    description: 'Xyzzy',
    ref: 'ref-siri-0001',
    source: 'siri',
  });
  assert.equal(r3.walletName, 'Efectivo');
  assert.equal(r3.categoryName, null);

  // Siri con la billetera nombrada: manda sobre la principal.
  const r4 = await walletCaptureService.capture(1, {
    amount: 5000,
    description: 'Tinto',
    ref: 'ref-siri-0002',
    source: 'siri',
    walletId: bancolombia,
  });
  assert.equal(r4.walletName, 'Bancolombia');
  assert.equal(r4.kind, 'expense');

  // Tarjeta de crédito: un cargo, no un gasto de billetera. Sube la deuda.
  const [tarjeta] = await q(
    `INSERT INTO wallet_credit_cards (id, user_id, name, credit_limit, current_debt, cutoff_day, payment_day)
     VALUES (gen_random_uuid(), 1, 'Visa Oro', 8000000, 1000000, 15, 30) RETURNING id`
  );
  const cargo = {
    amount: 45000,
    description: 'Almuerzo',
    ref: 'ref-apple-0002',
    source: 'apple_pay',
    date: '2026-09-27',
    cardName: 'Visa Oro',
    creditCardId: tarjeta.id,
  };
  const r5 = await walletCaptureService.capture(1, cargo);
  assert.equal(r5.kind, 'charge');
  assert.equal(r5.walletName, 'Visa Oro');
  assert.equal(r5.categoryName, 'Comida');
  const [deuda] = await q('SELECT current_debt FROM wallet_credit_cards WHERE id = $1', [
    tarjeta.id,
  ]);
  assert.equal(Number(deuda.current_debt), 1045000);
  const [saldoIgual] = await q('SELECT balance FROM wallet_wallets WHERE id = $1', [bancolombia]);
  assert.equal(Number(saldoIgual.balance), 950000, 'un cargo no toca las billeteras');

  // Reintentar el mismo cargo no lo duplica.
  const r6 = await walletCaptureService.capture(1, { ...cargo, ref: 'ref-apple-0002' });
  assert.equal(r6.duplicate, true);
  const [{ cargos }] = await q('SELECT count(*)::int AS cargos FROM wallet_credit_card_charges');
  assert.equal(cargos, 1);

  console.log('wallet-capture: OK');
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
