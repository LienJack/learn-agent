import test from 'node:test';
import assert from 'node:assert/strict';
import {
	getCanonicalAuthorName,
	getIdentityDescription,
	getIdentityJobTitle,
	getIdentityPath,
	isPersonalIdentityAlias,
	PERSONAL_IDENTITY,
} from '../../src/seo/identity.ts';

test('central personal identity facts keep the public name, alias, and GitHub anchor stable', () => {
	assert.equal(PERSONAL_IDENTITY.name, 'Lien Jack');
	assert.deepEqual(PERSONAL_IDENTITY.alternateNames, ['LienJack']);
	assert.equal(PERSONAL_IDENTITY.githubUrl, 'https://github.com/LienJack');
	assert.equal(PERSONAL_IDENTITY.shareImagePath, '/social/lien-jack-share.jpg');
	assert.equal(PERSONAL_IDENTITY.shareImageAlt, 'Lien Jack share image');
});

test('author aliases normalize LienJack frontmatter to Lien Jack', () => {
	assert.equal(isPersonalIdentityAlias('Lien Jack'), true);
	assert.equal(isPersonalIdentityAlias('LienJack'), true);
	assert.equal(isPersonalIdentityAlias('lien jack'), true);
	assert.equal(isPersonalIdentityAlias('Guest Author'), false);
	assert.equal(getCanonicalAuthorName(undefined), 'Lien Jack');
	assert.equal(getCanonicalAuthorName('LienJack'), 'Lien Jack');
	assert.equal(getCanonicalAuthorName('Guest Author'), 'Guest Author');
});

test('localized identity facts align across dedicated Lien Jack pages', () => {
	assert.equal(getIdentityPath('zh'), '/lien-jack');
	assert.equal(getIdentityPath('en'), '/en/lien-jack');
	assert.equal(getIdentityPath('ja'), '/ja/lien-jack');
	assert.match(getIdentityJobTitle('zh'), /Agent Builder/);
	assert.match(getIdentityJobTitle('en'), /Full-stack/);
	assert.match(getIdentityDescription('zh'), /LLM/);
	assert.match(getIdentityDescription('en'), /AI-native/);
	assert.match(getIdentityDescription('ja'), /Agent/);
	assert.ok(PERSONAL_IDENTITY.representativeContent.length >= 3);
	assert.ok(PERSONAL_IDENTITY.knowsAbout.includes('Full-stack engineering'));
});
