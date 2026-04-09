const fs = require('fs');
const path = require('path');
const { pipeline } = require('stream/promises');

const DATA_DIR = path.join(__dirname, 'data');
const FILE_URL = 'https://huggingface.co/datasets/xiaowu0162/longmemeval-cleaned/resolve/main/longmemeval_s_cleaned.json';
const OUTPUT_FILE = path.join(DATA_DIR, 'longmemeval_s_cleaned.json');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

console.log(`Downloading LongMemEval-S dataset...`);
console.log(`URL: ${FILE_URL}`);

async function download() {
  try {
    const res = await fetch(FILE_URL);
    if (!res.ok) {
        throw new Error(`Failed to fetch: ${res.status} ${res.statusText}`);
    }
    const fileStream = fs.createWriteStream(OUTPUT_FILE);
    await pipeline(res.body, fileStream);
    console.log(`\n✅ Download complete! Saved to: ${OUTPUT_FILE}`);
  } catch(e) {
    console.error("Download failed:", e);
  }
}

download();
