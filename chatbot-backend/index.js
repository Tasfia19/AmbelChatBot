// At the very top, load the environment variables from the .env file
require("dotenv").config();

const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion } = require("mongodb");
const { GoogleGenerativeAI } = require("@google/generative-ai");

// --- 1. Initial Setup ---
const app = express();
// Use CORS to allow your UI to connect
app.use(cors());
// Use express.json() to parse JSON request bodies
app.use(express.json());

const PORT = process.env.PORT || 3000;
const uri = process.env.MONGODB_URI;
const geminiApiKey = process.env.GEMINI_API_KEY;

// --- 2. Initialize Clients ---
const mongoClient = new MongoClient(uri, {
	serverApi: {
		version: ServerApiVersion.v1,
		strict: true,
		deprecationErrors: true,
	},
});
const genAI = new GoogleGenerativeAI(geminiApiKey);
const geminiModel = genAI.getGenerativeModel({
	model: "gemini-1.5-flash-latest",
});

// --- 3. Database Connection ---
async function connectToDbAndSetup() {
	try {
		await mongoClient.connect();
		console.log("✅ Successfully connected to MongoDB!");
	} catch (err) {
		console.error("❌ Failed to connect to MongoDB", err);
		process.exit(1);
	}
}
connectToDbAndSetup();

// --- 4. Express Routes ---
// A simple test route
app.get("/", (req, res) => {
	res.send("Hello from the Ambel AI Backend! 👋");
});

// The main chat endpoint
app.post("/chat", async (req, res) => {
	try {
		const userInput = req.body.question;
		if (!userInput) {
			return res.status(400).json({ answer: "Error: No question provided." });
		}
		console.log(`Received a question: "${userInput}"`);

		const lowerCaseInput = userInput.toLowerCase();

		// Rule 1: Handle greetings
		if (lowerCaseInput === "hi" || lowerCaseInput === "hello") {
			res.json({
				answer: "Hello! I am the Ambel Bot. How can I help you today?",
			});
		} else {
			// Rule 2: If not a greeting, search the knowledge base
			const db = mongoClient.db("ambel_chatbot_db");
			const collection = db.collection("knowledge_base");

			// Use a case-insensitive regex to find a match
			const query = { question: { $regex: userInput, $options: "i" } };
			const searchResult = await collection.findOne(query);

			if (searchResult) {
				// If a document is found, use it as context for Gemini
				const context = searchResult.answer;
				const prompt = `Based on this information: "${context}", please provide a friendly and conversational answer to the user's question: "${userInput}".`;

				// Call the Gemini API
				const result = await geminiModel.generateContent(prompt);
				const response = await result.response;
				const finalAnswer = response.text();

				console.log(`Generated answer: "${finalAnswer}"`);
				res.json({ answer: finalAnswer });
			} else {
				// If no document is found in the database
				res.json({
					answer:
						"I'm sorry, I don't have information about that. Please try another question.",
				});
			}
		}
	} catch (error) {
		console.error("Error processing chat request:", error);
		res.status(500).json({ answer: "An error occurred on the server." });
	}
});

// --- 5. Start the Server ---
app.listen(PORT, () => {
	console.log(`Server is running on http://localhost:${PORT}`);
});
