import "dotenv/config";
import mongoose from "mongoose";

export const connectMongo = async (): Promise<void> => {
  const mongoUri = process.env.MONGODB_URI;

  if (!mongoUri) {
    throw new Error("Missing MONGODB_URI environment variable");
  }

  if (mongoose.connection.readyState === 1) {
    return;
  }

  await mongoose.connect(mongoUri, {
    dbName: process.env.MONGODB_DB_NAME || "know-your-terms",
  });

  console.log("✅ MongoDB connected successfully");
};

export default mongoose;
