#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const VERSION = '1.0.0';
const COLD_DIR = 'cold_storage';

// ── Colors (ANSI) ──────────────────────────────────────────────
const c = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  red: '\x1b[31m',
  white: '\x1b[37m',
};

function log(msg) { console.log(msg); }
function success(msg) { log(`${c.green}✓${c.reset} ${msg}`); }
function warn(msg) { log(`${c.yellow}⚠${c.reset} ${msg}`); }
function error(msg) { log(`${c.red}✗${c.reset} ${msg}`); }
function info(msg) { log(`${c.blue}ℹ${c.reset} ${msg}`); }
function heading(msg) { log(`\n${c.bold}${c.cyan}${msg}${c.reset}`); }

// ── Banner ─────────────────────────────────────────────────────
function banner() {
  log('');
  log(`${c.bold}${c.magenta}  🧠 DSI: Dense Sourced Index${c.reset}`);
  log(`${c.dim}  Zero-DB Agent Memory for LLMs${c.reset}`);
  log(`${c.dim}  v${VERSION}${c.reset}`);
  log('');
}

// ── Help ───────────────────────────────────────────────────────
function showHelp() {
  banner();
  log(`${c.bold}Usage:${c.reset}  dsi <command> [options]\n`);
  log(`${c.bold}Commands:${c.reset}`);
  log(`  ${c.cyan}init${c.reset}              Create cold_storage/ directory and starter files`);
  log(`  ${c.cyan}compress${c.reset} <file>   Compress a verbose log file into DSI pointers`);
  log(`  ${c.cyan}verify${c.reset}            Validate all REF: pointers resolve to real files`);
  log(`  ${c.cyan}stats${c.reset}             Show token savings statistics`);
  log(`  ${c.cyan}help${c.reset}              Show this help message`);
  log(`  ${c.cyan}version${c.reset}           Show version number`);
  log('');
  log(`${c.bold}Examples:${c.reset}`);
  log(`  ${c.dim}$ dsi init${c.reset}`);
  log(`  ${c.dim}$ dsi compress ./LOG_HISTORY.md${c.reset}`);
  log(`  ${c.dim}$ dsi verify${c.reset}`);
  log(`  ${c.dim}$ dsi stats${c.reset}`);
  log('');
}

// ── INIT ───────────────────────────────────────────────────────
function cmdInit() {
  banner();
  heading('Initializing DSI...');

  // Create cold_storage/
  const coldPath = path.resolve(COLD_DIR);
  if (!fs.existsSync(coldPath)) {
    fs.mkdirSync(coldPath, { recursive: true });
    success(`Created ${c.bold}${COLD_DIR}/${c.reset}`);
  } else {
    info(`${c.bold}${COLD_DIR}/${c.reset} already exists`);
  }

  // Create .gitkeep in cold_storage
  const gitkeepPath = path.join(coldPath, '.gitkeep');
  if (!fs.existsSync(gitkeepPath)) {
    fs.writeFileSync(gitkeepPath, '');
    success(`Created ${c.bold}${COLD_DIR}/.gitkeep${c.reset}`);
  }

  // Create starter LOG_HISTORY.md if it doesn't exist
  const logPath = path.resolve('LOG_HISTORY.md');
  if (!fs.existsSync(logPath)) {
    const starter = `# Project Log History

> Initialize your project log here.

---

### 🏛️ Heritage Summary
_No archived history yet._

### 🗜️ DSI Archive Index
_No compressed entries yet._
`;
    fs.writeFileSync(logPath, starter);
    success(`Created starter ${c.bold}LOG_HISTORY.md${c.reset}`);
  } else {
    info(`${c.bold}LOG_HISTORY.md${c.reset} already exists`);
  }

  log('');
  success(`DSI initialized! Your cold storage is ready at ${c.bold}./${COLD_DIR}/${c.reset}`);
  info(`Add the DSI protocol to your agent's system prompt (see ${c.bold}DSI_PROTOCOL.md${c.reset})`);
  log('');
}

