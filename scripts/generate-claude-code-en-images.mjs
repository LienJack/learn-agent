import { writeFile, mkdir, rename, rm } from 'node:fs/promises';
import { existsSync, statSync, readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import sharp from 'sharp';

const repoRoot = process.cwd();
const assetDir = path.join(repoRoot, 'src/content/blog/en/AI/Claude code/assets');
const tmpDir = path.join(repoRoot, 'tmp');
const promptOut = path.join(tmpDir, 'claude-code-en-image-prompts.json');
const onlyCovers = process.argv.includes('--covers-only');

const W = 1672;
const H = 941;
const SPECIAL_SIZE = { '02-photo-05.png': [1448, 1086] };
const FONT = 'Trebuchet MS, Avenir Next, Helvetica, Arial, sans-serif';
const HAND_FONT = 'Comic Sans MS, Bradley Hand, Marker Felt, Trebuchet MS, sans-serif';
const INK = '#221f1a';
const MUTED = '#686154';
const PAPER = '#f7f0df';
const PAPER_DARK = '#eadfca';
const CARD = '#fffaf0';
const YELLOW = '#efd17a';
const PALE_YELLOW = '#f8e7a9';
const BLUE = '#d7e6ef';
const GREEN = '#dce9d3';
const PINK = '#ead9d2';

const covers = [
  ['00-cover-claude-code-runtime.jpg', 'Claude Code Source Analysis', 'From Model API to Agent Runtime', ['Model API', 'QueryEngine', 'ReAct Loop', 'Context', 'Tools', 'MCP / Skill', 'Plan Mode']],
  ['01-cover-engineering-architecture.jpg', 'Engineering Architecture', 'The runtime shell around the model', ['Model API', 'QueryEngine', 'Tools', 'Context / State', 'Security', 'Agents']],
  ['02-cover-react-loop.jpg', 'The ReAct Main Loop', 'Observe, reason, act, then write back', ['Observe', 'Reason', 'Act', 'Tool Result', 'Next Turn']],
  ['03-cover-prompt-runtime.jpg', 'Prompt Construction', 'How each model request is assembled', ['System Rules', 'Runtime Context', 'Memory', 'Tools', 'Messages']],
  ['04-1-cover-context-management.jpg', 'Context Management', 'Keep long-running work coherent', ['Working Set', 'Tool Results', 'Compression', 'Recent Tail']],
  ['04-2-cover-context-governance.jpg', 'Context Governance', 'Visibility, authority, and budget control', ['Visibility', 'Authority', 'Budget', 'Traceability']],
  ['05-0-cover-tools-pipeline.jpg', 'Tools Overview', 'Intent becomes a governed tool call', ['Schema', 'Permission', 'Execution', 'Result']],
  ['05-1-cover-file-tools.jpg', 'File Tools', 'Safe reads, edits, writes, and verification', ['Read', 'Edit', 'Write', 'Verify']],
  ['05-2-cover-terminal-tool.jpg', 'Terminal Tools', 'Command execution inside boundaries', ['Shell', 'cwd', 'Sandbox', 'Output']],
  ['05-3-cover-workflow-task.jpg', 'Task Management', 'Plans, todos, and runtime task state', ['Plan', 'Todo', 'Runtime Task', 'Status']],
  ['06-cover-mcp-bridge.jpg', 'MCP Integration', 'External capabilities enter the tool pipeline', ['Servers', 'Tools', 'Resources', 'Prompts']],
  ['07-cover-skill-package.jpg', 'Skills', 'Reusable task methods for agents', ['Discover', 'Load', 'Render', 'Execute']],
  ['08-1-cover-agent-collaboration.jpg', 'Agent Collaboration', 'Sub-agents with isolation and observability', ['Main Agent', 'Child Agent', 'Fork', 'Result']],
  ['08-2-cover-agent-orchestration.jpg', 'Agent Orchestration', 'Split work, coordinate, converge', ['Route', 'Parallel', 'Review', 'Merge']],
  ['09-1-cover-plan-mode.jpg', 'Planning Mode', 'A safe boundary before execution', ['Explore', 'Decide', 'Plan', 'Approve']],
  ['09-2-cover-plan-control-plane.jpg', 'Planning Control Plane', 'How agent systems govern execution', ['Workflow', 'Guardrails', 'State', 'Policy']],
].map(([file, title, subtitle, nodes]) => ({ file, title, subtitle, nodes, prompt: `English editorial technical cover for ${title}: ${subtitle}. Hand-drawn ink on off-white paper, short English labels only.` }));

const photos = [
  { file: '01-photo-01-engineering-shell.png', title: 'Engineering Shell Around the Model', subtitle: 'The model can reason; the runtime touches the project.', layout: 'shell', nodes: ['Model API', 'Files', 'Shell', 'Git', 'Tests', 'Permissions'], highlights: ['Model API', 'Permissions'] },
  { file: '02-photo-05.png', title: 'Claude Code Functional Architecture', subtitle: 'Layered runtime capabilities around the reasoning core.', layout: 'rings', nodes: ['Model API', 'QueryEngine', 'Tools', 'Context / State', 'Agent Collaboration', 'Security'], highlights: ['QueryEngine', 'Security'] },
  { file: '01-photo-02-capability-layers.png', title: 'Capability Layers', subtitle: 'Capabilities are engineered around the model one layer at a time.', layout: 'stack', nodes: ['Model API', 'QueryEngine', 'Tools', 'Context / Memory', 'Agents', 'Security Base'], highlights: ['Tools', 'Security Base'] },
  { file: '01-photo-03-runtime-flow.png', title: 'Runtime Flow', subtitle: 'A user prompt becomes a governed multi-step agent run.', layout: 'pipeline', nodes: ['User Prompt', 'QueryEngine', 'Model Call', 'Tool Intent', 'Host Runtime', 'Tool Result', 'Response'], highlights: ['QueryEngine', 'Host Runtime'] },
  { file: '01-photo-04-code-load-bearing-chain.png', title: 'Load-Bearing Source Chain', subtitle: 'Architecture understanding comes from following code paths.', layout: 'pipeline', nodes: ['Source Files', 'Module Map', 'Call Chain', 'Runtime Behavior', 'Architecture Insight'], highlights: ['Call Chain', 'Insight'] },
  { file: '02-photo-01-react-loop.png', title: 'Minimal ReAct Loop', subtitle: 'Reasoning stays grounded by repeated observation and action.', layout: 'cycle', nodes: ['Observe', 'Reason', 'Act', 'Tool Result'], highlights: ['Observe', 'Act'] },
  { file: '02-photo-02-state-machine.png', title: 'State Drives the Main Loop', subtitle: 'The loop revolves around a durable State object.', layout: 'hub', center: 'State', nodes: ['messages', 'toolUseContext', 'turnCount', 'compactCheck', 'aborted'], highlights: ['messages', 'compactCheck'] },
  { file: '02-photo-03-agent-run.png', title: 'submitMessage Starts an Agent Run', subtitle: 'A single user input expands into a controlled runtime loop.', layout: 'pipeline', nodes: ['submitMessage', 'Build Context', 'Model Turn', 'Tool Use', 'Write Back', 'Final Answer'], highlights: ['Model Turn', 'Write Back'] },
  { file: '02-photo-04-observe-compact.png', title: 'Observation Write-Back', subtitle: 'Tool results become memory, then context size is checked.', layout: 'pipeline', nodes: ['Tool Result', 'Append Message', 'Rebuild Context', 'Token Check', 'Auto-Compact', 'Next Turn'], highlights: ['Append Message', 'Auto-Compact'] },
  { file: '03-photo-01-prompt-runtime-workbench.png', title: 'Prompt Runtime Workbench', subtitle: 'Each turn assembles a fresh model request.', layout: 'workbench', nodes: ['System Rules', 'Runtime Env', 'Project Memory', 'Tools', 'Messages', 'User Input', 'Model Request'], highlights: ['Project Memory', 'Model Request'] },
  { file: '03-photo-03-memory-layers.png', title: 'CLAUDE.md Memory Layers', subtitle: 'Rules are layered so authority and privacy stay clear.', layout: 'stack', nodes: ['Managed Memory', 'User Memory', 'Project Memory', 'Local Memory', 'Effective Context'], highlights: ['Project Memory', 'Effective Context'] },
  { file: '03-photo-04-cache-boundary.png', title: 'Prompt Cache Boundary', subtitle: 'Stable prefix stays cacheable; dynamic tail changes every turn.', layout: 'split', nodes: ['Stable System Rules', 'Tools Schema', 'Project Memory', 'Dynamic Messages', 'Tool Results', 'Current Input'], highlights: ['Stable Prefix', 'Dynamic Tail'] },
  { file: '04-photo-01-context-workbench.png', title: 'Context Workbench', subtitle: 'Claude Code rebuilds the working set on every turn.', layout: 'workbench', nodes: ['Rules', 'Files', 'Tool Results', 'Summary', 'Recent Tail', 'State', 'Next Request'], highlights: ['Working Set', 'Next Request'] },
  { file: '04-photo-02-token-failures.png', title: 'Token Growth Failure Modes', subtitle: 'Long sessions fail through overflow, noise, and stale context.', layout: 'three', nodes: ['Overflow', 'Noise', 'Stale Facts'], highlights: ['Overflow', 'Noise'] },
  { file: '04-photo-03-compact-defenses.png', title: 'Compression Defenses', subtitle: 'Claude Code escalates from light trimming to heavier compaction.', layout: 'ladder', nodes: ['Snip Output', 'Summarize', 'Auto-Compact', 'Reset Scope'], highlights: ['Summarize', 'Auto-Compact'] },
  { file: '04-photo-04-recent-tail.png', title: 'Summary Plus Recent Tail', subtitle: 'Old context is summarized while recent turns stay verbatim.', layout: 'split', nodes: ['Long History', 'Summary', 'Recent Tail', 'Next Turn'], highlights: ['Summary', 'Recent Tail'] },
  { file: '05-photo-01-tool-contract.png', title: 'Tool.ts Runtime Contract', subtitle: 'Every tool exposes shape, permission, execution, and rendering.', layout: 'contract', nodes: ['name', 'description', 'inputSchema', 'permission', 'call()', 'render()'], highlights: ['inputSchema', 'permission'] },
  { file: '05-photo-02-structured-intent.png', title: 'Intent Becomes a Tool Call', subtitle: 'Natural language turns into structured runtime action.', layout: 'pipeline', nodes: ['Need file', 'Tool Choice', 'JSON Args', 'Permission', 'Host Action', 'Tool Result'], highlights: ['JSON Args', 'Tool Result'] },
  { file: '05-photo-03-permission-gates.png', title: 'Two Permission Gates', subtitle: 'A tool must be visible first, then allowed to execute.', layout: 'gates', nodes: ['Tool Visibility', 'Model Chooses', 'Execution Permission', 'Allowed Action'], highlights: ['Visibility Gate', 'Execution Gate'] },
  { file: '05-photo-04-tool-lifecycle.png', title: 'Tool Execution Lifecycle', subtitle: 'Discovery, validation, permission, execution, and write-back.', layout: 'pipeline', nodes: ['Discover', 'Expose', 'Validate', 'Approve', 'Execute', 'Write Back'], highlights: ['Approve', 'Write Back'] },
].map((item) => ({ ...item, prompt: `English hand-drawn technical blog illustration for ${item.title}: ${item.subtitle}. Off-white paper, black ink line art, pale yellow highlights, short English labels only: ${item.nodes.join(', ')}.` }));

function esc(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[char]);
}

