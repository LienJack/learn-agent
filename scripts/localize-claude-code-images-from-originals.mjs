import { mkdir, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import sharp from 'sharp';

const repoRoot = process.cwd();
const sourceDir = path.join(repoRoot, 'src/content/blog/zh/AI/3.ClaudeCode源码解析/assets');
const targetDir = path.join(repoRoot, 'src/content/blog/en/AI/Claude code/assets');
const tmpDir = path.join(repoRoot, 'tmp');
const FONT = 'Comic Sans MS, Bradley Hand, Marker Felt, Trebuchet MS, Arial, sans-serif';
const INK = '#191815';
const PAPER = '#f8f2e5';
const YELLOW = '#f4df9a';

const imageSpecs = [
  ['00-cover-claude-code-runtime.jpg', [
    box(390, 35, 850, 100, 'Claude Code Source Analysis', 50),
    box(560, 116, 560, 44, 'From Model API to Agent Runtime', 26),
    box(56, 520, 190, 56, 'Multi-Agent\nCollaboration', 22),
  ]],
  ['01-cover-engineering-architecture.jpg', [
    box(455, 28, 760, 80, 'Claude Code Engineering Architecture', 42),
    box(520, 106, 640, 42, 'Not a chatbot: an engineered runtime around model capability', 20),
    box(88, 220, 120, 58, 'Input /\nRequest', 18), box(88, 355, 120, 58, 'Tool /\nRuntime', 18), box(91, 492, 120, 58, 'Context /\nState', 18), box(91, 626, 120, 58, 'Agent /\nTask', 18),
    box(1380, 226, 130, 58, 'Permission /\nSecurity', 18), box(1380, 361, 130, 58, 'Extensibility', 18), box(1380, 497, 130, 58, 'Observable\nResults', 18),
    box(740, 186, 170, 36, 'Reasoning Core', 18), box(733, 318, 180, 36, 'Main Loop', 18), box(448, 510, 210, 42, 'Tools', 20), box(766, 510, 230, 42, 'Context / State', 19), box(1075, 510, 180, 42, 'Safety', 20), box(685, 704, 270, 38, 'Agents', 20),
  ]],
  ['02-cover-react-loop.jpg', [
    box(620, 35, 455, 60, 'Claude Code ReAct Loop', 40),
    box(610, 95, 480, 38, 'Observe -> Think -> Act -> Write Back', 22),
    box(170, 110, 145, 110, 'Context\nHistory\nTool Result', 18), box(1200, 80, 160, 70, 'Model Call', 18), box(92, 440, 120, 48, 'Stop', 20),
    box(705, 362, 160, 55, 'Agent', 30), box(778, 198, 126, 42, 'Observe', 22), box(955, 324, 118, 42, 'Think', 24), box(970, 604, 110, 42, 'Result', 23), box(615, 675, 110, 42, 'State', 23), box(440, 495, 124, 42, 'Continue', 22), box(1060, 470, 110, 42, 'Tool', 22),
  ]],
  ['03-cover-prompt-runtime.jpg', [
    box(600, 62, 360, 70, 'Prompt Runtime', 46),
    box(1055, 348, 155, 52, 'Model', 34),
    ...leftList(78, 162, ['Rules', 'Memory', 'Tools', 'History', 'Summary'], 31, 210),
    box(748, 514, 160, 34, 'Prompt', 36),
    box(645, 710, 350, 34, 'Identity  Rules  Memory  Tools  History  Results  Summary', 16),
  ]],
  ['04-1-cover-context-management.jpg', [
    box(560, 48, 560, 56, 'Claude Code Context Management', 38),
    box(500, 115, 680, 44, 'Token budget, files, tool results, compaction, and recent tail', 18),
    box(120, 255, 92, 44, 'History', 20), box(383, 255, 84, 44, 'Files', 20), box(630, 255, 130, 44, 'Tool Result', 20), box(818, 388, 130, 42, 'Compact', 20), box(1010, 255, 130, 44, 'Recent', 20), box(1312, 255, 130, 44, 'Next Turn', 20),
    box(490, 755, 660, 35, 'Working set   Tool result   Summary   Recent tail', 18),
  ]],
  ['04-2-cover-context-governance.jpg', [
    box(600, 52, 470, 60, 'Context Governance', 42),
    box(565, 115, 520, 34, 'Filter what enters context; decide what wins', 19),
    box(680, 362, 150, 50, 'Enter', 24), box(830, 394, 150, 70, 'Policy', 34),
    box(1165, 206, 150, 48, 'Model', 22), box(1165, 335, 150, 48, 'External', 21), box(1165, 470, 150, 48, 'Compress', 21), box(1165, 602, 150, 48, 'Memory', 21),
    box(60, 684, 130, 40, 'All information\ncandidates', 15), box(1112, 720, 210, 34, 'Feedback & Metrics', 18),
  ]],
  ['05-0-cover-tools-pipeline.jpg', [
    box(655, 45, 380, 66, 'Claude Code Tools Pipeline', 42),
    box(610, 105, 470, 34, 'Intent becomes a governed tool call', 20),
    ...rowLabels(145, 238, ['Intent', 'Schema', 'Permission', 'Hooks', 'Execute', 'Result'], 235, 24),
    box(738, 802, 170, 35, 'tool_result', 22), box(640, 850, 440, 28, 'Result is written back into the next model context', 16),
    box(102, 580, 92, 36, 'Model', 20),
  ]],
  ['05-1-cover-file-tools.jpg', [
    box(620, 62, 500, 52, 'Claude Code File Workflow', 38), box(615, 112, 500, 35, 'Read, snapshot, edit, diff, write, guard', 20),
    ...rowLabels(185, 235, ['READ', 'SNAPSHOT', 'EDIT', 'DIFF', 'WRITE', 'GUARD'], 225, 22),
    box(135, 738, 130, 38, 'Code input', 18), box(392, 735, 160, 44, 'Records\nsnapshots', 17), box(636, 735, 160, 44, 'Edit / insert /\nreplace', 17), box(889, 735, 160, 44, 'Review\nchanges', 17), box(1138, 735, 150, 44, 'Safe write', 17), box(1380, 735, 150, 44, 'Permission\nguard', 17),
  ]],
  ['05-2-cover-terminal-tool.jpg', [
    box(45, 55, 320, 62, 'Claude Code Terminal Tools', 34), box(55, 124, 350, 34, 'Let commands execute in a controlled environment', 17),
    ...rowLabels(130, 325, ['Command', 'Permission', 'Sandbox', 'Run', 'Output', 'Lifecycle'], 263, 22),
    box(160, 720, 110, 40, 'API / Agent', 18), box(422, 720, 160, 54, 'Shell\ncommand', 17), box(690, 720, 160, 54, 'cwd / env\nstate', 17), box(950, 720, 160, 54, 'stdout / stderr\nexit code', 16), box(1280, 720, 135, 44, 'Can\nresume', 17),
  ]],
  ['05-3-cover-workflow-task.jpg', [
    box(600, 55, 480, 56, 'Claude Code Workflow Tools', 38), box(600, 112, 540, 36, 'From Todo to Task: visible state for long-running work', 19),
    ...rowLabels(132, 235, ['Goal', 'Todo', 'Task', 'Progress', 'Blocker', 'Done'], 255, 24),
    box(180, 574, 120, 54, 'Define\ngoal', 18), box(435, 574, 120, 54, 'Track\nitems', 18), box(690, 574, 130, 54, 'Runtime\nTask', 18), box(945, 574, 120, 54, 'Progress\nupdates', 18), box(1198, 574, 130, 54, 'Risks /\nblockers', 17), box(1448, 574, 120, 54, 'Finish\nstate', 18),
    box(730, 845, 280, 32, 'continuous state flow', 18),
  ]],
  ['06-cover-mcp-bridge.jpg', [
    box(744, 255, 165, 58, 'MCP', 45), box(738, 317, 210, 30, 'Model Context Protocol', 17),
    box(1138, 155, 230, 44, 'Claude Code Runtime', 20), box(1014, 482, 145, 42, 'Registry', 18), box(1172, 482, 130, 42, 'Tool', 18), box(1324, 482, 150, 42, 'Resource', 18),
    box(176, 152, 160, 44, 'External\nIssue', 18), box(176, 336, 160, 44, 'Chat', 20), box(176, 506, 160, 44, 'Design', 20), box(176, 686, 160, 44, 'Database', 20),
    box(812, 765, 470, 34, 'Unified protocol for tools, resources, and prompts', 18),
  ]],
  ['07-cover-skill-package.jpg', [
    box(870, 72, 142, 52, 'Skill', 44), box(1040, 83, 260, 46, 'Reusable capability package', 21),
    box(1130, 202, 110, 42, 'Agent', 30), box(1140, 268, 245, 42, 'loads and executes skill package', 17),
    box(180, 355, 120, 42, 'Trigger', 25), box(430, 515, 150, 38, 'Workflow', 19), box(640, 515, 140, 38, 'Template', 19), box(835, 515, 120, 38, 'Script', 19), box(570, 628, 250, 34, 'Skill Package', 20),
    box(178, 775, 210, 34, 'Input', 22), box(775, 775, 230, 34, 'Processing', 22), box(1225, 775, 210, 34, 'Output', 22),
  ]],
  ['08-1-cover-agent-collaboration.jpg', [
    box(120, 190, 112, 42, 'Main\nAgent', 18), box(350, 190, 92, 42, 'Task', 20), box(555, 190, 86, 42, 'Fork', 20), box(1415, 385, 120, 42, 'Merge', 20),
    box(745, 205, 180, 60, 'Subagent\nresearch', 18), box(745, 405, 180, 60, 'Subagent\nreview', 18), box(745, 603, 180, 60, 'Subagent\nfix', 18),
    box(1020, 213, 116, 45, 'Result', 20), box(1020, 411, 116, 45, 'Result', 20), box(1020, 610, 116, 45, 'Result', 20),
    box(350, 520, 180, 95, 'Permission\nBoundary', 18), box(430, 855, 700, 30, 'isolation, task state, permission bubbling, and result merge', 17),
  ]],
  ['08-2-cover-agent-orchestration.jpg', [
    ...rowLabels(175, 222, ['Decompose', 'Roles', 'Context', 'Parallel', 'Review', 'Converge'], 250, 22),
    box(210, 542, 120, 42, 'Split work', 18), box(460, 542, 120, 42, 'Planner\nCoder\nReviewer', 16), box(710, 542, 130, 42, 'Context\npackage', 16), box(960, 542, 145, 42, 'parallel\nexecution', 16), box(1210, 542, 120, 42, 'Review', 18), box(1458, 542, 120, 42, 'Merge', 18),
    box(1040, 805, 300, 34, 'Quality gates and convergence', 18),
  ]],
  ['09-1-cover-plan-mode.jpg', [
    box(646, 68, 370, 58, 'Plan Mode', 48), box(690, 128, 320, 34, 'Plan First, Then Execute', 24),
    ...rowLabels(280, 405, ['Goal', 'Read-only', 'Research', 'Plan', 'Approve', 'Execute', 'Validate'], 177, 19),
    box(1230, 305, 150, 45, 'Permission\nBoundary', 17), box(810, 855, 520, 28, 'Planning is read-only; execution requires approval', 17),
  ]],
  ['09-2-cover-plan-control-plane.jpg', [
    box(80, 48, 245, 58, 'Plan Design', 28), box(620, 78, 480, 46, 'Planning Control Plane', 38),
    box(100, 245, 155, 42, 'Planning', 19), box(405, 245, 125, 42, 'Control Panel', 18), box(725, 220, 170, 48, 'Approval', 20), box(1015, 220, 160, 48, 'Validate', 20), box(1300, 220, 150, 48, 'Control', 20),
    box(132, 616, 145, 45, 'Observation', 18), box(338, 616, 142, 45, 'Workflow Tools', 18), box(775, 614, 118, 44, 'Handoff', 18), box(1050, 614, 155, 44, 'Agent Chain', 18), box(114, 782, 150, 44, 'Suggestion', 18), box(760, 785, 158, 42, 'Prompt', 18),
  ]],

  ['01-photo-01-engineering-shell.png', [box(90, 585, 190, 62, 'User\nRequest', 34), box(415, 592, 210, 48, 'Model API', 38), box(760, 592, 180, 48, 'Runtime\nShell', 34), box(1088, 592, 210, 54, 'Tool\nEnvironment', 31), box(1392, 592, 210, 54, 'Verified\nResult', 31)]],
  ['02-photo-05.png', [
    box(548, 35, 330, 55, 'Agent Collaboration', 34), box(560, 148, 310, 52, 'Tools System', 34), box(575, 250, 285, 50, 'QueryEngine', 34),
    box(358, 394, 105, 68, 'Base\nTools', 24), box(436, 560, 92, 62, 'ReAct\nLoop', 23), box(488, 690, 120, 62, 'Token\nBudget', 22), box(805, 660, 135, 50, 'Memory\nMgmt', 22), box(905, 523, 145, 62, 'Context\nEngineering', 22), box(964, 690, 120, 62, 'Agent\nTools', 22), box(1143, 485, 70, 36, 'MCP', 25),
    box(392, 852, 650, 45, 'Multi-agent orchestration · parallel execution · cross-instance communication', 23),
    box(230, 968, 990, 48, 'Security  Permissions & Policy  |  Sandbox  |  Prompt-Injection Defense  |  Audit Logs', 24),
  ]],
  ['01-photo-02-capability-layers.png', [box(540, 110, 180, 42, 'Security Boundary', 20), box(565, 202, 135, 38, 'Collaboration', 19), box(597, 288, 90, 34, 'Context', 20), box(635, 388, 80, 34, 'Tools', 20), box(636, 492, 88, 34, 'Main Loop', 19), box(637, 596, 75, 34, 'Model', 20)]],
  ['01-photo-03-runtime-flow.png', [box(118, 600, 135, 45, 'User\nInput', 24), box(345, 598, 135, 45, 'Session\nEntry', 24), box(545, 598, 145, 45, 'Build\nContext', 24), box(770, 520, 150, 40, 'Model\nDecision', 23), box(990, 600, 130, 45, 'Tool\nRun', 24), box(1210, 600, 150, 45, 'Write\nBack', 24), box(706, 690, 300, 36, 'execute result / update context', 18)]],
  ['01-photo-04-code-load-bearing-chain.png', [box(92, 140, 125, 40, 'Entry', 24), box(92, 230, 125, 40, 'Interaction', 24), box(92, 320, 125, 40, 'Orchestration', 24), box(92, 410, 125, 40, 'Loop', 24), box(92, 500, 125, 40, 'Tools', 24), box(92, 590, 125, 40, 'Context', 24), box(92, 680, 125, 40, 'Safety', 24), box(1400, 350, 120, 210, 'Status\nMachine', 24)]],
  ['02-photo-01-react-loop.png', [box(780, 188, 100, 50, 'Think', 32), box(1130, 390, 90, 50, 'Intent', 32), box(990, 705, 90, 50, 'Act', 32), box(590, 725, 110, 50, 'Observe', 32), box(456, 420, 130, 58, 'Re-think', 30)]],
  ['02-photo-02-state-machine.png', [box(540, 150, 160, 45, 'messages', 25), box(250, 338, 120, 45, 'tools', 25), box(300, 620, 130, 45, 'turn', 25), box(520, 742, 130, 45, 'compact', 25), box(792, 746, 110, 45, 'abort', 25), box(927, 608, 150, 45, 'query\nloop', 23), box(928, 340, 122, 45, 'reason', 24), box(705, 430, 110, 42, 'State', 34)]],
  ['02-photo-03-agent-run.png', [box(150, 592, 120, 44, 'Submit', 24), box(355, 592, 142, 44, 'Read\nConfig', 23), box(565, 592, 142, 44, 'Prepare\nTools', 23), box(790, 592, 142, 44, 'Build\nContext', 23), box(1005, 592, 130, 44, 'query\nloop', 23), box(1215, 592, 140, 44, 'Record\nState', 23), box(1038, 225, 160, 42, 'Agent Run', 28)]],
  ['02-photo-04-observe-compact.png', [box(300, 650, 110, 48, 'Next\nTurn', 24), box(602, 650, 120, 48, 'Tool\nCall', 24), box(900, 650, 126, 48, 'Tool\nResult', 24), box(585, 446, 135, 48, 'Tool\nShadow', 23), box(890, 446, 135, 48, 'Write\nmessages', 22), box(738, 155, 210, 42, 'Model Decision', 24)]],
  ['03-photo-01-prompt-runtime-workbench.png', [box(560, 250, 155, 46, 'System\nRules', 22), box(560, 360, 155, 46, 'Runtime\nContext', 22), box(560, 470, 155, 46, 'Project\nMemory', 22), box(560, 580, 155, 46, 'Tools', 24), box(560, 690, 155, 46, 'Messages', 22), box(560, 800, 155, 46, 'User\nInput', 22), box(930, 600, 170, 46, 'Workbench', 29), box(1160, 620, 150, 46, 'Model\nRequest', 24)]],
  ['03-photo-03-memory-layers.png', [box(362, 104, 160, 46, 'Org\nRules', 22), box(365, 220, 160, 46, 'User\nPrefs', 22), box(365, 340, 160, 46, 'Project\nRules', 22), box(365, 460, 160, 46, 'Local\nRules', 22), box(870, 474, 150, 58, 'Workbench', 30), box(1180, 510, 155, 46, 'Model\nRequest', 24)]],
  ['03-photo-04-cache-boundary.png', [box(112, 112, 100, 40, 'Identity', 18), box(257, 112, 100, 40, 'Rules', 18), box(405, 112, 110, 40, 'Tool\nSchema', 17), box(548, 112, 100, 40, 'Snapshot', 18), box(680, 112, 108, 40, 'Files', 18), box(878, 112, 100, 40, 'Git\nStatus', 17), box(1010, 112, 90, 40, 'Skills', 18), box(1142, 112, 90, 40, 'MCP', 18), box(1276, 112, 90, 40, 'Date', 18), box(330, 680, 290, 40, 'Cache as much as possible', 22), box(940, 680, 320, 40, 'Refresh every turn', 22), box(730, 782, 90, 34, 'Boundary', 20)]],
  ['04-photo-01-context-workbench.png', [box(663, 615, 210, 50, 'Model\nWorkbench', 28), box(545, 318, 118, 40, 'System\nRules', 18), box(735, 318, 122, 40, 'Project\nRules', 18), box(930, 318, 112, 40, 'Tool\nResults', 18), box(545, 498, 118, 40, 'History', 18), box(738, 498, 122, 40, 'Compact\nSummary', 17), box(930, 498, 112, 40, 'Current\nInput', 17)]],
  ['04-photo-02-token-failures.png', [box(745, 145, 170, 45, 'Tool Output', 24), box(1004, 235, 130, 45, 'Overflow', 24), box(1004, 384, 130, 45, 'Noise', 24), box(1004, 535, 130, 45, 'Stale\nContext', 22), box(690, 740, 200, 45, 'Context Window', 25)]],
  ['04-photo-03-compact-defenses.png', [box(226, 620, 95, 36, 'Tool Result\nBudget', 17), box(460, 620, 70, 36, 'Snip', 18), box(625, 620, 100, 36, 'Micro\nCompact', 17), box(794, 620, 100, 36, 'Context\nCollapse', 17), box(963, 620, 105, 36, 'Auto\nCompact', 17), box(1138, 620, 105, 36, 'Reactive\nCompact', 17), box(570, 823, 95, 32, 'Trim', 18), box(770, 823, 95, 32, 'Compress', 18), box(977, 823, 130, 32, 'Context Healing', 17)]],
  ['04-photo-04-recent-tail.png', [box(238, 290, 120, 50, 'Summary', 25), box(492, 360, 80, 38, 'Exchange', 20), box(778, 265, 270, 52, 'Recent Tail\n(raw samples)', 23), box(210, 770, 220, 40, 'Old history (compressed)', 18), box(960, 770, 310, 40, 'Recent context (kept verbatim)', 18)]],
  ['05-photo-01-tool-contract.png', [box(365, 72, 110, 45, 'Name', 34), box(1215, 72, 120, 45, 'Execute', 34), box(680, 315, 170, 50, 'Tool Contract', 34), box(1215, 380, 120, 45, 'Result', 34), box(365, 615, 110, 45, 'Permission', 28), box(1215, 620, 90, 45, 'UI', 34)]],
  ['05-photo-02-structured-intent.png', [box(126, 400, 150, 46, 'Vague\nIntent', 23), box(370, 400, 150, 46, 'inputSchema', 23), box(660, 394, 145, 46, 'tool_use', 24), box(1008, 398, 145, 46, 'Verifiable\nRequest', 22)]],
  ['05-photo-03-permission-gates.png', [box(94, 400, 100, 44, 'Tool\nPool', 20), box(304, 400, 110, 44, 'Visible\nPath', 20), box(495, 370, 118, 46, 'Model\nPlanning', 20), box(696, 294, 120, 46, 'Permission', 20), box(900, 305, 120, 46, 'Real\nExecution', 20), box(1114, 392, 120, 46, 'Reject\nRecord', 20), box(1118, 575, 120, 46, 'Allowed\nResult', 20)]],
  ['05-photo-04-tool-lifecycle.png', [box(106, 430, 96, 38, 'Schema', 22), box(307, 430, 110, 38, 'Input\nCheck', 20), box(511, 430, 96, 38, 'Permission', 20), box(711, 430, 88, 38, 'Hooks', 22), box(914, 430, 88, 38, 'Execute', 22), box(1120, 430, 95, 38, 'Serialize', 20), box(1325, 430, 88, 38, 'Write\nBack', 20)]],
];

function box(x, y, w, h, text, size = 22, opts = {}) {
  return { x, y, w, h, text, size, ...opts };
}
function rowLabels(x, y, labels, gap, size = 22) {
  return labels.map((label, index) => box(x + index * gap, y, 120, 38, label, size));
}
function leftList(x, y, labels, gap, w = 150) {
  return labels.map((label, index) => box(x, y + index * gap, w, 42, label, 21));
}
function esc(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[char]);
}
function lines(text) {
  return String(text).split('\n');
}
function overlaySvg(width, height, patches) {
  const items = patches.map((p) => {
    const rx = p.rx ?? 10;
    const fill = p.fill ?? PAPER;
    const opacity = p.opacity ?? 0.96;
    const stroke = p.stroke ? `stroke="${INK}" stroke-width="${p.stroke}"` : '';
    const rect = `<rect x="${p.x}" y="${p.y}" width="${p.w}" height="${p.h}" rx="${rx}" fill="${fill}" fill-opacity="${opacity}" ${stroke}/>`;
    const ls = lines(p.text);
    const lineH = p.size * 1.08;
    const startY = p.y + p.h / 2 - ((ls.length - 1) * lineH) / 2 + p.size * 0.35;
    const text = ls.map((line, i) => `<text x="${p.x + p.w / 2}" y="${startY + i * lineH}" text-anchor="middle" font-family="${FONT}" font-weight="700" font-size="${p.size}" fill="${INK}">${esc(line)}</text>`).join('');
    return rect + text;
  }).join('\n');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">${items}</svg>`;
}
async function optimize(filePath, ext) {
  const before = (await stat(filePath)).size;
  if (ext === '.png') {
    const tmp = `${filePath}.strip.png`;
    execFileSync('magick', [filePath, '-strip', '-define', 'png:compression-level=9', tmp]);
    if (existsSync('/opt/anaconda3/bin/zopflipng')) {
      const zop = `${filePath}.zop.png`;
      execFileSync('/opt/anaconda3/bin/zopflipng', ['-y', tmp, zop], { stdio: 'ignore' });
      const tmpSize = (await stat(tmp)).size;
      const zopSize = (await stat(zop)).size;
      execFileSync('mv', [zopSize <= tmpSize ? zop : tmp, filePath]);
      execFileSync('rm', ['-f', zopSize <= tmpSize ? tmp : zop]);
    } else {
      execFileSync('mv', [tmp, filePath]);
    }
  } else {
    const tmp = `${filePath}.opt.jpg`;
    execFileSync('magick', [filePath, '-strip', '-interlace', 'Plane', '-quality', '90', tmp]);
    execFileSync('mv', [tmp, filePath]);
  }
  return { before, after: (await stat(filePath)).size };
}
async function main() {
  await mkdir(targetDir, { recursive: true });
  await mkdir(tmpDir, { recursive: true });
  const summary = [];
  for (const [file, patches] of imageSpecs) {
    const source = path.join(sourceDir, file);
    const target = path.join(targetDir, file);
    const meta = await sharp(source).metadata();
    const overlay = overlaySvg(meta.width, meta.height, patches);
    const ext = path.extname(file).toLowerCase();
    const pipeline = sharp(source).composite([{ input: Buffer.from(overlay), left: 0, top: 0 }]);
    if (ext === '.png') await pipeline.png({ compressionLevel: 9, adaptiveFiltering: true }).toFile(target);
    else await pipeline.jpeg({ quality: 92, mozjpeg: true }).toFile(target);
    const sizes = await optimize(target, ext);
    summary.push({ file, beforeKB: Math.round(sizes.before / 1024), afterKB: Math.round(sizes.after / 1024) });
  }
  console.table(summary);
}
main().catch((error) => { console.error(error); process.exit(1); });
