// chatbot-backend/load-knowledge-base.js

import dotenv from "dotenv";
import { MongoClient } from "mongodb";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

dotenv.config();

// --- FIX #1: Call dotenv.config() to load environment variables ---
dotenv.config();
// ----------------------------------------------------------------

// --- FIX #2: Define __dirname for ES Modules ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
// ---------------------------------------------

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const client = new MongoClient(process.env.MONGO_URI); // This will now receive the correct value
const jsonPath = join(__dirname, "Ambel.json"); // This will now work correctly

async function loadKnowledge() {
  try {
    await client.connect();
    const collection = client.db("ambel_db").collection("knowledge_base");
    console.log(
      'Connected to MongoDB and targeting "knowledge_base" collection.'
    );

    await collection.deleteMany({});
    console.log("Cleared existing data in collection.");

    const fileContent = readFileSync(jsonPath, "utf-8");
    const qaPairs = JSON.parse(fileContent);
    console.log(`Found ${qaPairs.length} Q&A pairs in Ambel.json.`);

    const embeddingModel = genAI.getGenerativeModel({
      model: "text-embedding-004",
    });

    for (const item of qaPairs) {
      const textChunk = `Question: ${item.question}\nAnswer: ${item.answer}`;
      const result = await embeddingModel.embedContent(textChunk);
      const embedding = result.embedding.values;
      const document = {
        text: textChunk,
        embedding: embedding,
      };
      await collection.insertOne(document);
    }

    console.log(
      `\nSuccessfully processed and stored ${qaPairs.length} Q&A pairs in the database!`
    );
  } catch (error) {
    console.error("An error occurred:", error);
  } finally {
    await client.close();
    console.log("MongoDB connection closed.");
  }
}

loadKnowledge();
