// Load environment variables from the .env file
require("dotenv").config();

const { MongoClient, ServerApiVersion } = require("mongodb");
const fs = require("fs");
const path = require("path");

// --- Configuration ---
const uri = process.env.MONGODB_URI;
const jsonFilePath = path.join(__dirname, "Ambel.json"); // Make sure your filename is correct

// --- Initialize Mongo Client ---
const mongoClient = new MongoClient(uri, {
	serverApi: {
		version: ServerApiVersion.v1,
		strict: true,
		deprecationErrors: true,
	},
});

// --- Main Function to Run the Process ---
async function main() {
	console.log("Starting the data storing process (skipping embeddings)...");

	try {
		// 1. Connect to MongoDB
		await mongoClient.connect();
		console.log("✅ Connected to MongoDB.");

		const db = mongoClient.db("ambel_chatbot_db");
		const collection = db.collection("knowledge_base");

		// 2. Read and Parse the JSON knowledge base
		const fileContent = fs.readFileSync(jsonFilePath, "utf8");
		const knowledgeData = JSON.parse(fileContent);
		console.log(
			`✅ Successfully loaded ${knowledgeData.length} items from JSON file.`
		);

		// 3. Insert each item into MongoDB (without embedding)
		for (const item of knowledgeData) {
			console.log(`Processing question: "${item.question}"`);

			// Prepare the document to be inserted (question and answer only)
			const documentToInsert = {
				question: item.question,
				answer: item.answer,
			};

			// Insert the document into the collection
			await collection.insertOne(documentToInsert);
			console.log(`➡️ Successfully inserted document.`);
		}

		console.log(
			"\n🎉 All items have been stored successfully (without embeddings)!"
		);
	} catch (err) {
		console.error("❌ An error occurred:", err);
	} finally {
		// Ensures that the client will close when you finish/error
		await mongoClient.close();
		console.log("✅ MongoDB connection closed.");
	}
}

// Run the main function
main();