// ── COMPRESS ───────────────────────────────────────────────────
function cmdCompress(filePath) {
  banner();

  if (!filePath) {
    error('Missing file path. Usage: dsi compress <file>');
    log(`  ${c.dim}Example: dsi compress ./LOG_HISTORY.md${c.reset}`);
    process.exit(1);
  }

  const resolvedPath = path.resolve(filePath);
  if (!fs.existsSync(resolvedPath)) {
    error(`File not found: ${filePath}`);
    process.exit(1);
  }

  heading(`Analyzing ${path.basename(filePath)}...`);

  const content = fs.readFileSync(resolvedPath, 'utf-8');
  const lines = content.split('\n');
  const charCount = content.length;
  const estimatedTokens = Math.ceil(charCount / 4);

  info(`Lines: ${c.bold}${lines.length}${c.reset}`);
  info(`Characters: ${c.bold}${charCount.toLocaleString()}${c.reset}`);
  info(`Estimated tokens: ${c.bold}${estimatedTokens.toLocaleString()}${c.reset}`);

  // Find log entry blocks (### DATE: patterns)
  const entryPattern = /^###\s+DATE:\s*(\d{4}-\d{2}-\d{2})/;
  const entries = [];
  let currentEntry = null;

  for (let i = 0; i < lines.length; i++) {
    const match = lines[i].match(entryPattern);
    if (match) {
      if (currentEntry) {
        currentEntry.endLine = i - 1;
        entries.push(currentEntry);
      }
      currentEntry = {
        date: match[1],
        startLine: i,
        endLine: null,
        title: lines[i],
      };
    }
  }
  if (currentEntry) {
    currentEntry.endLine = lines.length - 1;
    entries.push(currentEntry);
  }

  if (entries.length === 0) {
    warn('No log entries found (expected format: ### DATE: YYYY-MM-DD | TYPE: ...)');
    info('DSI compression works on markdown logs with dated entry blocks.');
    process.exit(0);
  }

  heading(`Found ${entries.length} log entries`);
  entries.forEach((e, idx) => {
    const lineCount = e.endLine - e.startLine + 1;
    log(`  ${c.dim}${idx + 1}.${c.reset} ${c.bold}${e.date}${c.reset} — ${lineCount} lines`);
  });

  // Ensure cold_storage exists
  const coldPath = path.resolve(COLD_DIR);
  if (!fs.existsSync(coldPath)) {
    fs.mkdirSync(coldPath, { recursive: true });
    success(`Created ${c.bold}${COLD_DIR}/${c.reset}`);
  }

  // Archive verbatim content
  const timestamp = new Date().toISOString().split('T')[0];
  const archiveFilename = `log_archive_${timestamp}.md`;
  const archivePath = path.join(coldPath, archiveFilename);

  const verbatimContent = entries.map(e => {
    return lines.slice(e.startLine, e.endLine + 1).join('\n');
  }).join('\n\n---\n\n');

  fs.writeFileSync(archivePath, verbatimContent);
  success(`Archived verbatim text to ${c.bold}${COLD_DIR}/${archiveFilename}${c.reset}`);

  // Generate DSI pointers
  heading('Generating DSI pointers...');
  const pointers = entries.map(e => {
    const block = lines.slice(e.startLine, e.endLine + 1).join('\n');

    // Extract TYPE from the title line
    const typeMatch = e.title.match(/TYPE:\s*(.+)/);
    const type = typeMatch ? typeMatch[1].trim() : 'update';

    // Generate entity from type
    const entity = type.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/_+$/, '');

    // Count meaningful work lines
    const workLines = block.split('\n').filter(l => l.startsWith('- ')).length;

    const pointer = `\`[${e.date}] ENTITY:${entity} | ACT:${workLines}_changes | WHY:see_archive | RES:completed | REF:${COLD_DIR}/${archiveFilename}\``;
    log(`  ${c.green}→${c.reset} ${pointer}`);
    return pointer;
  });

  // Build compressed content
  const headerLines = [];
  let headerEnd = 0;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].match(entryPattern)) {
      headerEnd = i;
      break;
    }
    headerLines.push(lines[i]);
  }

  const compressed = [
    ...headerLines,
    '',
    '### 🏛️ Heritage Summary',
    `_${entries.length} log entries archived on ${timestamp}. See cold storage for full details._`,
    '',
    '### 🗜️ DSI Archive Index',
    ...pointers,
    '',
  ].join('\n');

  fs.writeFileSync(resolvedPath, compressed);

  const newCharCount = compressed.length;
  const newEstimatedTokens = Math.ceil(newCharCount / 4);
  const savedTokens = estimatedTokens - newEstimatedTokens;
  const savedPercent = Math.round((savedTokens / estimatedTokens) * 100);

  heading('Compression Complete!');
  log('');
  log(`  ${c.dim}Before:${c.reset}  ${c.bold}${estimatedTokens.toLocaleString()}${c.reset} tokens (${lines.length} lines)`);
  log(`  ${c.dim}After:${c.reset}   ${c.bold}${newEstimatedTokens.toLocaleString()}${c.reset} tokens (${compressed.split('\n').length} lines)`);
  log(`  ${c.green}${c.bold}Saved:   ${savedTokens.toLocaleString()} tokens (${savedPercent}% reduction)${c.reset}`);
  log('');
  success(`Verbatim archive: ${c.bold}${COLD_DIR}/${archiveFilename}${c.reset}`);
  success(`Compressed file:  ${c.bold}${path.basename(filePath)}${c.reset}`);
  log('');
}

