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

// get mentions
export interface FindMentionsParams {
  source?: string;
  from?: Date;
  to?: Date;
  search?: string;
  page: number;
  limit: number;
}

export async function findMentions(params: FindMentionsParams) {
  const { source, from, to, search, page, limit } = params;

  const conditions: string[] = [];
  const values: unknown[] = [];

  let parameterIndex = 1;

  if (source) {
    conditions.push(`source_normalized = $${parameterIndex}`);

    values.push(source);

    parameterIndex++;
  }

  if (from) {
    conditions.push(`published_at >= $${parameterIndex}`);

    values.push(from);

    parameterIndex++;
  }

  if (to) {
    conditions.push(`published_at <= $${parameterIndex}`);

    values.push(to);

    parameterIndex++;
  }

  if (search) {
    conditions.push(`
      (
        title ILIKE $${parameterIndex}
        OR content ILIKE $${parameterIndex}
      )
    `);

    values.push(`%${search}%`);

    parameterIndex++;
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  const offset = (page - 1) * limit;

  const dataQuery = `
    SELECT
      id,
      external_id,
      source,
      title,
      content,
      url,
      author,
      published_at,
      engagement,
      created_at,
      updated_at
    FROM mentions
    ${whereClause}
    ORDER BY published_at DESC NULLS LAST, id DESC
    LIMIT $${parameterIndex}
    OFFSET $${parameterIndex + 1}
  `;

  values.push(limit);
  values.push(offset);

  const countQuery = `
    SELECT COUNT(*)::integer AS total
    FROM mentions
    ${whereClause}
  `;

  const [dataResult, countResult] = await Promise.all([pool.query(dataQuery, values), pool.query(countQuery, values.slice(0, parameterIndex - 1))]);

  return {
    data: dataResult.rows,
    total: countResult.rows[0].total,
  };
}

// statitik berdasarkan source
export async function getStatsBySource() {
  const result = await pool.query(`
    SELECT
      source,
      COUNT(*)::integer AS total
    FROM mentions
    GROUP BY source
    ORDER BY total DESC, source ASC
  `);

  return result.rows;
}

// statitik berdasarkan hari/ day
export async function getStatsByDay() {
  const result = await pool.query(`
    SELECT
      DATE(published_at) AS day,
      COUNT(*)::integer AS total
    FROM mentions
    WHERE published_at IS NOT NULL
    GROUP BY DATE(published_at)
    ORDER BY day ASC
  `);

  return result.rows;
}
