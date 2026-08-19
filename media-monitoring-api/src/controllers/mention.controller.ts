import { Request, Response } from "express";
import { processMentions, getMentions, getMentionStatsBySource, getMentionStatsByDay } from "../services/mention.service.js";
import type { MentionInput } from "../types/mention.js";
import { normalizeSource } from "../utils/normalize.js";

export async function bulkCreateMentions(req: Request, res: Response) {
  try {
    const { mentions } = req.body;

    if (!Array.isArray(mentions)) {
      return res.status(400).json({
        success: false,
        message: "mentions must be an array",
      });
    }

    if (mentions.length === 0) {
      return res.status(400).json({
        success: false,
        message: "mentions cannot be empty",
      });
    }

    const result = await processMentions(mentions as MentionInput[]);

    return res.status(200).json({
      success: true,
      message: "Mentions processed successfully",
      data: result,
    });
  } catch (error) {
    console.error("Bulk mention error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to process mentions",
    });
  }
}

// get mentions
export async function getMentionList(req: Request, res: Response) {
  try {
    const source = typeof req.query.source === "string" ? normalizeSource(req.query.source) : undefined;

    const from = typeof req.query.from === "string" ? req.query.from : undefined;

    const to = typeof req.query.to === "string" ? req.query.to : undefined;

    const search = typeof req.query.search === "string" ? req.query.search : undefined;

    const page = typeof req.query.page === "string" ? Number(req.query.page) : 1;

    const limit = typeof req.query.limit === "string" ? Number(req.query.limit) : 10;

    if (!Number.isInteger(page) || page < 1) {
      return res.status(400).json({
        success: false,
        message: "page must be a positive integer",
      });
    }

    if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
      return res.status(400).json({
        success: false,
        message: "limit must be between 1 and 100",
      });
    }

    const fromDate = from ? new Date(`${from}T00:00:00Z`) : undefined;

    const toDate = to ? new Date(`${to}T23:59:59.999Z`) : undefined;

    if (fromDate && Number.isNaN(fromDate.getTime())) {
      return res.status(400).json({
        success: false,
        message: "Invalid from date",
      });
    }

    if (toDate && Number.isNaN(toDate.getTime())) {
      return res.status(400).json({
        success: false,
        message: "Invalid to date",
      });
    }

    const result = await getMentions({
      source,
      from: fromDate,
      to: toDate,
      search,
      page,
      limit,
    });

    const totalPages = Math.ceil(result.total / limit);

    return res.status(200).json({
      success: true,
      data: result.data,
      pagination: {
        page,
        limit,
        total: result.total,
        total_pages: totalPages,
      },
    });
  } catch (error) {
    console.error("Get mentions error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to get mentions",
    });
  }
}

// get statisktik
export async function getStats(req: Request, res: Response) {
  try {
    const groupBy = req.query.group_by;

    // get stats by source
    if (groupBy === "source") {
      const data = await getMentionStatsBySource();

      return res.status(200).json({
        success: true,
        data,
      });
    }

    // get stats by day
    if (groupBy === "day") {
      const data = await getMentionStatsByDay();

      return res.status(200).json({
        success: true,
        data,
      });
    }

    return res.status(400).json({
      success: false,
      message: "group_by must be source or day",
    });
  } catch (error) {
    console.error("Stats error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to get statistics",
    });
  }
}
