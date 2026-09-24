CREATE TABLE countries (
  code CHAR(2) PRIMARY KEY,
  name VARCHAR(100) NOT NULL
);

CREATE TABLE categories (
  slug VARCHAR(50) PRIMARY KEY,
  label VARCHAR(100) NOT NULL,
  icon VARCHAR(50) DEFAULT '',
  sort_order INT DEFAULT 0
);

CREATE TABLE clues (
  id SERIAL PRIMARY KEY,
  country_code CHAR(2) NOT NULL REFERENCES countries(code),
  category VARCHAR(50) NOT NULL REFERENCES categories(slug),
  clue TEXT NOT NULL,
  image_url TEXT DEFAULT '',
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_clues_country ON clues(country_code);
CREATE INDEX idx_clues_category ON clues(category);
