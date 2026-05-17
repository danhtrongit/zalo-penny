import express from "express";
import cors from "cors";
import helmet from "helmet";
import * as Sentry from "@sentry/node";
import "./config/zod-i18n"; // side-effect: Vietnamese zod error messages
import routes from "./routes";
import webhookRoute from "./routes/webhook.route";
import { notFoundHandler, errorHandler } from "./middlewares/error.middleware";
import { requestId } from "./middlewares/request-id.middleware";
import { httpLogger } from "./middlewares/http-logger.middleware";
import { generalLimiter } from "./middlewares/rate-limit.middleware";
import { sentryEnabled } from "./observability/sentry";
import { env } from "./config/env";
import { REQUEST_BODY_LIMIT } from "./config/constants";

const app = express();

app.set("trust proxy", 1);

app.use(requestId);
app.use(httpLogger);
app.use(helmet());

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (env.corsOrigins.includes(origin)) return callback(null, true);
      return callback(new Error(`CORS: origin ${origin} not allowed`));
    },
    credentials: true,
  })
);

app.use(
  express.json({
    limit: REQUEST_BODY_LIMIT,
    verify: (req, _res, buf) => {
      // Capture raw body for webhook signature verification (SePay IPN, etc.)
      (req as express.Request & { rawBody?: Buffer }).rawBody = Buffer.from(buf);
    },
  })
);
app.use(express.urlencoded({ extended: true, limit: REQUEST_BODY_LIMIT }));

// Webhook routes are mounted before generalLimiter so 3rd-party providers
// (Zalo, SePay) are not throttled. They have their own auth/signature checks.
app.use("/api/webhooks", webhookRoute);

app.use("/api", generalLimiter, routes);

app.use(notFoundHandler);

// Sentry's Express error handler runs BEFORE our errorHandler so 5xx errors
// are captured (it also tags them with the current request's trace context).
// Sentry's handler always calls next(err), so our errorHandler still shapes
// the response.
if (sentryEnabled) {
  Sentry.setupExpressErrorHandler(app);
}

app.use(errorHandler);

export default app;
