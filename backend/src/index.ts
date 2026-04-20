import app from "./app";
import { env } from "./config/env";
import { startAllBots } from "./services/bot-manager.service";

app.listen(env.port, async () => {
  console.log(`Server running on port ${env.port} [${env.nodeEnv}]`);

  try {
    await startAllBots();
  } catch (err) {
    console.error("Failed to start bots:", err);
  }
});
