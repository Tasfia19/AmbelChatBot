// At the very top, load the environment variables from the .env file
require("dotenv").config();

const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion } = require("mongodb");
const { GoogleGenerativeAI } = require("@google/generative-ai");

// --- 1. Initial Setup ---
const app = express();
app.use(cors());
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
app.get("/", (req, res) => {
	res.send("Hello from the Ambel AI Backend! 👋");
});

app.post("/chat", async (req, res) => {
	try {
		const userInput = req.body.question;
		if (!userInput) {
			return res.status(400).json({ answer: "Error: No question provided." });
		}

		console.log(`Received sentence: "${userInput}"`);
		const lowerCaseInput = userInput.toLowerCase();

		if (lowerCaseInput === "hi" || lowerCaseInput === "hello") {
			res.json({
				answer: "Hello! I am the Ambel Bot. How can I help you today?",
			});
		} else {
			const db = mongoClient.db("ambel_chatbot_db");
			const collection = db.collection("knowledge_base");

			// --- NEW: Keyword Extraction Logic ---
			const keywords = ["mission", "vision", "values", "ambel"];
			let foundKeyword = null;
			// Loop through our list of keywords
			for (const keyword of keywords) {
				// Check if the user's sentence includes one of the keywords
				if (lowerCaseInput.includes(keyword)) {
					foundKeyword = keyword;
					break; // Stop after finding the first one
				}
			}

			let searchResult = null;
			if (foundKeyword) {
				// If we found a keyword, use it to search the database
				console.log(`Found keyword: "${foundKeyword}"`);
				const query = { question: { $regex: foundKeyword, $options: "i" } };
				searchResult = await collection.findOne(query);
			}
			// --- End of New Logic ---

			if (searchResult) {
				const context = searchResult.answer;
				const prompt = `Based on this information: "${context}", please provide a friendly and conversational answer to the user's question: "${userInput}".`;
				const result = await geminiModel.generateContent(prompt);
				const response = await result.response;
				const finalAnswer = response.text();
				console.log(`Generated answer: "${finalAnswer}"`);
				res.json({ answer: finalAnswer });
			} else {
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
