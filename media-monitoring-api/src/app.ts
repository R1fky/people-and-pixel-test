import express from "express";

import mentionRoutes from "./routes/mention.routes.js";

const app = express();

app.use(express.json());

app.use("/internal/mentions", mentionRoutes);

export default app;
