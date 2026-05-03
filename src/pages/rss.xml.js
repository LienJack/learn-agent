import { getCollection } from 'astro:content';
import rss from '@astrojs/rss';
import { getMessages } from '../i18n/messages';

export async function GET(context) {
	const posts = await getCollection('blog');
	const messages = getMessages('zh');
	return rss({
		title: messages.site.title,
		description: messages.site.description,
		site: context.site,
		items: posts.map((post) => ({
			...post.data,
			link: `/blog/${post.id}/`,
		})),
	});
}
