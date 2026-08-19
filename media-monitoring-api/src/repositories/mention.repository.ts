import { PoolClient } from "pg";

import { pool } from "../config/database.js";
import type { NormalizedMention } from "../types/mention.js";

export async function findBySourceAndExternalId(client: PoolClient, sourceNormalized: string, externalId: string) {
  const result = await client.query(
    `
      SELECT *
      FROM mentions
      WHERE source_normalized = $1
        AND external_id = $2
      LIMIT 1
    `,
    [sourceNormalized, externalId],
  );

  return result.rows[0] ?? null;
}

export async function findByUrl(client: PoolClient, urlNormalized: string) {
  const result = await client.query(
    `
      SELECT *
      FROM mentions
      WHERE url_normalized = $1
      LIMIT 1
    `,
    [urlNormalized],
  );

  return result.rows[0] ?? null;
}

export async function insertMention(client: PoolClient, mention: NormalizedMention) {
  const result = await client.query(
    `
      INSERT INTO mentions (
        external_id,
        source,
        source_normalized,
        title,
        content,
        url,
        url_normalized,
        author,
        published_at,
        engagement
      )
      VALUES (
        $1, $2, $3, $4, $5,
        $6, $7, $8, $9, $10
      )
      RETURNING *
    `,
    [mention.external_id, mention.source, mention.source_normalized, mention.title, mention.content, mention.url, mention.url_normalized, mention.author, mention.published_at, mention.engagement],
  );

  return result.rows[0];
}

export async function updateMention(client: PoolClient, id: number, mention: NormalizedMention) {
  const result = await client.query(
    `
      UPDATE mentions
      SET
        source = $1,
        title = $2,
        content = $3,
        url = $4,
        url_normalized = $5,
        author = $6,
        published_at = $7,
        engagement = $8,
        updated_at = NOW()
      WHERE id = $9
      RETURNING *
    `,
    [mention.source, mention.title, mention.content, mention.url, mention.url_normalized, mention.author, mention.published_at, mention.engagement, id],
  );

  return result.rows[0];
}
