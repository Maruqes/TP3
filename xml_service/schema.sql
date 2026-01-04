CREATE TABLE IF NOT EXISTS scrapdocs (
    id SERIAL PRIMARY KEY,
    doc XML NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    mapper_version TEXT
);
