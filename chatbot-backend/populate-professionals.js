// chatbot-backend/populate-professionals.js

require("dotenv").config();
const { MongoClient } = require("mongodb");
const { GoogleGenerativeAI } = require("@google/generative-ai");

// --- CORRECTED SAMPLE DATA (ALL LOWERCASE) ---
const professionalsData = [
  {
    name: "Dr. Anika Rahman",
    type: "doctor",
    specialty: "cardiologist",
    location: "chattogram",
    description:
      "A highly experienced cardiologist specializing in heart failure and preventative care for adults.",
    availability: [
      { day: "Monday", slots: ["10:00 AM", "2:00 PM", "4:00 PM"] },
      { day: "Wednesday", slots: ["9:00 AM", "11:00 AM"] },
    ],
  },
  {
    name: "Dr. Farhan Ahmed",
    type: "doctor",
    specialty: "dermatologist",
    location: "dhaka",
    description:
      "Expert in skin care, acne treatment, and cosmetic dermatology.",
    availability: [
      { day: "Tuesday", slots: ["11:00 AM", "3:00 PM"] },
      { day: "Thursday", slots: ["10:00 AM", "1:00 PM", "4:00 PM"] },
    ],
  },
  {
    name: "Barrister Sameera Khan",
    type: "lawyer",
    specialty: "corporate law",
    location: "chattogram",
    description:
      "Specializes in business contracts, mergers, and acquisitions for tech startups.",
    availability: [
      { day: "Monday", slots: ["9:00 AM", "1:00 PM"] },
      { day: "Tuesday", slots: ["2:00 PM", "5:00 PM"] },
      { day: "Friday", slots: ["10:00 AM"] },
    ],
  },
];
// ---------------------------------------------

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const client = new MongoClient(process.env.MONGO_URI);

async function populateDatabase() {
  try {
    await client.connect();
    const collection = client.db("ambel_db").collection("professionals");
    console.log(
      'Connected to MongoDB and targeting "professionals" collection.'
    );

    await collection.deleteMany({}); // Clear existing data
    console.log("Cleared existing data in collection.");

    const embeddingModel = genAI.getGenerativeModel({
      model: "text-embedding-004",
    });

    for (const doc of professionalsData) {
      // Create a descriptive string for embedding, now also in lowercase
      const textToEmbed =
        `Name: ${doc.name}, Type: ${doc.type}, Specialty: ${doc.specialty}, Location: ${doc.location}. Description: ${doc.description}`.toLowerCase();

      const result = await embeddingModel.embedContent(textToEmbed);

      doc.embedding = result.embedding.values;
      await collection.insertOne(doc);
      console.log(`Inserted: ${doc.name}`);
    }

    console.log("\nSample data has been populated successfully!");
  } catch (error) {
    console.error("An error occurred:", error);
  } finally {
    await client.close();
    console.log("MongoDB connection closed.");
  }
}

populateDatabase();
