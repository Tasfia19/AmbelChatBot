// chatbot-backend/index.js

require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { MongoClient } = require("mongodb");
const { GoogleGenerativeAI } = require("@google/generative-ai");

const app = express();
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const client = new MongoClient(process.env.MONGO_URI);

app.use(cors());
app.use(express.json());
const port = 3001;

let professionalsCollection;

app.post("/api/chat", async (req, res) => {
  try {
    const userMessage = req.body.message;
    const history = req.body.history || [];
    const formattedHistory = history
      .map((msg) => `${msg.role}: ${msg.content}`)
      .join("\n");

    const routerModel = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const routerPrompt = `
      Your task is to analyze a conversation and determine the next step for a professional search assistant.
      The goal is to collect three slots: "type", "specialty", and "location".
      Analyze the "Conversation History" and the latest "User" message.
      
      Available actions:
      - "ASK_TYPE": If "type" is missing.
      - "ASK_SPECIALTY": If "type" is known, but "specialty" is missing.
      - "ASK_LOCATION": If "type" and "specialty" are known, but "location" is missing.
      - "PERFORM_SEARCH": If "type", "specialty", and "location" are all known.
      - "ANSWER_GENERAL": If the user is not trying to find a professional.

      Return a single, valid JSON object and nothing else.
      The JSON object must have two keys:
      1. "action": One of the five available action strings.
      2. "slots": A JSON object containing the values for "type", "specialty", and "location" that have been collected so far.

      Conversation History:
      ${formattedHistory}
      User: ${userMessage}
    `;

    const routerResult = await routerModel.generateContent({
      contents: [{ role: "user", parts: [{ text: routerPrompt }] }],
      generationConfig: {
        responseMimeType: "application/json",
      },
    });

    const routerResponseText = routerResult.response.text();
    const decision = JSON.parse(routerResponseText);

    let aiReply = "I'm not sure how to help with that.";

    switch (decision.action) {
      case "ASK_TYPE":
        aiReply = "Which professional do you need, like a doctor or a lawyer?";
        break;
      case "ASK_SPECIALTY":
        aiReply = `What kind of ${
          decision.slots.type || "professional"
        } would you like to see?`;
        break;
      case "ASK_LOCATION":
        aiReply = "And where are you located?";
        break;
      case "PERFORM_SEARCH":
        // --- FINAL FIX: Ensure all slots are lowercase for consistency ---
        const type = decision.slots.type.toLowerCase();
        const specialty = decision.slots.specialty.toLowerCase();
        const location = decision.slots.location.toLowerCase();
        // -----------------------------------------------------------------

        const searchQuery = `A ${specialty} ${type} in ${location}`;
        const embeddingModel = genAI.getGenerativeModel({
          model: "text-embedding-004",
        });
        const embeddingResult = await embeddingModel.embedContent(searchQuery);
        const searchEmbedding = embeddingResult.embedding.values;

        const filter = {
          type: { $eq: type },
          location: { $eq: location },
        };

        const searchPipeline = [
          {
            $vectorSearch: {
              index: "default",
              path: "embedding",
              queryVector: searchEmbedding,
              numCandidates: 100,
              limit: 3,
              filter: filter,
            },
          },
        ];

        // --- DEBUG LOGS TO SEE THE QUERY AND RESULT ---
        console.log("--- DEBUG: Sending this query to MongoDB ---");
        console.log(JSON.stringify(searchPipeline, null, 2));

        const searchResults = await professionalsCollection
          .aggregate(searchPipeline)
          .toArray();

        console.log("--- DEBUG: Received this result from MongoDB ---");
        console.log(searchResults);
        // ---------------------------------------------

        if (searchResults.length > 0) {
          const resultsText = searchResults
            .map((r) => `${r.name} (${r.specialty}) in ${r.location}`)
            .join(", ");
          aiReply = `I found these professionals for you: ${resultsText}. Do you want to see their availability?`;
        } else {
          aiReply = `I'm sorry, I couldn't find any professionals matching your criteria.`;
        }
        break;
      case "ANSWER_GENERAL":
        const chatModel = genAI.getGenerativeModel({
          model: "gemini-1.5-flash",
        });
        const chatResult = await chatModel.generateContent(userMessage);
        aiReply = chatResult.response.text();
        break;
    }
    res.json({ reply: aiReply });
  } catch (error) {
    console.error("Error in /api/chat:", error);
    res.status(500).json({ error: "Something went wrong." });
  }
});

async function startServer() {
  try {
    await client.connect();
    console.log("Connected to MongoDB.");
    professionalsCollection = client.db("ambel_db").collection("professionals");
    app.listen(port, () => {
      console.log(`Server is running at http://localhost:${port}`);
    });
  } catch (error) {
    console.error("Failed to connect to database", error);
    process.exit(1);
  }
}

startServer();
