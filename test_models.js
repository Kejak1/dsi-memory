require('dotenv').config();
const { GoogleGenAI } = require('@google/genai');

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

async function run() {
  try {
    const chat = ai.chats.create({
      model: 'gemini-2.0-flash',
      config: { temperature: 0.1 }
    });
    const response = await chat.sendMessage({ message: 'Hello!' });
    console.log("Response from 2.0-flash:", response.text);
  } catch (e) {
    console.error("2.0-flash error:", e.message);
  }

  try {
    const chat = ai.chats.create({
      model: 'gemini-1.5-flash',
      config: { temperature: 0.1 }
    });
    const response = await chat.sendMessage({ message: 'Hello!' });
    console.log("Response from 1.5-flash:", response.text);
  } catch (e) {
    console.error("1.5-flash error:", e.message);
  }
}
run();
