-- UP

ALTER TABLE wallet_user_settings
  ADD COLUMN period_cutoff_day SMALLINT CHECK (period_cutoff_day >= 1 AND period_cutoff_day <= 31);

-- DOWN

-- ALTER TABLE wallet_user_settings DROP COLUMN IF EXISTS period_cutoff_day;
