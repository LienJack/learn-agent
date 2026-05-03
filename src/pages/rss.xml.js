import { getCollection } from 'astro:content';
import rss from '@astrojs/rss';
import { getMessages } from '../i18n/messages';
import { getLocalizedPosts, getPostSlug } from '../content/blog/utils';

export async function GET(context) {
	const posts = await getCollection('blog');
	const messages = getMessages('zh');
	return rss({
		title: messages.site.title,
		description: messages.site.description,
		site: context.site,
		items: getLocalizedPosts(posts, 'zh').map((post) => ({
			...post.data,
			link: `/blog/${getPostSlug(post)}/`,
		})),
	});
}
