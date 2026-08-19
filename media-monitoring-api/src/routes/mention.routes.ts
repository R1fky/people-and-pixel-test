import { Router } from "express";

import { bulkCreateMentions } from "../controllers/mention.controller.js";

const router = Router();

router.post("/bulk", bulkCreateMentions);

export default router;
