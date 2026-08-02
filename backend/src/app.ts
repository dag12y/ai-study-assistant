import express from "express";
import cors from "cors";
import helmet from "helmet";
import pinoHttp from "pino-http";

import { env } from "./config/env.js";

const app = express();

app.use(
  helmet()
);

app.use(
  cors({
    origin: env.CORS_ORIGIN,
  })
);

app.use(
  express.json({
    limit: "1mb",
  })
);

app.use(
  express.urlencoded({
    extended: true,
    limit: "1mb",
  })
);

app.use(
  pinoHttp()
);

app.get(
  "/api/v1/health",
  (_req, res) => {
    res.status(200).json({
      success: true,
      data: {
        status: "ok",
        service: "ai-study-assistant-api",
      },
      message: "API is healthy",
    });
  }
);

export default app;