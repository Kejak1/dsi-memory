const fs = require('fs');
const path = require('path');

// Configuration
const TOTAL_FILES = 500;
const LINES_PER_FILE = 200; // Total ~100,000 lines of noise
const COLD_STORAGE_DIR = path.join(__dirname, 'cold_storage_niah');
const INDEX_FILE = path.join(__dirname, 'DSI_NIAH_INDEX.md');

// The Needle
const NEEDLE_SECRET = "CRIMSON-PENGUIN-99";
const NEEDLE_QUESTION = "What is the specific identity of the backup unit mentioned in the logs?";
const NEEDLE_FILE_INDEX = Math.floor(Math.random() * TOTAL_FILES);
const NEEDLE_LINE_INDEX = Math.floor(Math.random() * LINES_PER_FILE);

console.log("==========================================");
console.log("🌾 DSI: MASSIVE HAYSTACK GENERATOR FOR CLAUDE");
console.log("==========================================\n");

if (!fs.existsSync(COLD_STORAGE_DIR)) {
  fs.mkdirSync(COLD_STORAGE_DIR, { recursive: true });
}

const dsiIndex = [];

function generateGibberishLine() {
  const words = ["server", "timeout", "cluster", "node", "failed", "retry", "latency", "drop", "packet", "buffer", "overflow", "sync", "auth", "token", "refresh"];
  let line = `[SYS_${Math.floor(Math.random() * 9999)}] `;
  for(let i=0; i<10; i++) {
    line += words[Math.floor(Math.random() * words.length)] + " ";
  }
  return line.trim();
}

console.log(`Building ${TOTAL_FILES} haystack files (${TOTAL_FILES * LINES_PER_FILE} total lines of noise)...`);

for (let i = 0; i < TOTAL_FILES; i++) {
  const fileName = `niah_sys_log_${String(i).padStart(4, '0')}.md`;
  const filePath = path.join(COLD_STORAGE_DIR, fileName);
  
  let fileLines = [];
  for (let j = 0; j < LINES_PER_FILE; j++) {
    if (i === NEEDLE_FILE_INDEX && j === NEEDLE_LINE_INDEX) {
      fileLines.push(`[INFO] The specific identity of the backup unit is ${NEEDLE_SECRET}. This is for the DSI NIAH benchmark.`);
    } else {
      fileLines.push(generateGibberishLine());
    }
  }
  
  fs.writeFileSync(filePath, fileLines.join('\n'));
  
  // Create DSI pointer for this specific file
  // For the needle file, we slightly hint at security/passwords so the agent knows where to look.
  const reason = (i === NEEDLE_FILE_INDEX) ? "system+backup+identity+verification" : "system+network+timeouts+retries";
  
  dsiIndex.push(`[2026-04-09] ENTITY:${fileName} | ACT:log_rotation | WHY:${reason} | RES:archived | REF:cold_storage_niah/${fileName}`);
}

// Write the compiled DSI Index list
fs.writeFileSync(INDEX_FILE, dsiIndex.join('\n'));

console.log("\n✅ Generation Complete.");
console.log(`- Data saved to: ${COLD_STORAGE_DIR}`);
console.log(`- DSI Index saved to: ${INDEX_FILE}`);
console.log("\n[BLIND TEST READY] No spoiler provided. Use the DSI Index to find the needle.");
