import express from "express";
import cors from "cors";
import routes from "./routes";
import webhookRoute from "./routes/webhook.route";
import { notFoundHandler, errorHandler } from "./middlewares/error.middleware";
import { env } from "./config/env";

const app = express();

app.use(cors({ origin: env.frontendUrl, credentials: true }));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

app.use("/api/webhooks", webhookRoute);
app.use("/api", routes);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
