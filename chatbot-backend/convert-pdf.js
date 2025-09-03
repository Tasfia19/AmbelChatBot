

const fs = require("fs");
const pdf = require("pdf-parse");

const pdfPath = "./Ambel.pdf"; 
const jsonOutputPath = "./Ambel.json"; 
async function convertPdfToQaJson() {
  try {
    console.log("Reading PDF file...");
    const dataBuffer = fs.readFileSync(pdfPath);
    const data = await pdf(dataBuffer);
    const rawText = data.text;
    console.log("PDF text extracted successfully.");

    const qaPairs = [];

    // --- FINAL "STATE MACHINE" PARSING LOGIC ---
    const lines = rawText
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("ambel.ca")); 

    let currentQuestion = null;
    let currentAnswerLines = [];

    // This function defines what we consider a "main heading" or "question"
    function isNewQuestion(line) {
      // A line is a new question if it's relatively short and doesn't start with a bullet point.
      // You can adjust these rules to be more specific if needed.
      const isNotBullet = !line.startsWith("●") && !line.startsWith("○");
      // A simple check for title-like lines or questions
      const looksLikeHeading = line.length < 60 || line.endsWith("?");
      return isNotBullet && looksLikeHeading;
    }

    for (const line of lines) {
      if (isNewQuestion(line)) {
        // We've found a new heading. This means the previous Q&A is complete.
        // Save the previous Q&A pair if it has content.
        if (currentQuestion && currentAnswerLines.length > 0) {
          qaPairs.push({
            question: currentQuestion,
            answer: currentAnswerLines.join(" "),
          });
        }
        // Start the new Q&A pair
        currentQuestion = line;
        currentAnswerLines = [];
      } else if (currentQuestion) {
        // If we have an active question, this line is part of its answer.
        currentAnswerLines.push(line);
      }
    }

    // After the loop, save the very last Q&A pair that was being built.
    if (currentQuestion && currentAnswerLines.length > 0) {
      qaPairs.push({
        question: currentQuestion,
        answer: currentAnswerLines.join(" "),
      });
    }
    // --- END OF FINAL PARSING LOGIC ---

    if (qaPairs.length === 0) {
      console.warn(
        "Warning: No Q&A pairs were found. Check your PDF format and the isNewQuestion function."
      );
    } else {
      fs.writeFileSync(
        jsonOutputPath,
        JSON.stringify(qaPairs, null, 2),
        "utf-8"
      );
      console.log(`Successfully extracted ${qaPairs.length} Q&A pairs.`);
      console.log(`JSON file saved to: ${jsonOutputPath}`);
    }
  } catch (error) {
    console.error("An error occurred:", error);
  }
}

convertPdfToQaJson();
