-- Compteurs de quota (data-model §7) : une ligne par jour et par mois, aucune donnée de visiteur.
CREATE TABLE IF NOT EXISTS quota_counter (
  period_key TEXT PRIMARY KEY,
  count INTEGER NOT NULL DEFAULT 0 CHECK (count >= 0)
);
