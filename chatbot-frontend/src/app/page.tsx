"use client";

import Image from "next/image";
import { useState, FormEvent } from "react";

export default function Home() {
  const [inputValue, setInputValue] = useState("");
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content: "Welcome to Ambel! How can I help you today?",
    },
  ]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!inputValue.trim()) return;

    const newUserMessage = { role: "user", content: inputValue };
    setMessages((prevMessages) => [...prevMessages, newUserMessage]);
    const currentInputValue = inputValue;
      setInputValue("");
    try {
      const response = await fetch("http://localhost:3001/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: currentInputValue,
          history: messages,
        }),
      });

      if (!response.ok) {
        throw new Error("Network response was not ok");
      }

      const data = await response.json();

      // Add the AI's response to the messages array
      const aiMessage = { role: "assistant", content: data.reply };
      setMessages((prevMessages) => [...prevMessages, aiMessage]);
    } catch (error) {
      console.error("Failed to send message:", error);
      // Optionally, add an error message to the chat
      const errorMessage = {
        role: "assistant",
        content:
          "Sorry, I'm having trouble connecting. Please try again later.",
      };
      setMessages((prevMessages) => [...prevMessages, errorMessage]);
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gray-100 p-4">
      <div className="flex flex-col w-full max-w-2xl h-[80vh] bg-white rounded-lg shadow-lg">
        <div className="flex items-center space-x-2 p-4">
          <Image src="/ambel.png" alt="Ambel Logo" width={32} height={32} />
          <h1 className="text-lg font-semibold">Ambel AI Chatbot</h1>
        </div>
        <hr />
        <div className="flex-1 p-6 overflow-y-auto">
          {messages.map((msg, index) => (
            <div
              key={index}
              className={`my-2 p-3 rounded-lg max-w-[80%] ${
                msg.role === "user"
                  ? "bg-blue-500 text-white self-end ml-auto"
                  : "bg-gray-200 text-black self-start"
              }`}
            >
              {msg.content}
            </div>
          ))}
        </div>

        <div className="p-4 border-t">
          <form onSubmit={handleSubmit} className="flex items-center space-x-2">
            <input
              type="text"
              placeholder="Type your message"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              className="flex-1 p-2 border rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="submit"
              className="px-4 py-2 bg-blue-500 text-white rounded-full hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              Send
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
