import { expect, test } from 'playwright/test';

test('opens and enlarges wide mermaid media in the article viewer', async ({ page }) => {
	await page.goto(
		'/blog/AI/3.ClaudeCode%E6%BA%90%E7%A0%81%E8%A7%A3%E6%9E%90/01.%E5%B7%A5%E7%A8%8B%E6%9E%B6%E6%9E%84/',
	);

	const media = page.locator('.article-media[data-media-kind="mermaid"]').first();
	await expect(media).toBeVisible();

	const inlineWidth = await media.locator('svg').evaluate((node) => {
		return node.getBoundingClientRect().width;
	});

	const toggle = media.locator('.article-media-toggle');
	await expect(toggle).toBeVisible();
	await toggle.click();

	const viewer = page.locator('.article-media-viewer');
	await expect(viewer).toHaveClass(/is-open/);
	const viewerMedia = viewer.locator('.article-media-viewer-viewport .article-media-viewer-content');
	await expect(viewerMedia).toBeVisible();

	const expandedWidth = await viewerMedia.locator('svg').evaluate((node) => {
		return node.getBoundingClientRect().width;
	});
	expect(expandedWidth).toBeGreaterThan(inlineWidth + 100);

	const viewerBackground = await viewerMedia.evaluate((node) => {
		return getComputedStyle(node).backgroundColor;
	});
	expect(viewerBackground).toBe('rgb(247, 240, 229)');

	await viewer.locator('.article-media-viewer-close').click();
	await expect(viewer).not.toHaveClass(/is-open/);
});

test('keeps regular article images out of preview mode', async ({ page }) => {
	await page.goto('/blog/AI/3.ClaudeCode%E6%BA%90%E7%A0%81%E8%A7%A3%E6%9E%90/01.%E5%B7%A5%E7%A8%8B%E6%9E%B6%E6%9E%84/');

	const staticSvgMedia = page.locator('.article-media[data-media-kind="image"]').first();
	await expect(staticSvgMedia).toBeVisible();
	await expect(staticSvgMedia).not.toHaveClass(/is-preview/);

	const mermaidMedia = page.locator('.article-media[data-media-kind="mermaid"]').first();
	await expect(mermaidMedia).toBeVisible();
});
