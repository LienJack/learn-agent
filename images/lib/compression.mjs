import { execFileSync } from 'node:child_process';
import { existsSync, renameSync, rmSync } from 'node:fs';
import path from 'node:path';
import { fileSizeBytes, hashFile, resolveRepoPath } from './common.mjs';

const COMPRESSIBLE_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.webp']);

export async function compressAssets(assets, { force = false } = {}) {
	const results = [];
	for (const asset of assets) {
		const targetPath = asset.targetPath ? resolveRepoPath(asset.targetPath) : '';
		if (!targetPath || !existsSync(targetPath) || !isCompressible(targetPath)) {
			results.push({ ...asset, compressionStatus: targetPath ? 'skipped' : 'missing' });
			continue;
		}
		results.push(await compressAsset(asset, { force }));
		const last = results.at(-1);
		if (last.compressionStatus === 'compressed') {
			console.log(`compressed ${last.targetPath}: ${last.compression.beforeBytes} -> ${last.compression.afterBytes}`);
		}
	}
	return results;
}

export async function compressAsset(asset, { force = false } = {}) {
	const targetPath = resolveRepoPath(asset.targetPath);
	const beforeBytes = fileSizeBytes(targetPath);
	const ext = path.extname(targetPath).toLowerCase();
	const tempPath = `${targetPath}.compressed${ext}`;
	const command = imageMagickCommand();
	const args = compressionArgs({ ext, input: targetPath, output: tempPath, asset });
	if (!args) return { ...asset, compressionStatus: 'skipped' };
	try {
		execFileSync(command, args, { stdio: ['ignore', 'pipe', 'pipe'] });
		const compressedBytes = fileSizeBytes(tempPath);
		if (force || compressedBytes < beforeBytes) {
			renameSync(tempPath, targetPath);
		} else {
			rmSync(tempPath, { force: true });
		}
	} catch (error) {
		rmSync(tempPath, { force: true });
		return {
			...asset,
			compressionStatus: 'failed',
			compressionError: error instanceof Error ? error.message : String(error),
		};
	}
	const afterBytes = fileSizeBytes(targetPath);
	return {
		...asset,
		bytes: afterBytes,
		sha256: hashFile(targetPath),
		compressionStatus: afterBytes < beforeBytes ? 'compressed' : 'unchanged',
		compressedAt: new Date().toISOString(),
		compression: {
			beforeBytes,
			afterBytes,
			savedBytes: Math.max(0, beforeBytes - afterBytes),
		},
	};
}

export function isCompressible(filePath) {
	return COMPRESSIBLE_EXTENSIONS.has(path.extname(filePath).toLowerCase());
}

function imageMagickCommand() {
	return process.env.IMAGEMAGICK_BIN || 'magick';
}

function compressionArgs({ ext, input, output, asset }) {
	if (ext === '.png') {
		return [
			input,
			'-strip',
			'-define',
			'png:compression-level=9',
			'-define',
			'png:compression-filter=5',
			'-define',
			'png:compression-strategy=1',
			output,
		];
	}
	if (ext === '.jpg' || ext === '.jpeg') {
		return [
			input,
			'-auto-orient',
			'-strip',
			'-interlace',
			'Plane',
			'-sampling-factor',
			'4:2:0',
			'-quality',
			'86',
			output,
		];
	}
	if (ext === '.webp') {
		if (asset?.kind === 'mermaid' || asset?.kind === 'svg-mermaid') {
			return [
				input,
				'-strip',
				'-define',
				'webp:lossless=true',
				'-define',
				'webp:method=6',
				output,
			];
		}
		return [input, '-strip', '-quality', '84', output];
	}
	return null;
}
