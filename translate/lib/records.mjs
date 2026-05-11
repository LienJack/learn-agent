import path from 'node:path';
import { artifactsRoot, ensureTranslateDirs, runsRoot, safeSlug, toRepoRelative, writeJson } from './common.mjs';

export function createRun({ command, language, pipeline, stage = '', inputs = [] }) {
	ensureTranslateDirs();
	const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
	const slug = safeSlug(inputs.length === 1 ? path.basename(inputs[0], path.extname(inputs[0])) : `${language || 'all'}-${stage || command}`);
	const runId = `${timestamp}-${command}-${slug}`;
	const runDir = path.join(runsRoot, runId);
	const artifactDir = path.join(artifactsRoot, runId);
	const recordPath = path.join(runDir, 'record.json');
	const record = {
		id: runId,
		command,
		language,
		pipeline,
		stage,
		status: 'started',
		startedAt: new Date().toISOString(),
		inputs: inputs.map((input) => ({ source: input, status: 'pending', artifacts: [], blockers: [], warnings: [] })),
		artifactDir: toRepoRelative(artifactDir),
		blockers: [],
		warnings: [],
		checks: [],
		artifacts: [],
		confirmation: null,
		notes: [],
	};
	writeRunRecord(recordPath, record);
	return { runId, runDir, artifactDir, recordPath, record };
}

export function finishRun(run, status = 'completed') {
	run.record.status = status;
	run.record.finishedAt = new Date().toISOString();
	writeRunRecord(run.recordPath, run.record);
}

export function writeRunRecord(recordPath, record) {
	writeJson(recordPath, scrubSecrets(record));
}

export function scrubSecrets(value) {
	if (Array.isArray(value)) return value.map(scrubSecrets);
	if (value && typeof value === 'object') {
		const output = {};
		for (const [key, child] of Object.entries(value)) {
			if (/token|cookie|secret|authorization|api[_-]?key|csrf|credential/i.test(key)) {
				output[key] = '[redacted]';
			} else {
				output[key] = scrubSecrets(child);
			}
		}
		return output;
	}
	if (typeof value === 'string' && /(Bearer\s+[A-Za-z0-9._-]+|api[_-]?key=|cookie:|authorization:)/i.test(value)) {
		return '[redacted]';
	}
	return value;
}
