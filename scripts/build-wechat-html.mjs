import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { marked } from "marked";

const articlePath = resolve(process.argv[2] ?? "");
const outputPath = resolve(process.argv[3] ?? "");

if (!articlePath || !outputPath) {
	console.error("Usage: node scripts/build-wechat-html.mjs <article.md> <output.html>");
	process.exit(1);
}

const imageMap = new Map([
	["./assets/06.MCP-mermaid-01.png", "http://mmbiz.qpic.cn/sz_mmbiz_png/DtQ2AtS6n8iatZBKzj4n7ppl729olYZVJwvpickibmCX7iawVlDoicQNVs0751c8qNniadK8807H0pZO5rSAZ6Kz94NW74747DFpkSgQ1cNGjrKDA/0?wx_fmt=png"],
	["./assets/06.MCP-mermaid-02.png", "http://mmbiz.qpic.cn/mmbiz_png/DtQ2AtS6n8hk5WU9M5GCjHTXmDLnj7uG5ibQSqBuPTpWaOAq7iag6fjScdJQweqKfFXXUAwuKd6NHLhHcIp9esIMw75FvfLvvM4YnhBeic9I2g/0?wx_fmt=png"],
	["./assets/06.MCP-mermaid-03.png", "http://mmbiz.qpic.cn/mmbiz_png/DtQ2AtS6n8jfL3VP0YXicDPH6PSc4ILiaehOarT2U4sG3LUYEoeibIrN5jlcVHB8gGJKAicZia3l83b8HbdRHETnG9CLGul5yZibdsMoe10bS2F8o/0?wx_fmt=png"],
	["./assets/06.MCP-mermaid-04.png", "http://mmbiz.qpic.cn/mmbiz_png/DtQ2AtS6n8hetatH3iawb4XeES77fXDgcrSvQezYJnyqDDgsBOW10ictdfZzvPhA24wJ9LVicmJkOLErwiaFV15eYGK8HVIfmw1uRRQhFt0ZKXA/0?wx_fmt=png"],
	["./assets/06.MCP-mermaid-05.png", "http://mmbiz.qpic.cn/mmbiz_png/DtQ2AtS6n8jZaNB9KNXfyn4jJV9iar9eXj0QDH3hJvOpL2icicib3fqZrQyjjx8hv7KQiaHUzY9gg2ZGzEjAxunrtyfRLC5RlF7KmLmZagLB8G6A/0?wx_fmt=png"],
	["./assets/06.MCP-mermaid-06.png", "http://mmbiz.qpic.cn/sz_mmbiz_png/DtQ2AtS6n8jtM584AUfMPwtmTlRP5GZwibjqjJoA2nSGJlQhofEjceeFtdibXwcUEfjHiarnckpF1tzIVuQvtv2KQFzTLzYaESa00okdGNiaqpw/0?wx_fmt=png"],
	["./assets/06.MCP-mermaid-07.png", "http://mmbiz.qpic.cn/sz_mmbiz_png/DtQ2AtS6n8gpeOLia5wqhWhB4z2Sxcdhq8Vt9MBD0KUGiaU1FNxh5yMzmm81KMnhTydXzOz3pzxKoXd7NAdZB8joaTLFgiaRNf1Poq0lc6ajZA/0?wx_fmt=png"],
	["./assets/06.MCP-mermaid-08.png", "http://mmbiz.qpic.cn/mmbiz_png/DtQ2AtS6n8gIN6WgPwxJkszL9V5s4mx370m4dia2UpFnV9WgnDRdOyLUQdkIqIZHOdiaqibzRN2Tz3xkeib1RVQKTTfibNT5KpiahkdG5yAINGJtA/0?wx_fmt=png"],
	["./assets/06.MCP-mermaid-09.png", "http://mmbiz.qpic.cn/sz_mmbiz_png/DtQ2AtS6n8ghV9C49liaEyQyB95JibWpJC8tu3u3XbC8rakkqv2tv2wJcDT5ia3YQpEiahUqcYzcXNVsqXWwB2yHJGLScejrUicDey71iaNy5p1d4/0?wx_fmt=png"],
	["./assets/07.Skill-mermaid-01.png", "http://mmbiz.qpic.cn/sz_mmbiz_png/DtQ2AtS6n8j5IkXvvqgMiaXThxFI0rf9LJhib2NvGHrXVp5HPQCXPrNpg2zBJibSRFLKiczqXuCJnBD8MePhT3VNAclNDWNYf8v5zLmnRoiaSvFg/0?wx_fmt=png"],
	["./assets/07.Skill-mermaid-02.png", "http://mmbiz.qpic.cn/mmbiz_png/DtQ2AtS6n8jPlhNw5PV5xZuNXAe0BtGiabMWrLqtoWFVB4DDaeTY3UwKMIkuGgCibh1RfySVetKLrdAw0egYZ1RDUgOGdLk9oMx4Qtiagibicqs8/0?wx_fmt=png"],
	["./assets/07.Skill-mermaid-03.png", "http://mmbiz.qpic.cn/sz_mmbiz_png/DtQ2AtS6n8hiad9LH2A1l51qibDGwX8ujPZxEWR6EIytvuJGkBFEPCkEZDuBeAYEicoY3XlibJQ5f38NTqfziauNIibW0BickVhc5NV8fbCcItibVvA/0?wx_fmt=png"],
	["./assets/07.Skill-mermaid-04.png", "http://mmbiz.qpic.cn/mmbiz_png/DtQ2AtS6n8jPfrD6mjkwxbTrtVF37W7fedK6znkeV3V8D0uXHXNmGwt5dX6KQYY9OXoCcicojWaK2diaVzsoic6hlGicKjmghk9Atiaw2yiaJq854/0?wx_fmt=png"],
	["./assets/08.1Agent协作-mermaid-01.png", "http://mmbiz.qpic.cn/mmbiz_png/DtQ2AtS6n8iaU4ODUzKxtXxqa45vTkZaspZv4sWGXibhxqo2c0Le1LNufNUUHib5yvYJ1pNcefVsLwBxnp04KZDmyYJdwRmibdMicibiab7veSFyHc/0?wx_fmt=png"],
	["./assets/08.1Agent协作-mermaid-02.png", "http://mmbiz.qpic.cn/mmbiz_png/DtQ2AtS6n8jWxWicbUtnibUQEh4jzvANVIuRJVbGQaampHibiaxe53vSa4EGU8wcbFRflzEI7ncXobegZC6aEXJjkiaRibfjEcP82Jh2WAlMNa6X8/0?wx_fmt=png"],
	["./assets/08.1Agent协作-mermaid-03.png", "http://mmbiz.qpic.cn/sz_mmbiz_png/DtQ2AtS6n8gDb7k3WMTd9nWpBMNMqafN8sVcU8uYSFg0nksQELMIOHomGRkPpIgOSP6cmWjKa8yQX1Zp0ft8yHmYbXhOydoxaM4EOUGeno8/0?wx_fmt=png"],
]);

