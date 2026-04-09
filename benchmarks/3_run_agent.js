require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { GoogleGenAI } = require('@google/genai');

const DATA_DIR = path.join(__dirname, 'data');
const DATASET_FILE = path.join(DATA_DIR, 'dsi_dataset.json');
const OUTPUT_FILE = path.join(DATA_DIR, 'hypotheses.jsonl');

const isOllama = process.argv.includes('--ollama');
const isTestRun = process.argv.includes('--test');

let ai;
if (!isOllama) {
  if (!process.env.GEMINI_API_KEY) {
    console.error("GEMINI_API_KEY is not set in .env! (Or use --ollama to run locally)");
    process.exit(1);
  }
  ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
}

if (!fs.existsSync(DATASET_FILE)) {
  console.error("Dataset not found! Please run 'npm run bench:build' first.");
  process.exit(1);
}

const MODEL = isOllama ? 'qwen2.5:3b' : 'gemini-1.5-flash';
const dataset = JSON.parse(fs.readFileSync(DATASET_FILE, 'utf8'));
const targetData = isTestRun ? dataset.slice(0, 5) : dataset;

console.log(`Starting Agent Run with ${isOllama ? 'Ollama' : 'Gemini'} [Model: ${MODEL}] on ${targetData.length} questions...`);

const SYSTEM_PROMPT = `
You are an AI assistant with a Dense Sourced Index (DSI) memory system.
You will be given a DSI Index consisting of pointers to your past chat sessions.
Each pointer looks like: [DATE] ENTITY:X | ACT:Y | WHY:Z | RES:W | REF:filepath

When asked a question, you must:
1. Try to answer the question using the index if possible.
2. If the index alone is not enough to answer accurately, you can retrieve the verbatim text from cold storage by replying EXACTLY with:
   REQUEST_REF: filepath
3. You can request ONE file at a time. I will reply with the file contents.
4. Once you have enough context, provide your final answer clearly.

DO NOT hallucinate details. Use REQUEST_REF whenever unsure.
`;

async function callOllama(messages) {
  const url = 'http://localhost:11434/api/chat';
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: MODEL,
        messages: messages,
        stream: false,
        options: { temperature: 0.1, num_ctx: 8192 }
      })
    });
    if (!res.ok) throw new Error(`Ollama Error: ${res.statusText}`);
    const data = await res.json();
    return data.message.content.trim();
  } catch (err) {
    throw err;
  }
}

async function processQuestion(entry) {
  let prompt = `Here is your DSI Index:\n\n${entry.dsi_index}\n\nQUESTION: ${entry.question}`;
  let attempt = 0;
  const MAX_RETRIEVALS = 10;
  
  // Track history for Ollama
  let messages = [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: prompt }
  ];

  let chat = null;
  if (!isOllama) {
    chat = ai.chats.create({
      model: MODEL,
      config: { systemInstruction: SYSTEM_PROMPT, temperature: 0.1 }
    });
  }

  while (attempt < MAX_RETRIEVALS) {
    let responseText = "";
    try {
      if (isOllama) {
        responseText = await callOllama(messages);
        messages.push({ role: 'assistant', content: responseText });
      } else {
        await new Promise(r => setTimeout(r, 8000)); // Gemini rate limit bypass
        const result = await chat.sendMessage({ message: prompt });
        responseText = result.text.trim();
      }
    } catch (err) {
      console.error(`\nAPI Error on question ${entry.question_id}:`, err.message);
      return "ERROR: API Failure";
    }

    if (responseText.includes("REQUEST_REF:")) {
      const match = responseText.match(/REQUEST_REF:\s*(cold_storage\/[^\s\n]+)/);
      if (match && match[1]) {
        const refPath = match[1];
        if (entry.cold_storage[refPath]) {
          prompt = `Contents of ${refPath}:\n\n${entry.cold_storage[refPath]}\n\nYou may provide your answer now or REQUEST_REF another file if needed. Question was: ${entry.question}`;
        } else {
          prompt = `SYSTEM: File ${refPath} not found. Please check your spelling or answer with available info.`;
        }
      } else {
         prompt = `SYSTEM: Invalid REQUEST_REF format. Provide your final answer.`;
      }
      if (isOllama) messages.push({ role: 'user', content: prompt });
      attempt++;
    } else {
      return responseText;
    }
  }
  return "ERROR: Max retrievals exceeded";
}

async function run() {
  if (fs.existsSync(OUTPUT_FILE)) fs.unlinkSync(OUTPUT_FILE);

  let completed = 0;
  for (const entry of targetData) {
    process.stdout.write(`Q [${entry.question_id}]... `);
    const hypothesis = await processQuestion(entry);
    
    fs.appendFileSync(OUTPUT_FILE, JSON.stringify({
      question_id: entry.question_id,
      hypothesis: hypothesis
    }) + '\n');
    completed++;
    console.log(`Done (${completed}/${targetData.length})`);
  }
  console.log(`\n✅ Saved answers to ${OUTPUT_FILE}`);
}

run().catch(console.error);
