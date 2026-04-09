const fs = require('fs');
const path = require('path');
const { encode } = require('gpt-tokenizer');

console.log("======================================");
console.log("🔍 DSI EXACT TOKEN USAGE VERIFICATION");
console.log("======================================");

const dataFile = path.join(__dirname, 'data', 'alpaca_data.json');

if (!fs.existsSync(dataFile)) {
  console.log("❌ Dataset not found! Run the live compression demo first to download it.");
  process.exit(1);
}

console.log("1. Loading raw dataset...");
const rawText = fs.readFileSync(dataFile, 'utf8');
const records = JSON.parse(rawText);

console.log("2. Tokenizing raw text natively (this may take a few seconds)...");
const rawTokens = encode(rawText).length;
console.log(`   ✔️ Exact Raw Tokens: ${rawTokens.toLocaleString()}`);

console.log("3. Re-building DSI Index...");
const dsiIndex = [];
const BATCH_SIZE = 500;
const totalBatches = Math.ceil(records.length / BATCH_SIZE);

for (let b = 0; b < totalBatches; b++) {
  const batchStart = b * BATCH_SIZE;
  const batchEnd = Math.min(batchStart + BATCH_SIZE, records.length);
  const batch = records.slice(batchStart, batchEnd);
  
  const categories = new Set();
  batch.forEach((rec, i) => {
    const instruction = rec.instruction || '';
    const words = instruction.toLowerCase().split(/\s+/);
    if (words.some(w => ['code','program','write'].includes(w))) categories.add('coding');
    else if (words.some(w => ['explain','what','how'].includes(w))) categories.add('explanation');
  });
  
  const catStr = [...categories].slice(0, 3).join('+') || 'general';
  
  dsiIndex.push(
    `[2026-04-09] ENTITY:alpaca_batch_${String(b).padStart(4,'0')} | ACT:instruction_response | WHY:${catStr} | RES:${batch.length}_records | REF:cold_storage/alpaca_batch_${String(b).padStart(4,'0')}.md`
  );
}

const indexString = dsiIndex.join('\n');

console.log("4. Tokenizing DSI Index natively...");
const indexTokens = encode(indexString).length;
console.log(`   ✔️ Exact DSI Tokens: ${indexTokens.toLocaleString()}`);

console.log("\n======================================");
console.log("🏆 EXACT TOKEN COMPRESSION RESULTS");
console.log("======================================");
console.log(`Raw Payload:   ${rawTokens.toLocaleString()} tokens`);
console.log(`DSI Payload:   ${indexTokens.toLocaleString()} tokens`);
console.log(`Tokens Saved:  ${(rawTokens - indexTokens).toLocaleString()} tokens`);
const ratio = ((1 - indexTokens / rawTokens) * 100).toFixed(4);
console.log(`Reduction:     ${ratio}%`);
console.log("======================================\n");
