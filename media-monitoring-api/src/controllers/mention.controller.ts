import { Request, Response } from "express";
import { processMentions } from "../services/mention.service.js";
import type { MentionInput } from "../types/mention.js";

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
