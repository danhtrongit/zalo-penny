import pinoHttp from "pino-http";
import { logger } from "../utils/logger";
import { env } from "../config/env";

export const httpLogger = pinoHttp({
  logger,
  genReqId: (req) => req.id ?? "no-request-id",
  customLogLevel: (_req, res, err) => {
    if (err || res.statusCode >= 500) return "error";
    if (res.statusCode >= 400) return "warn";
    return "info";
  },
  serializers: {
    req: (req) => ({
      id: req.id,
      method: req.method,
      url: req.url,
      remoteAddress: req.remoteAddress,
    }),
    res: (res) => ({ statusCode: res.statusCode }),
  },
  autoLogging: {
    ignore: (req) => env.isDev && req.url === "/api/health",
  },
});
