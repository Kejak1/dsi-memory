require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { GoogleGenAI } = require('@google/genai');

const DATA_DIR = path.join(__dirname, 'data');
const DATASET_FILE = path.join(DATA_DIR, 'dsi_dataset.json');
const HYPOTHESES_FILE = path.join(DATA_DIR, 'hypotheses.jsonl');

const isOllama = process.argv.includes('--ollama');

let ai;
if (!isOllama) {
  if (!process.env.GEMINI_API_KEY) {
    console.error("GEMINI_API_KEY is not set in .env! (Or use --ollama to run locally)");
    process.exit(1);
  }
  ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
}

if (!fs.existsSync(HYPOTHESES_FILE) || !fs.existsSync(DATASET_FILE)) {
  console.error("Data missing! Run bench:build and bench:run first.");
  process.exit(1);
}

const JUDGE_MODEL = isOllama ? 'qwen2.5:3b' : 'gemini-1.5-flash';

const dataset = JSON.parse(fs.readFileSync(DATASET_FILE, 'utf8'));
const qid2data = {};
dataset.forEach(d => qid2data[d.question_id] = d);

const hypotheses = fs.readFileSync(HYPOTHESES_FILE, 'utf8').trim().split('\n').map(line => JSON.parse(line));

function getPrompt(task, question, answer, response, isAbstention) {
  if (isAbstention) {
    return `I will give you an unanswerable question, an explanation, and a response from a model. Please answer yes if the model correctly identifies the question as unanswerable. The model could say that the information is incomplete, or some other information is given but the asked information is not.\n\nQuestion: ${question}\n\nExplanation: ${answer}\n\nModel Response: ${response}\n\nDoes the model correctly identify the question as unanswerable? Answer yes or no only.`;
  }
  if (['single-session-user', 'single-session-assistant', 'multi-session'].includes(task)) {
    return `I will give you a question, a correct answer, and a response from a model. Please answer yes if the response contains the correct answer. Otherwise, answer no. If the response is equivalent to the correct answer or contains all the intermediate steps to get the correct answer, you should also answer yes. If the response only contains a subset of the information required by the answer, answer no. \n\nQuestion: ${question}\n\nCorrect Answer: ${answer}\n\nModel Response: ${response}\n\nIs the model response correct? Answer yes or no only.`;
  } else if (task === 'temporal-reasoning') {
    return `I will give you a question, a correct answer, and a response from a model. Please answer yes if the response contains the correct answer. Otherwise, answer no. If the response is equivalent to the correct answer or contains all the intermediate steps to get the correct answer, you should also answer yes. If the response only contains a subset of the information required by the answer, answer no. In addition, do not penalize off-by-one errors for the number of days. If the question asks for the number of days/weeks/months, etc., and the model makes off-by-one errors (e.g., predicting 19 days when the answer is 18), the model's response is still correct. \n\nQuestion: ${question}\n\nCorrect Answer: ${answer}\n\nModel Response: ${response}\n\nIs the model response correct? Answer yes or no only.`;
  } else if (task === 'knowledge-update') {
    return `I will give you a question, a correct answer, and a response from a model. Please answer yes if the response contains the correct answer. Otherwise, answer no. If the response contains some previous information along with an updated answer, the response should be considered as correct as long as the updated answer is the required answer.\n\nQuestion: ${question}\n\nCorrect Answer: ${answer}\n\nModel Response: ${response}\n\nIs the model response correct? Answer yes or no only.`;
  } else if (task === 'single-session-preference') {
    return `I will give you a question, a rubric for desired personalized response, and a response from a model. Please answer yes if the response satisfies the desired response. Otherwise, answer no. The model does not need to reflect all the points in the rubric. The response is correct as long as it recalls and utilizes the user's personal information correctly.\n\nQuestion: ${question}\n\nRubric: ${answer}\n\nModel Response: ${response}\n\nIs the model response correct? Answer yes or no only.`;
  } else {
    return `Question: ${question}\n\nCorrect Answer: ${answer}\n\nModel Response: ${response}\n\nIs the model response correct? Answer yes or no only.`;
  }
}

async function callOllama(prompt) {
  const url = 'http://localhost:11434/api/generate';
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: JUDGE_MODEL,
        prompt: prompt,
        stream: false,
        options: { temperature: 0.0 }
      })
    });
    if (!res.ok) throw new Error(`Ollama Error: ${res.statusText}`);
    const data = await res.json();
    return data.response.trim();
  } catch (err) {
    throw err;
  }
}

async function gradeResponse(entry) {
  const ref = qid2data[entry.question_id];
  if (!ref) return null;
  
  const isAbstention = entry.question_id.endsWith('_abs');
  const prompt = getPrompt(ref.question_type, ref.question, ref.answer, entry.hypothesis, isAbstention);

  try {
     let labelStr = "";
     if (isOllama) {
        labelStr = await callOllama(prompt);
     } else {
        await new Promise(r => setTimeout(r, 4000)); // Gemini rate limit bypass
        const result = await ai.models.generateContent({
          model: JUDGE_MODEL,
          contents: prompt,
          config: { temperature: 0.0, maxOutputTokens: 10 }
        });
        labelStr = result.text.trim();
     }
     
     labelStr = labelStr.toLowerCase();
     const passed = labelStr.includes('yes') && !labelStr.includes('no');
     return { label: passed, type: ref.question_type };
  } catch(e) {
     console.error("Grading API Error: ", e.message);
     return { label: false, type: ref.question_type };
  }
}

async function run() {
  console.log(`Grading ${hypotheses.length} answers using Judge Model (${JUDGE_MODEL})...`);
  
  const typeCounts = {};
  const typePasses = {};
  let totalPasses = 0;

  for (let i = 0; i < hypotheses.length; i++) {
    const hyp = hypotheses[i];
    process.stdout.write(`Grading [${hyp.question_id}]... `);
    const grade = await gradeResponse(hyp);
    if (!grade) {
       console.log("Skipped (no ref data)");
       continue;
    }
    
    if (!typeCounts[grade.type]) {
      typeCounts[grade.type] = 0;
      typePasses[grade.type] = 0;
    }
    
    typeCounts[grade.type]++;
    if (grade.label) {
      typePasses[grade.type]++;
      totalPasses++;
      console.log('✅ Pass');
    } else {
      console.log('❌ Fail');
    }
  }

  console.log(`\n==========================================`);
  console.log(`🏆 DSI BENCHMARK SCORE`);
  console.log(`==========================================`);
  const overallAcc = (totalPasses / hypotheses.length * 100).toFixed(1);
  console.log(`OVERALL ACCURACY:    ${overallAcc}%  (${totalPasses}/${hypotheses.length})`);
  console.log(`------------------------------------------`);
  
  for (const type of Object.keys(typeCounts)) {
    const acc = (typePasses[type] / typeCounts[type] * 100).toFixed(1);
    console.log(`${type.padEnd(25)}: ${acc.padStart(4)}%  (${typePasses[type]}/${typeCounts[type]})`);
  }
}

run().catch(console.error);
