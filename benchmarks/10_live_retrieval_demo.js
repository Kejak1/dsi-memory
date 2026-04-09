const fs = require('fs');
const path = require('path');

// ─── ANSI Color Helpers ──────────────────────────────────────────
const c = {
  reset: '\x1b[0m', bold: '\x1b[1m', dim: '\x1b[2m',
  cyan: '\x1b[36m', green: '\x1b[32m', yellow: '\x1b[33m', magenta: '\x1b[35m'
};

const MODEL = 'qwen2.5:3b'; // Testing using User's Local Ollama
const OLLAMA_URL = 'http://127.0.0.1:11434/api/chat';

console.log(`\n${c.cyan}${c.bold}================================================================${c.reset}`);
console.log(`${c.bold} 🤖  DSI AGENTIC RETRIEVAL DEMO (Local Ollama: ${MODEL})${c.reset}`);
console.log(`${c.cyan}${c.bold}================================================================${c.reset}\n`);

// 1. Setup Mock Cold Storage and Index
console.log(`${c.dim}[1/4] Constructing Knowledge Base...${c.reset}`);
const coldStorage = {
  'cold_storage/sys_auth_logs.md': "Root admin token was rotated on 2026-04-01 to fix a CVE vulnerability.",
  'cold_storage/sys_db_logs.md': "Database backup failed. Re-run scheduled for midnight.",
  'cold_storage/sys_security_logs.md': "The top secret vault access code is 'OMEGA-ORION-99'. Do not share this.",
  'cold_storage/sys_network_logs.md': "VPC routing tables updated. No anomalies detected."
};

const dsiIndexLines = [
  "[2026-04-09] ENTITY:sys_auth_logs.md | ACT:system_logs | WHY:authentication+tokens | RES:rotated | REF:cold_storage/sys_auth_logs.md",
  "[2026-04-09] ENTITY:sys_db_logs.md | ACT:system_logs | WHY:database+backups | RES:failed | REF:cold_storage/sys_db_logs.md",
  "[2026-04-09] ENTITY:sys_security_logs.md | ACT:system_logs | WHY:vault+access+codes+secrets | RES:active | REF:cold_storage/sys_security_logs.md",
  "[2026-04-09] ENTITY:sys_network_logs.md | ACT:system_logs | WHY:vpc+networking | RES:updated | REF:cold_storage/sys_network_logs.md",
];
const dsiIndexString = dsiIndexLines.join('\n');

const SYSTEM_PROMPT = `
You are an autonomous AI Agent with a Dense Sourced Index (DSI).
Your task is to answer user queries using EXACT facts from your memory.

You currently only have the Index loaded into your context.
Here is your DSI Index:
---
${dsiIndexString}
---

RULES:
1. If you do not have enough specific verbatim knowledge to answer the question, you MUST request the file from cold storage.
2. To request a file, reply EXACTLY with: REQUEST_REF: <path>
3. Look at the 'WHY' field in the index to guess which file has the answer.
4. Once I provide you the file's contents, analyze it and give the final answer.
`;

async function chat(messages) {
  const res = await fetch(OLLAMA_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: MODEL,
      messages: messages,
      stream: false,
      options: { temperature: 0.0 } // 0 temp for deterministic actions
    })
  });
  if (!res.ok) throw new Error("Ollama failure: " + res.statusText);
  const data = await res.json();
  return data.message.content.trim();
}

async function run() {
  const question = "What is the top secret vault access code?";
  console.log(`\n${c.bold}User Request:${c.reset} ${c.yellow}"${question}"${c.reset}\n`);

  let messages = [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: `QUESTION: ${question}` }
  ];

  let loop = 1;
  const maxLoops = 4;
  
  while (loop <= maxLoops) {
    process.stdout.write(`${c.dim}[Agent Thinking...] ->${c.reset} `);
    let reply;
    try {
      reply = await chat(messages);
    } catch (e) {
      console.log(`\n${c.red}Failed to reach Ollama: ${e.message}${c.reset}`);
      return;
    }
    
    console.log(`\n${c.cyan}${reply}${c.reset}\n`);
    
    if (reply.includes('REQUEST_REF:')) {
      const match = reply.match(/REQUEST_REF:\s*(\S+)/);
      if (match) {
        const reqPath = match[1];
        console.log(`${c.magenta}[Trigger] Agent requested cold storage fetch: ${c.bold}${reqPath}${c.reset}`);
        
        if (coldStorage[reqPath]) {
          console.log(`${c.green}[System] Injecting exact file text into context window. (0 wasted tokens!)${c.reset}\n`);
          messages.push({ role: 'assistant', content: reply });
          messages.push({ role: 'user', content: `[SYSTEM AUTO-FETCH SUCCESS]\nContents of ${reqPath}:\n"""\n${coldStorage[reqPath]}\n"""\n\nYou now have the verbatim data. Please answer the user's initial question.` });
        } else {
          console.log(`${c.red}[System] File not found!${c.reset}\n`);
          messages.push({ role: 'user', content: "SYSTEM ERROR: File not found." });
        }
      }
      loop++;
    } else {
      console.log(`\n${c.green}${c.bold}✅ MISSION ACCOMPLISHED.${c.reset}`);
      console.log(`${c.dim}The agent successfully navigated the DSI Index and retrieved verbatim file facts.${c.reset}\n`);
      break;
    }
  }
}

run().catch(console.error);
