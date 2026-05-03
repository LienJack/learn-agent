import { defineConfig } from 'playwright/test';

export default defineConfig({
	testDir: './tests/browser',
	timeout: 30_000,
	use: {
		baseURL: 'http://127.0.0.1:4321',
		headless: true,
	},
	webServer: {
		command: 'pnpm dev',
		url: 'http://127.0.0.1:4321',
		reuseExistingServer: !process.env.CI,
		timeout: 120_000,
	},
});
