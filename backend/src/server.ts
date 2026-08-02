import app from "./app.js";
import { env } from "./config/env.js";

const server = app.listen(
  env.PORT,
  () => {
    console.log(
      `API running on http://localhost:${env.PORT}`
    );
  }
);

const shutdown = (
  signal: string
) => {
  console.log(
    `${signal} received. Shutting down...`
  );

  server.close(
    () => {
      console.log(
        "HTTP server closed."
      );

      process.exit(0);
    }
  );
};

process.on(
  "SIGINT",
  () => shutdown("SIGINT")
);

process.on(
  "SIGTERM",
  () => shutdown("SIGTERM")
);