// ── VERIFY ─────────────────────────────────────────────────────
function cmdVerify() {
  banner();
  heading('Verifying DSI pointers...');

  // Find all markdown files in current directory (non-recursive)
  const mdFiles = fs.readdirSync('.').filter(f => f.endsWith('.md'));
  let totalPointers = 0;
  let validPointers = 0;
  let brokenPointers = [];

  const refPattern = /REF:([^\s`|]+)/g;

  for (const file of mdFiles) {
    const content = fs.readFileSync(file, 'utf-8');
    let match;
    while ((match = refPattern.exec(content)) !== null) {
      totalPointers++;
      const refPath = match[1];
      const resolved = path.resolve(refPath);
      if (fs.existsSync(resolved)) {
        validPointers++;
      } else {
        brokenPointers.push({ file, ref: refPath });
      }
    }
  }

  if (totalPointers === 0) {
    info('No DSI pointers (REF: tags) found in current directory markdown files.');
    info('Run `dsi compress <file>` first to create DSI pointers.');
    log('');
    return;
  }

  log('');
  if (brokenPointers.length === 0) {
    success(`All ${c.bold}${totalPointers}${c.reset} DSI pointers are valid!`);
  } else {
    warn(`${validPointers}/${totalPointers} pointers valid, ${c.red}${brokenPointers.length} broken${c.reset}:`);
    brokenPointers.forEach(bp => {
      error(`  ${bp.file} → ${c.bold}${bp.ref}${c.reset} (file not found)`);
    });
  }

  // Check cold_storage exists
  const coldPath = path.resolve(COLD_DIR);
  if (fs.existsSync(coldPath)) {
    const coldFiles = fs.readdirSync(coldPath).filter(f => f !== '.gitkeep');
    info(`Cold storage: ${c.bold}${coldFiles.length}${c.reset} archive files`);
    coldFiles.forEach(f => {
      const stats = fs.statSync(path.join(coldPath, f));
      const kb = (stats.size / 1024).toFixed(1);
      log(`  ${c.dim}└─${c.reset} ${f} (${kb} KB)`);
    });
  } else {
    warn(`No ${c.bold}${COLD_DIR}/${c.reset} directory found. Run ${c.bold}dsi init${c.reset} first.`);
  }
  log('');
}

// ── STATS ──────────────────────────────────────────────────────
function cmdStats() {
  banner();
  heading('DSI Statistics');

  const coldPath = path.resolve(COLD_DIR);

  // Hot layer
  const mdFiles = fs.readdirSync('.').filter(f => f.endsWith('.md'));
  let hotChars = 0;
  let hotLines = 0;
  mdFiles.forEach(f => {
    const content = fs.readFileSync(f, 'utf-8');
    hotChars += content.length;
    hotLines += content.split('\n').length;
  });
  const hotTokens = Math.ceil(hotChars / 4);

  log('');
  log(`  ${c.bold}🔥 Hot Layer${c.reset} (active context)`);
  log(`  ${c.dim}Files:${c.reset}   ${mdFiles.length}`);
  log(`  ${c.dim}Lines:${c.reset}   ${hotLines.toLocaleString()}`);
  log(`  ${c.dim}Tokens:${c.reset}  ${hotTokens.toLocaleString()}`);

  // Cold layer
  if (fs.existsSync(coldPath)) {
    const coldFiles = fs.readdirSync(coldPath).filter(f => f !== '.gitkeep');
    let coldChars = 0;
    let coldLines = 0;
    coldFiles.forEach(f => {
      const content = fs.readFileSync(path.join(coldPath, f), 'utf-8');
      coldChars += content.length;
      coldLines += content.split('\n').length;
    });
    const coldTokens = Math.ceil(coldChars / 4);
    const totalTokens = hotTokens + coldTokens;
    const savingPercent = totalTokens > 0 ? Math.round((coldTokens / totalTokens) * 100) : 0;

    log('');
    log(`  ${c.bold}🧊 Cold Layer${c.reset} (archived context)`);
    log(`  ${c.dim}Files:${c.reset}   ${coldFiles.length}`);
    log(`  ${c.dim}Lines:${c.reset}   ${coldLines.toLocaleString()}`);
    log(`  ${c.dim}Tokens:${c.reset}  ${coldTokens.toLocaleString()}`);

    log('');
    log(`  ${c.bold}📊 Efficiency${c.reset}`);
    log(`  ${c.dim}Total memory:${c.reset}     ${totalTokens.toLocaleString()} tokens`);
    log(`  ${c.dim}Active cost:${c.reset}      ${hotTokens.toLocaleString()} tokens/session`);
    log(`  ${c.dim}Archived:${c.reset}         ${coldTokens.toLocaleString()} tokens (loaded on-demand)`);
    log(`  ${c.green}${c.bold}Token savings:    ${savingPercent}% per session${c.reset}`);
  } else {
    log('');
    warn(`No ${c.bold}${COLD_DIR}/${c.reset} directory. Run ${c.bold}dsi init${c.reset} first.`);
  }
  log('');
}

// ── Main Router ────────────────────────────────────────────────
const args = process.argv.slice(2);
const command = args[0];

switch (command) {
  case 'init':
    cmdInit();
    break;
  case 'compress':
    cmdCompress(args[1]);
    break;
  case 'verify':
    cmdVerify();
    break;
  case 'stats':
    cmdStats();
    break;
  case 'version':
  case '-v':
  case '--version':
    log(`dsi-memory v${VERSION}`);
    break;
  case 'help':
  case '-h':
  case '--help':
  case undefined:
    showHelp();
    break;
  default:
    error(`Unknown command: ${command}`);
    log(`Run ${c.bold}dsi help${c.reset} for available commands.`);
    process.exit(1);
}