function wrap(text, max = 18) {
  const words = String(text).split(/\s+/);
  const lines = [];
  let current = '';
  for (const word of words) {
    if (!current) current = word;
    else if ((current + ' ' + word).length <= max) current += ' ' + word;
    else {
      lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines;
}

function textBlock(text, x, y, { size = 34, color = INK, anchor = 'middle', weight = 700, max = 18, font = HAND_FONT, lineHeight = 1.18 } = {}) {
  return wrap(text, max).map((line, index) => `<text x="${x}" y="${y + index * size * lineHeight}" text-anchor="${anchor}" font-family="${font}" font-size="${size}" font-weight="${weight}" fill="${color}">${esc(line)}</text>`).join('\n');
}

function paper(width, height) {
  return `
  <defs>
    <filter id="paperNoise" x="0" y="0" width="100%" height="100%">
      <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="3" seed="7" result="noise"/>
      <feColorMatrix type="saturate" values="0"/>
      <feComponentTransfer><feFuncA type="table" tableValues="0 0.05"/></feComponentTransfer>
      <feBlend in="SourceGraphic" in2="noise" mode="multiply"/>
    </filter>
    <marker id="arrow" markerWidth="14" markerHeight="14" refX="11" refY="7" orient="auto" markerUnits="strokeWidth">
      <path d="M2,2 L12,7 L2,12" fill="none" stroke="${INK}" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"/>
    </marker>
    <pattern id="dots" x="0" y="0" width="80" height="80" patternUnits="userSpaceOnUse">
      <circle cx="8" cy="8" r="1.4" fill="#d7c8aa" opacity="0.35"/>
    </pattern>
  </defs>
  <rect width="${width}" height="${height}" fill="${PAPER}" filter="url(#paperNoise)"/>
  <rect width="${width}" height="${height}" fill="url(#dots)" opacity="0.36"/>
  <path d="M48 92 C190 84,260 101,395 88 M1225 88 C1350 105,1480 72,1610 95 M70 ${height - 92} C270 ${height - 64},420 ${height - 110},610 ${height - 74} M1090 ${height - 88} C1270 ${height - 130},1440 ${height - 62},1602 ${height - 88}" fill="none" stroke="#c9bea4" stroke-width="2" opacity="0.45" stroke-dasharray="8 12"/>
  ${circuitTexture(width, height)}
  `;
}

function circuitTexture(width, height) {
  const left = `<g opacity="0.32" stroke="#b7ad98" stroke-width="2" fill="none"><path d="M0 128 H130 l42 42 h88"/><path d="M0 206 H240 l36 -36 h115"/><path d="M0 696 H185 l45 52 h102"/><circle cx="130" cy="128" r="7"/><circle cx="260" cy="170" r="7"/><circle cx="391" cy="170" r="7"/><circle cx="185" cy="696" r="7"/></g>`;
  const right = `<g opacity="0.28" stroke="#b7ad98" stroke-width="2" fill="none"><path d="M${width} 145 H${width - 125} l-44 42 h-82"/><path d="M${width} 722 H${width - 210} l-32 -42 h-112"/><circle cx="${width - 125}" cy="145" r="7"/><circle cx="${width - 251}" cy="187" r="7"/><circle cx="${width - 210}" cy="722" r="7"/></g>`;
  return left + right;
}

function card(x, y, w, h, { fill = CARD, stroke = INK, highlight = false, radius = 24, dashed = false } = {}) {
  const hl = highlight ? `<rect x="${x + 8}" y="${y + 8}" width="${w}" height="${h}" rx="${radius}" fill="${YELLOW}" opacity="0.46"/>` : '';
  return `${hl}<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${radius}" fill="${fill}" stroke="${stroke}" stroke-width="4" ${dashed ? 'stroke-dasharray="10 10"' : ''}/><rect x="${x + 7}" y="${y + 6}" width="${w - 14}" height="${h - 12}" rx="${Math.max(radius - 6, 8)}" fill="none" stroke="${stroke}" stroke-width="1.5" opacity="0.5"/>`;
}

function arrow(x1, y1, x2, y2, curved = 0) {
  if (curved) {
    const mx = (x1 + x2) / 2;
    const my = (y1 + y2) / 2 - curved;
    return `<path d="M${x1} ${y1} Q${mx} ${my} ${x2} ${y2}" fill="none" stroke="${INK}" stroke-width="4" stroke-linecap="round" marker-end="url(#arrow)"/>`;
  }
  return `<path d="M${x1} ${y1} C${x1 + 35} ${y1 + 7}, ${x2 - 35} ${y2 - 7}, ${x2} ${y2}" fill="none" stroke="${INK}" stroke-width="4" stroke-linecap="round" marker-end="url(#arrow)"/>`;
}

function icon(kind, x, y, scale = 1) {
  const s = scale;
  const common = `stroke="${INK}" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"`;
  if (kind === 'gear') return `<g transform="translate(${x} ${y}) scale(${s})"><circle cx="0" cy="0" r="24" ${common}/><circle cx="0" cy="0" r="8" ${common}/><path d="M0 -40 V-28 M0 28 V40 M-40 0 H-28 M28 0 H40 M-28 -28 L-20 -20 M28 -28 L20 -20 M-28 28 L-20 20 M28 28 L20 20" ${common}/></g>`;
  if (kind === 'terminal') return `<g transform="translate(${x} ${y}) scale(${s})"><rect x="-44" y="-30" width="88" height="60" rx="8" ${common}/><path d="M-28 -8 l16 14 -16 14 M-4 20 H22" ${common}/></g>`;
  if (kind === 'file') return `<g transform="translate(${x} ${y}) scale(${s})"><path d="M-25 -36 H12 L32 -16 V36 H-25 Z" ${common}/><path d="M12 -36 V-16 H32 M-12 0 H14 M-12 14 H18" ${common}/></g>`;
  if (kind === 'shield') return `<g transform="translate(${x} ${y}) scale(${s})"><path d="M0 -42 C18 -30 34 -32 42 -30 C40 8 28 31 0 44 C-28 31 -40 8 -42 -30 C-34 -32 -18 -30 0 -42 Z" ${common}/><path d="M-16 3 l11 12 l24 -28" ${common}/></g>`;
  if (kind === 'loop') return `<g transform="translate(${x} ${y}) scale(${s})"><path d="M-32 -2 C-28 -35,22 -39,36 -8" ${common} marker-end="url(#arrow)"/><path d="M32 8 C25 38,-26 39,-37 6" ${common} marker-end="url(#arrow)"/><circle cx="0" cy="0" r="8" fill="${YELLOW}" stroke="${INK}" stroke-width="3"/></g>`;
  if (kind === 'db') return `<g transform="translate(${x} ${y}) scale(${s})"><ellipse cx="0" cy="-28" rx="35" ry="13" ${common}/><path d="M-35 -28 V28 C-35 45,35 45,35 28 V-28" ${common}/><path d="M-35 0 C-35 17,35 17,35 0" ${common}/></g>`;
  if (kind === 'agent') return `<g transform="translate(${x} ${y}) scale(${s})"><rect x="-36" y="-28" width="72" height="56" rx="18" fill="#fff8e8" stroke="${INK}" stroke-width="3"/><circle cx="-14" cy="0" r="6" fill="${INK}"/><circle cx="14" cy="0" r="6" fill="${INK}"/><path d="M0 -28 V-45 M-18 28 q18 14 36 0" ${common}/><circle cx="0" cy="-49" r="5" fill="${YELLOW}" stroke="${INK}" stroke-width="2"/></g>`;
  return `<g transform="translate(${x} ${y}) scale(${s})"><circle cx="0" cy="0" r="32" fill="${PALE_YELLOW}" stroke="${INK}" stroke-width="3"/><path d="M-18 0 H18 M0 -18 V18" ${common}/></g>`;
}

function titleArea(title, subtitle, width) {
  return `<g>${textBlock(title, width / 2, 78, { size: 54, max: 34 })}<path d="M${width / 2 - 260} 99 C${width / 2 - 100} 112,${width / 2 + 90} 96,${width / 2 + 260} 106" fill="none" stroke="${YELLOW}" stroke-width="8" opacity="0.85" stroke-linecap="round"/>${textBlock(subtitle, width / 2, 145, { size: 25, color: MUTED, weight: 500, max: 72, font: FONT })}</g>`;
}

function drawNode(label, x, y, w = 210, h = 112, highlight = false, iconKind = 'node') {
  return `<g>${card(x - w / 2, y - h / 2, w, h, { highlight })}${icon(iconKind, x, y - 18, 0.55)}${textBlock(label, x, y + 36, { size: 25, max: 18 })}</g>`;
}

function photoSvg(item) {
  const [width, height] = SPECIAL_SIZE[item.file] ?? [W, H];
  const bodyTop = 190;
  const bodyBottom = height - 94;
  let body = '';

  if (item.layout === 'pipeline') {
    const nodes = item.nodes;
    const gap = (width - 260) / (nodes.length - 1);
    const y = bodyTop + 250;
    body += nodes.map((n, i) => drawNode(n, 130 + i * gap, y + (i % 2 ? 42 : -20), 190, 112, item.highlights?.some((h) => n.includes(h) || h.includes(n)), ['file','gear','terminal','shield','db','loop','agent'][i % 7])).join('');
    for (let i = 0; i < nodes.length - 1; i++) body += arrow(130 + i * gap + 100, y + (i % 2 ? 42 : -20), 130 + (i + 1) * gap - 100, y + ((i + 1) % 2 ? 42 : -20));
  } else if (item.layout === 'cycle') {
    const cx = width / 2, cy = bodyTop + 310, r = 230;
    const pts = item.nodes.map((_, i) => [cx + Math.cos(-Math.PI / 2 + i * Math.PI * 2 / item.nodes.length) * r, cy + Math.sin(-Math.PI / 2 + i * Math.PI * 2 / item.nodes.length) * r]);
    body += `<circle cx="${cx}" cy="${cy}" r="145" fill="${CARD}" stroke="${INK}" stroke-width="4"/><circle cx="${cx}" cy="${cy}" r="88" fill="${PALE_YELLOW}" stroke="${INK}" stroke-width="3"/>${textBlock('ReAct', cx, cy + 10, { size: 44 })}`;
    body += item.nodes.map((n, i) => drawNode(n, pts[i][0], pts[i][1], 190, 104, item.highlights?.includes(n), ['file','gear','terminal','db'][i])).join('');
    for (let i = 0; i < pts.length; i++) body += arrow(pts[i][0], pts[i][1], pts[(i + 1) % pts.length][0], pts[(i + 1) % pts.length][1], -50);
  } else if (item.layout === 'rings') {
    const cx = width / 2, cy = height / 2 + 40;
    body += `<ellipse cx="${cx}" cy="${cy}" rx="470" ry="285" fill="#fff7e6" stroke="${INK}" stroke-width="4"/><ellipse cx="${cx}" cy="${cy}" rx="350" ry="215" fill="#fffdf5" stroke="${INK}" stroke-width="3"/><ellipse cx="${cx}" cy="${cy}" rx="215" ry="132" fill="${PALE_YELLOW}" stroke="${INK}" stroke-width="4"/>${icon('agent', cx, cy - 26, 1.2)}${textBlock('Model API', cx, cy + 86, { size: 34 })}`;
    const labels = [['QueryEngine', cx, cy - 205, true], ['Tools', cx + 360, cy, false], ['Context / State', cx - 360, cy, false], ['Agent Collaboration', cx, cy + 220, false], ['Security Base', cx, cy + 330, true]];
    body += labels.map(([n, x, y, hi]) => drawNode(n, x, y, 245, 96, hi, hi ? 'shield' : 'gear')).join('');
  } else if (item.layout === 'stack' || item.layout === 'ladder') {
    const nodes = item.nodes;
    const x = width / 2;
    const start = bodyTop + 70;
    const step = Math.min(105, (bodyBottom - start) / nodes.length);
    body += nodes.map((n, i) => {
      const w = 620 - i * 36;
      const y = start + i * step;
      return `<g>${card(x - w / 2, y, w, 78, { fill: i % 2 ? '#fff9ec' : '#fffdf6', highlight: item.highlights?.includes(n) })}${textBlock(n, x, y + 50, { size: 30, max: 32 })}</g>`;
    }).join('');
    for (let i = 0; i < nodes.length - 1; i++) body += arrow(x, start + i * step + 80, x, start + (i + 1) * step - 5);
  } else if (item.layout === 'hub') {
    const cx = width / 2, cy = height / 2 + 55;
    body += `${card(cx - 170, cy - 112, 340, 224, { highlight: true })}${textBlock(item.center ?? 'Hub', cx, cy + 14, { size: 56 })}`;
    const pts = [[cx - 480, cy - 180], [cx + 480, cy - 180], [cx - 510, cy + 150], [cx + 510, cy + 150], [cx, cy + 300]];
    body += item.nodes.map((n, i) => drawNode(n, pts[i][0], pts[i][1], 220, 100, item.highlights?.includes(n), i % 2 ? 'gear' : 'file')).join('');
    pts.forEach(([x, y]) => body += arrow(x > cx ? x - 120 : x + 120, y, x > cx ? cx + 180 : cx - 180, cy));
  } else if (item.layout === 'workbench') {
    const cx = width / 2;
    body += `${card(cx - 300, bodyTop + 210, 600, 220, { highlight: true })}${icon('terminal', cx - 180, bodyTop + 292, 1.2)}${icon('file', cx, bodyTop + 292, 1.1)}${icon('gear', cx + 180, bodyTop + 292, 1)}${textBlock(item.nodes.at(-1), cx, bodyTop + 395, { size: 34, max: 28 })}`;
    const inputs = item.nodes.slice(0, -1);
    const positions = [[260, bodyTop + 70], [535, bodyTop + 40], [1137, bodyTop + 40], [1412, bodyTop + 70], [360, bodyTop + 555], [1310, bodyTop + 555]];
    body += inputs.map((n, i) => drawNode(n, positions[i][0], positions[i][1], 220, 92, item.highlights?.includes(n), i % 2 ? 'file' : 'gear')).join('');
    positions.slice(0, inputs.length).forEach(([x, y]) => body += arrow(x, y + 52, cx + (x < cx ? -210 : 210), bodyTop + 300));
  } else if (item.layout === 'split') {
    const leftNodes = item.nodes.slice(0, Math.ceil(item.nodes.length / 2));
    const rightNodes = item.nodes.slice(Math.ceil(item.nodes.length / 2));
    body += `${card(140, bodyTop + 80, width / 2 - 210, 500, { fill: '#fffdf5', highlight: true })}${card(width / 2 + 70, bodyTop + 80, width / 2 - 210, 500, { fill: '#fff6e2', highlight: true })}${textBlock(item.highlights?.[0] ?? 'Stable Prefix', width / 4, bodyTop + 140, { size: 36 })}${textBlock(item.highlights?.[1] ?? 'Dynamic Tail', width * 0.75, bodyTop + 140, { size: 36 })}`;
    leftNodes.forEach((n, i) => body += drawNode(n, width / 4, bodyTop + 240 + i * 110, 310, 82, false, 'file'));
    rightNodes.forEach((n, i) => body += drawNode(n, width * 0.75, bodyTop + 240 + i * 110, 310, 82, false, 'terminal'));
    body += arrow(width / 2 - 110, bodyTop + 335, width / 2 + 110, bodyTop + 335);
  } else if (item.layout === 'three') {
    const xs = [width * 0.25, width * 0.5, width * 0.75];
    item.nodes.forEach((n, i) => {
      body += `${card(xs[i] - 180, bodyTop + 180, 360, 300, { fill: [PINK, PALE_YELLOW, BLUE][i], highlight: item.highlights?.includes(n) })}${icon(['shield','gear','file'][i], xs[i], bodyTop + 275, 1.3)}${textBlock(n, xs[i], bodyTop + 410, { size: 42 })}`;
    });
  } else if (item.layout === 'contract') {
    const cx = width / 2;
    body += `${card(cx - 260, bodyTop + 70, 520, 520, { highlight: true })}${textBlock('Tool Contract', cx, bodyTop + 150, { size: 46 })}${icon('gear', cx, bodyTop + 250, 1.4)}`;
    const pts = [[260, bodyTop + 150], [260, bodyTop + 360], [545, bodyTop + 600], [1128, bodyTop + 600], [1410, bodyTop + 360], [1410, bodyTop + 150]];
    item.nodes.forEach((n, i) => body += drawNode(n, pts[i][0], pts[i][1], 220, 88, item.highlights?.includes(n), i % 2 ? 'file' : 'terminal'));
    pts.forEach(([x, y]) => body += arrow(x > cx ? x - 120 : x + 120, y, x > cx ? cx + 270 : cx - 270, bodyTop + 300));
  } else if (item.layout === 'gates') {
    const y = bodyTop + 300;
    const xs = [240, 575, 930, 1280];
    item.nodes.forEach((n, i) => body += drawNode(n, xs[i], y + (i % 2 ? -70 : 70), 255, 108, false, i === 0 || i === 2 ? 'shield' : 'gear'));
    body += `${card(445, bodyTop + 112, 250, 520, { dashed: true, highlight: true })}${textBlock('Visibility Gate', 570, bodyTop + 170, { size: 28, max: 14 })}${card(800, bodyTop + 112, 260, 520, { dashed: true, highlight: true })}${textBlock('Execution Gate', 930, bodyTop + 170, { size: 28, max: 14 })}`;
    for (let i = 0; i < xs.length - 1; i++) body += arrow(xs[i] + 130, y + (i % 2 ? -70 : 70), xs[i + 1] - 130, y + ((i + 1) % 2 ? -70 : 70));
  } else {
    const cx = width / 2, cy = height / 2 + 60;
    body += `${card(cx - 260, cy - 150, 520, 300, { highlight: true })}${textBlock(item.nodes[0] ?? item.title, cx, cy + 10, { size: 48, max: 22 })}`;
    const around = item.nodes.slice(1);
    around.forEach((n, i) => {
      const a = -Math.PI / 2 + i * Math.PI * 2 / around.length;
      body += drawNode(n, cx + Math.cos(a) * 500, cy + Math.sin(a) * 270, 215, 100, item.highlights?.includes(n), i % 2 ? 'terminal' : 'file');
    });
  }

  body += `<g opacity="0.35"><path d="M120 ${height - 62} H${width - 120}" stroke="${INK}" stroke-width="2" stroke-dasharray="10 13"/><text x="${width / 2}" y="${height - 32}" text-anchor="middle" font-family="${FONT}" font-size="22" fill="${MUTED}">short labels · governed runtime · engineering sketch</text></g>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">${paper(width, height)}${titleArea(item.title, item.subtitle, width)}${body}</svg>`;
}

function coverSvg(item) {
  const width = W, height = H;
  const cx = width / 2;
  const title = `<g>${textBlock('Claude Code', cx, 70, { size: 64, anchor: 'middle', max: 20 })}${textBlock(item.title, cx, 132, { size: 48, anchor: 'middle', max: 36 })}<path d="M455 152 C620 139,875 164,1215 148" fill="none" stroke="${YELLOW}" stroke-width="9" opacity="0.9" stroke-linecap="round"/>${textBlock(item.subtitle, cx, 187, { size: 26, color: MUTED, weight: 500, max: 66, font: FONT })}</g>`;
  const center = `${card(cx - 250, 332, 500, 250, { fill: '#fff8e8', highlight: true, radius: 30 })}${textBlock(item.title.replace('Claude Code ', ''), cx, 405, { size: 40, max: 23 })}${icon('agent', cx, 500, 1.25)}${textBlock('Agent Runtime', cx, 588, { size: 28, max: 20 })}`;
  const positions = [[395, 260], [720, 250], [1080, 265], [1265, 475], [1015, 710], [625, 720], [330, 520]];
  const nodes = item.nodes.slice(0, 7);
  let cards = '';
  nodes.forEach((node, i) => {
    const [x, y] = positions[i];
    cards += drawNode(node, x, y, 230, 116, i === 2 || i === 4, ['file','terminal','loop','db','shield','gear','agent'][i % 7]);
    cards += arrow(x > cx ? x - 120 : x + 120, y, x > cx ? cx + 255 : cx - 255, 460, i % 2 ? 40 : -40);
  });
  const footer = `<g opacity="0.7">${textBlock(nodes.join('  ->  '), cx, height - 48, { size: 22, color: MUTED, weight: 500, max: 95, font: FONT })}</g>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">${paper(width, height)}${title}${center}${cards}${footer}</svg>`;
}

async function optimizePng(filePath) {
  const before = statSync(filePath).size;
  const stripped = `${filePath}.strip.png`;
  execFileSync('magick', [filePath, '-strip', '-define', 'png:compression-level=9', stripped]);
  if (existsSync('/opt/anaconda3/bin/zopflipng')) {
    const zop = `${filePath}.zop.png`;
    execFileSync('/opt/anaconda3/bin/zopflipng', ['-y', stripped, zop], { stdio: 'ignore' });
    const best = statSync(zop).size <= statSync(stripped).size ? zop : stripped;
    await rename(best, filePath);
    await rm(best === zop ? stripped : zop, { force: true });
  } else {
    await rename(stripped, filePath);
  }
  return { before, after: statSync(filePath).size };
}

async function optimizeJpg(filePath) {
  const before = statSync(filePath).size;
  const tmp = `${filePath}.opt.jpg`;
  execFileSync('magick', [filePath, '-strip', '-interlace', 'Plane', '-quality', '88', tmp]);
  await rename(tmp, filePath);
  return { before, after: statSync(filePath).size };
}

async function assertNoCjkInGeneratedMetadata() {
  const promptData = readFileSync(promptOut, 'utf8');
  if (/[\u3400-\u9fff]/.test(promptData)) throw new Error(`CJK text found in ${promptOut}`);
}

async function main() {
  await mkdir(assetDir, { recursive: true });
  await mkdir(tmpDir, { recursive: true });
  const all = [...photos, ...covers];
  await writeFile(promptOut, JSON.stringify(all.map(({ file, title, subtitle, prompt, nodes }) => ({ file, title, subtitle, prompt, labels: nodes })), null, 2) + '\n');

  const results = [];
  if (!onlyCovers) {
    for (const item of photos) {
      const filePath = path.join(assetDir, item.file);
      const svg = photoSvg(item);
      if (/[\u3400-\u9fff]/.test(svg)) throw new Error(`CJK text found in generated SVG for ${item.file}`);
      await sharp(Buffer.from(svg)).png({ compressionLevel: 9, adaptiveFiltering: true }).toFile(filePath);
      const sizes = await optimizePng(filePath);
      results.push({ file: item.file, ...sizes });
    }
  }

  for (const item of covers) {
    const filePath = path.join(assetDir, item.file);
    const svg = coverSvg(item);
    if (/[\u3400-\u9fff]/.test(svg)) throw new Error(`CJK text found in generated SVG for ${item.file}`);
    await sharp(Buffer.from(svg)).jpeg({ quality: 90, mozjpeg: true }).toFile(filePath);
    const sizes = await optimizeJpg(filePath);
    results.push({ file: item.file, ...sizes });
  }

  await assertNoCjkInGeneratedMetadata();
  console.table(results.map((r) => ({ file: r.file, beforeKB: Math.round(r.before / 1024), afterKB: Math.round(r.after / 1024) })));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
