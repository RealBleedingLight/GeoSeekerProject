CREATE TABLE IF NOT EXISTS countries (
  code CHAR(2) PRIMARY KEY,
  name VARCHAR(100) NOT NULL
);

CREATE TABLE IF NOT EXISTS clues (
  id SERIAL PRIMARY KEY,
  country_code CHAR(2) NOT NULL REFERENCES countries(code),
  feature VARCHAR(50) NOT NULL,
  clue TEXT NOT NULL,
  image_url TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_clues_country ON clues(country_code);
CREATE INDEX idx_clues_feature ON clues(feature);
