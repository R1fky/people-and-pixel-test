CREATE TABLE mentions (
    id BIGSERIAL PRIMARY KEY,
    external_id VARCHAR(255) NOT NULL,
    source VARCHAR(255) NOT NULL,
    source_normalized VARCHAR(255) NOT NULL,
    title TEXT,
    content TEXT NOT NULL,
    url TEXT NOT NULL,
    url_normalized TEXT NOT NULL,
    author TEXT,
    published_at TIMESTAMPTZ,
    engagement INTEGER NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT mentions_source_external_id_unique
        UNIQUE (source_normalized, external_id),
    CONSTRAINT mentions_url_unique
        UNIQUE (url_normalized)
);

CREATE INDEX mentions_source_idx
    ON mentions (source_normalized);

CREATE INDEX mentions_published_at_idx
    ON mentions (published_at);

CREATE INDEX mentions_source_published_at_idx
    ON mentions (source_normalized, published_at);