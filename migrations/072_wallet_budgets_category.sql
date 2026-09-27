-- UP

-- La categoría de un presupuesto, opcional. Sirve para que en el reporte lo
-- que le queda al presupuesto cuente dentro de esa categoría, y para que un
-- gasto que se registra contra el presupuesto tome la categoría si no tiene.
--
-- Nula y sin backfill: los presupuestos de antes no tienen categoría y siguen
-- contando solo en «por gastar», como hasta ahora. ON DELETE SET NULL, igual
-- que category_id en wallet_expenses: borrar la categoría no borra el
-- presupuesto.
ALTER TABLE wallet_budgets
  ADD COLUMN IF NOT EXISTS category_id UUID
    REFERENCES wallet_expense_categories(id) ON DELETE SET NULL;

-- DOWN

-- ALTER TABLE wallet_budgets DROP COLUMN IF EXISTS category_id;
