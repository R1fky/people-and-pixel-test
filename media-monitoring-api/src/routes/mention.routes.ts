import { Router } from "express";

import { bulkCreateMentions, getMentionList, getStats } from "../controllers/mention.controller.js";

const router = Router();

router.post("/bulk", bulkCreateMentions);

router.get("/stats", getStats);

router.get("/", getMentionList);

export default router;
