import "dotenv/config";

import { app } from "./app";
import { connectMongo } from "./db/mongo";

const PORT = process.env.PORT || 8080;

const startServer = async (): Promise<void> => {
  await connectMongo();
  app.listen(PORT, () => {
    console.log(`✅ Server running on http://localhost:${PORT}`);
  });
};

startServer().catch((error) => {
  console.error("❌ Failed to start server:", error);
  process.exit(1);
});
