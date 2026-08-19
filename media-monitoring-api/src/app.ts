import express from "express";
import cors from "cors";

import mentionRoutes from "./routes/mention.routes.js";

const app = express();

app.use(cors());

app.use(express.json());

app.use("/internal/mentions", mentionRoutes);

export default app;