const raw = readFileSync(articlePath, "utf8");
const frontmatter = raw.match(/^---\n([\s\S]*?)\n---/);
const body = raw.replace(/^---[\s\S]*?---\s*/, "");
const tokens = marked.lexer(body);

function frontmatterValue(key) {
	const match = frontmatter?.[1].match(new RegExp(`^${key}:\\s*(.+)$`, "m"));
	return match?.[1].trim().replace(/^['"]|['"]$/g, "") ?? "";
}

const title = frontmatterValue("title") || "未命名文章";
const digest = frontmatterValue("description");

const styles = {
	page: "background-color:#faf9f5;padding:40px 10px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;letter-spacing:0.5px;color:#4a413d;",
	card: "max-width:800px;margin:0 auto 40px;padding:25px;background-color:#ffffff;background-image:linear-gradient(rgba(0,0,0,0.02) 1px,transparent 1px),linear-gradient(90deg,rgba(0,0,0,0.02) 1px,transparent 1px);background-size:20px 20px;border:1px solid rgba(0,0,0,0.05);box-shadow:0 10px 30px rgba(0,0,0,0.04),0 0 15px rgba(217,119,88,0.25);border-radius:18px;box-sizing:border-box;",
	p: "margin:0 0 16px;color:#4a413d;font-size:16px;line-height:1.85;text-align:left;word-break:break-word;",
	li: "margin:0 0 8px;color:#4a413d;font-size:16px;line-height:1.8;word-break:break-word;",
};

function escapeHtml(value) {
	return value
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/file:\/\//g, "file:&#47;&#47;");
}

function renderInline(tokens = []) {
	return tokens.map((token) => {
		if (token.type === "strong") return `<strong style="color:#c06b4d;font-weight:700;">${renderInline(token.tokens)}</strong>`;
		if (token.type === "em") return `<em style="color:#6b5143;">${renderInline(token.tokens)}</em>`;
		if (token.type === "codespan") return `<code style="padding:2px 5px;border-radius:4px;background:#f8f1e8;color:#9A6A43;font-family:Consolas,Monaco,Menlo,monospace;font-size:14px;">${escapeHtml(token.text)}</code>`;
		if (token.type === "link") return `<a href="${escapeHtml(token.href)}" style="color:#c06b4d;text-decoration:none;border-bottom:1px solid rgba(192,107,77,0.35);">${renderInline(token.tokens)}</a>`;
		if (token.type === "br") return "<br>";
		if (token.type === "text") return escapeHtml(token.text).replace(/\n/g, "<br>");
		return escapeHtml(token.raw ?? token.text ?? "");
	}).join("");
}

function heading(token) {
	if (token.depth === 1) {
		return `<section style="${styles.card}"><h1 style="margin:0 0 14px;color:#4a3527;font-size:25px;line-height:1.45;font-weight:800;text-align:left;">${escapeHtml(title)}</h1><p style="margin:0;color:#8a6b55;font-size:14px;line-height:1.8;">${escapeHtml(digest)}</p></section>`;
	}
	if (token.depth === 2) {
		return `<h2 style="margin:28px 0 18px;padding-bottom:10px;border-bottom:1px dashed rgba(74,65,61,0.3);font-size:22px;line-height:1.45;font-weight:800;"><span style="color:#d97758;text-shadow:0 0 12px rgba(217,119,88,0.35);">▶ </span><span style="color:#d97758;">${renderInline(token.tokens)}</span></h2>`;
	}
	return `<h3 style="display:inline-block;margin:22px 0 14px;padding-bottom:4px;border-bottom:2px solid #d97758;color:#d97758;font-size:18px;line-height:1.55;font-weight:750;">${renderInline(token.tokens)}</h3>`;
}

function textBlock(text) {
	const rows = text.split("\n");
	const content = rows.map((row, index) => {
		const trimmed = row.trim();
		const margin = index === rows.length - 1 ? "0" : "0 0 8px";
		if (trimmed.startsWith("->")) {
			return `<p style="margin:${margin};color:#4A3527;font-size:15px;line-height:1.85;word-break:break-word;"><span style="color:#9A6A43;font-weight:700;">-&gt;</span>${escapeHtml(trimmed.slice(2))}</p>`;
		}
		return `<p style="margin:${margin};color:#4A3527;font-size:15px;line-height:1.85;word-break:break-word;">${escapeHtml(row)}</p>`;
	}).join("");

	return `<section style="margin:18px 0;padding:16px 18px;border-left:4px solid #9A6A43;background:#F8F1E8;border-radius:12px;color:#4A3527;line-height:1.85;white-space:normal;word-break:break-word;overflow:visible;">${content}</section>`;
}

function codeBlock(token) {
	if ((token.lang ?? "").trim().toLowerCase() === "text" || !token.lang) return textBlock(token.text);

	const lang = escapeHtml((token.lang ?? "").trim());
	const code = escapeHtml(token.text)
		.replace(/ /g, "&nbsp;")
		.replace(/\n/g, "<br>");
	return `<pre class="custom" data-tool="mdnice编辑器" style="border-radius:5px;box-shadow:rgba(0,0,0,0.45) 0px 2px 10px;text-align:left;margin:18px 0;padding:0;background:#282c34;overflow:hidden;"><span style="display:block;background:url(https://files.mdnice.com/user/3441/876cad08-0422-409d-bb5a-08afec5da8ee.svg);height:30px;width:100%;background-size:40px;background-repeat:no-repeat;background-color:#282c34;margin-bottom:-7px;border-radius:5px;background-position:10px 10px;"></span><code class="hljs language-${lang}" style="overflow-x:auto;padding:16px;color:#abb2bf;padding-top:15px;background:#282c34;border-radius:5px;display:-webkit-box;font-family:Consolas,Monaco,Menlo,monospace;font-size:12px;line-height:26px;white-space:pre;word-break:normal;word-wrap:normal;">${code}</code></pre>`;
}

function image(token) {
	const src = imageMap.get(token.href) ?? token.href;
	return `<figure style="margin:24px 0;text-align:center;"><img src="${escapeHtml(src)}" alt="${escapeHtml(token.text)}" style="display:block;width:100%;max-width:100%;height:auto;border-radius:12px;border:1px solid rgba(154,106,67,0.16);box-shadow:0 8px 20px rgba(74,53,39,0.08);" /><figcaption style="margin-top:8px;color:#8a6b55;font-size:13px;line-height:1.6;">${escapeHtml(token.text)}</figcaption></figure>`;
}

function list(token) {
	const tag = token.ordered ? "ol" : "ul";
	const items = token.items.map((item) => `<li style="${styles.li}">${item.tokens?.map(renderToken).join("") ?? escapeHtml(item.text)}</li>`).join("");
	return `<${tag} style="margin:0 0 18px;padding-left:24px;color:#4a413d;">${items}</${tag}>`;
}

function blockquote(token) {
	return `<blockquote style="margin:18px 0;padding:16px 18px;background-color:#fef4e7;border-left:5px solid #d97758;box-shadow:inset 0 0 15px rgba(217,119,88,0.1);border-radius:12px;">${token.tokens.map(renderToken).join("")}</blockquote>`;
}

function renderToken(token) {
	if (token.type === "space") return "";
	if (token.type === "heading") return heading(token);
	if (token.type === "paragraph") {
		if (token.tokens?.length === 1 && token.tokens[0].type === "image") return image(token.tokens[0]);
		return `<p style="${styles.p}">${renderInline(token.tokens)}</p>`;
	}
	if (token.type === "text") return renderInline(token.tokens ?? [token]);
	if (token.type === "list") return list(token);
	if (token.type === "blockquote") return blockquote(token);
	if (token.type === "code") return codeBlock(token);
	if (token.type === "hr") return `<hr style="border:none;height:1px;background-color:rgba(74,65,61,0.1);margin:28px 0;" />`;
	return "";
}

let sections = [];
let current = [];

for (const token of tokens) {
	if (token.type === "heading" && token.depth === 1) {
		if (current.length) sections.push(current);
		sections.push([token]);
		current = [];
		continue;
	}
	if (token.type === "heading" && token.depth === 2 && current.length) {
		sections.push(current);
		current = [token];
		continue;
	}
	current.push(token);
}

if (current.length) sections.push(current);

const bodyHtml = sections
	.map((section) => {
		if (section.length === 1 && section[0].type === "heading" && section[0].depth === 1) return renderToken(section[0]);
		return `<section style="${styles.card}">${section.map(renderToken).join("")}</section>`;
	})
	.join("");

const html = `<div style="${styles.page}">${bodyHtml}<section style="${styles.card}"><p style="margin:0;color:#8a6b55;font-size:14px;line-height:1.8;text-align:center;">阅读全文，下一章继续拆 Claude Code 的扩展能力。</p></section></div>`;

mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(outputPath, html);
console.log(`Wrote ${outputPath}`);
