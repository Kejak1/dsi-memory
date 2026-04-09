const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, 'data');
const INPUT_FILE = path.join(DATA_DIR, 'longmemeval_s_cleaned.json');
const OUTPUT_FILE = path.join(DATA_DIR, 'dsi_dataset.json');

if (!fs.existsSync(INPUT_FILE)) {
  console.error("Dataset not found! Please run 'npm run bench:download' first.");
  process.exit(1);
}

console.log("Reading dataset...");
const rawData = JSON.parse(fs.readFileSync(INPUT_FILE, 'utf8'));

console.log(`Processing ${rawData.length} questions into DSI format...`);

const dsiDataset = rawData.map((entry, index) => {
  // We will simulate DSI processing by generating a DSI index for the haystack.
  // In DSI, a chat session becomes a pointer.
  // The actual cold storage is just a key-value mapping of REF -> full verbatim text.
  
  const dsiIndexLines = [];
  const coldStorage = {};
  
  const dates = entry.haystack_dates || [];
  const sessionIds = entry.haystack_session_ids || [];
  const sessions = entry.haystack_sessions || [];

  sessions.forEach((sessionTurns, sessIdx) => {
    const d = dates[sessIdx] || 'UNKNOWN_DATE';
    const sid = sessionIds[sessIdx] || `sess_${sessIdx}`;
    const refPath = `cold_storage/${sid}.md`;
    
    // Create verbatim text
    let verbatimText = sessionTurns.map(t => `**${t.role}**: ${t.content}`).join('\n\n');
    coldStorage[refPath] = verbatimText;

    // We simulate the LLM summarization. Since we don't want to burn API calls just to summarize 500 haystacks,
    // we extract a heuristic summary: the first 100 chars of the user's first query.
    let abstract = "chat_session";
    const firstUserTurn = sessionTurns.find(t => t.role === 'user');
    if (firstUserTurn && firstUserTurn.content) {
      abstract = firstUserTurn.content.substring(0, 50).replace(/[^a-zA-Z0-9 ]/g, '').trim().substring(0, 30).replace(/ /g, '_').toLowerCase();
    }
    
    if (!abstract) abstract = "general_chat";

    dsiIndexLines.push(`[${d}] ENTITY:session_${sid} | ACT:chat_interaction | WHY:${abstract} | RES:completed | REF:${refPath}`);
  });

  // Calculate compression stats just for fun
  const rawTokens = JSON.stringify(sessions).length / 4; 
  const dsiTokens = dsiIndexLines.join('\n').length / 4;

  if (index % 50 === 0) {
    console.log(`Processed ${index}/${rawData.length} questions...`);
  }

  return {
    question_id: entry.question_id,
    question_type: entry.question_type,
    question: entry.question,
    answer: entry.answer,
    dsi_index: dsiIndexLines.join('\n'), // Multi-line string,
    cold_storage: coldStorage,
    stats: {
      raw_tokens_est: Math.round(rawTokens),
      dsi_tokens_est: Math.round(dsiTokens)
    }
  };
});

fs.writeFileSync(OUTPUT_FILE, JSON.stringify(dsiDataset, null, 2));

console.log(`\n✅ Completed! Saved DSI-simulated dataset to ${OUTPUT_FILE}`);
const totalRaw = dsiDataset.reduce((sum, d) => sum + d.stats.raw_tokens_est, 0);
const totalDSI = dsiDataset.reduce((sum, d) => sum + d.stats.dsi_tokens_est, 0);
console.log(`Overall simulated compression: ${totalRaw.toLocaleString()} -> ${totalDSI.toLocaleString()} tokens est.`);
