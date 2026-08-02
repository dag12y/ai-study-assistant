import express from "express";
import cors from "cors";
import helmet from "helmet";
import pinoHttp from "pino-http";

import { env } from "./config/env.js";
import apiRoutes from "./routes/index.js";
import { notFoundHandler } from "./middleware/not-found.js";
import { errorHandler } from "./middleware/error-handler.js";

const app = express();

app.use(
  helmet()
);

app.use(
  cors({
    origin: env.CORS_ORIGIN,
    credentials: true,
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
  "/",
  (_req, res) => {
    res.status(200).json({
      success: true,
      data: {
        service: "ai-study-assistant-api",
      },
      message: "Welcome to the AI Study Assistant API",
    });
  }
);

app.use(
  "/api/v1",
  apiRoutes
);

app.use(
  notFoundHandler
);

app.use(
  errorHandler
);

export default app;