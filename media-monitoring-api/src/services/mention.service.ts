import { pool } from "../config/database.js";

import { normalizeMention } from "../utils/normalize.js";

import type { MentionInput } from "../types/mention.js";

import { findBySourceAndExternalId, findByUrl, insertMention, updateMention } from "../repositories/mention.repository.js";

export interface BulkMentionResult {
  inserted: number;
  updated: number;
  duplicated: number;
  total: number;
}

export async function processMentions(mentions: MentionInput[]): Promise<BulkMentionResult> {
  const client = await pool.connect();

  let inserted = 0;
  let updated = 0;
  let duplicated = 0;

  try {
    await client.query("BEGIN");

    for (const input of mentions) {
      const mention = normalizeMention(input);

      const existingByIdentity = await findBySourceAndExternalId(client, mention.source_normalized, mention.external_id);

      if (existingByIdentity) {
        await updateMention(client, existingByIdentity.id, mention);

        updated++;

        continue;
      }

      const existingByUrl = await findByUrl(client, mention.url_normalized);

      if (existingByUrl) {
        duplicated++;

        continue;
      }

      await insertMention(client, mention);

      inserted++;
    }

    await client.query("COMMIT");

    return {
      inserted,
      updated,
      duplicated,
      total: mentions.length,
    };
  } catch (error) {
    await client.query("ROLLBACK");

    throw error;
  } finally {
    client.release();
  }
}
