from __future__ import annotations

import json
import re
import shutil
import subprocess
from pathlib import Path


SOURCE_DIR = Path(
	"/Users/lienli/Documents/GitHub/learn-agent/src/content/blog/zh/AI/3.ClaudeCode源码解析"
)
TARGET_DIR = Path(
	"/Users/lienli/Documents/GitHub/learn-agent/src/content/blog/en/AI/Claude code"
)
SOURCE_ASSETS_DIR = SOURCE_DIR / "assets"
TARGET_ASSETS_DIR = TARGET_DIR / "assets"

FILE_MAP = {
	"00.系列导读.md": "00-series-guide.md",
	"01.工程架构.md": "01-engineering-architecture.md",
	"02.核心机制-ReAct.md": "02-react-loop.md",
	"03.核心机制-Prompt编写.md": "03-prompt-construction.md",
	"04.1核心机制-Context管理.md": "04-1-context-management.md",
	"04.2ContextManage（选修）.md": "04-2-context-governance-elective.md",
	"05.0核心机制-Tools.md": "05-0-tools-overview.md",
	"05.1文件工具-文件管理.md": "05-1-file-tools.md",
	"05.2终端工具-命令执行.md": "05-2-terminal-tools.md",
	"05.3工作流工具-任务管理.md": "05-3-task-management.md",
	"06.MCP.md": "06-mcp.md",
	"07.Skill.md": "07-skill.md",
	"08.1Agent协作.md": "08-1-agent-collaboration.md",
	"08.2业界的Agent协作（选修）.md": "08-2-industry-agent-collaboration-elective.md",
	"09.1Plan.md": "09-1-plan.md",
	"09.2业界Plan（选修）.md": "09-2-industry-plan-elective.md",
}

FRONTMATTER_TITLES = {
	"00.系列导读.md": "Guide to the Claude Code Source Analysis Series",
	"01.工程架构.md": "Claude Code Source Analysis Series, Chapter 1: Architecture",
	"02.核心机制-ReAct.md": "Claude Code Source Analysis Series, Chapter 2: The ReAct Main Loop",
	"03.核心机制-Prompt编写.md": "Claude Code Source Analysis Series, Chapter 3: Prompt Construction",
	"04.1核心机制-Context管理.md": "Claude Code Source Analysis Series, Chapter 4: Context Management",
	"04.2ContextManage（选修）.md": "Claude Code Source Analysis Series, Chapter 5: Context Governance (Optional)",
	"05.0核心机制-Tools.md": "Claude Code Source Analysis Series, Chapter 6: Tools Overview",
	"05.1文件工具-文件管理.md": "Claude Code Source Analysis Series, Chapter 7: File Tools",
	"05.2终端工具-命令执行.md": "Claude Code Source Analysis Series, Chapter 8: Terminal Tools",
	"05.3工作流工具-任务管理.md": "Claude Code Source Analysis Series, Chapter 9: Task Management",
	"06.MCP.md": "Claude Code Source Analysis Series, Chapter 10: MCP",
	"07.Skill.md": "Claude Code Source Analysis Series, Chapter 11: Skills",
	"08.1Agent协作.md": "Claude Code Source Analysis Series, Chapter 12: Agent Collaboration",
	"08.2业界的Agent协作（选修）.md": "Claude Code Source Analysis Series, Chapter 13: Industry Approaches to Agent Collaboration (Optional)",
	"09.1Plan.md": "Claude Code Source Analysis Series, Chapter 14: Planning",
	"09.2业界Plan（选修）.md": "Claude Code Source Analysis Series, Chapter 15: Industry Approaches to Planning (Optional)",
}

FRONTMATTER_DESCRIPTIONS = {
	"00.系列导读.md": "An index for the Claude Code source analysis series, organized around architecture, core mechanisms, tools, extensibility, and collaboration.",
	"01.工程架构.md": "A high-level tour of Claude Code's runtime architecture, capability layers, and core modules.",
	"02.核心机制-ReAct.md": "How Claude Code implements its ReAct loop and keeps the model moving through multi-step work.",
	"03.核心机制-Prompt编写.md": "How Claude Code assembles its system prompt, memory, and runtime context on each turn.",
	"04.1核心机制-Context管理.md": "How Claude Code manages context, compresses history, and stays coherent during long-running tasks.",
	"04.2ContextManage（选修）.md": "A broader industry view of context management and how Claude Code compares with other agent systems.",
	"05.0核心机制-Tools.md": "A breakdown of Claude Code's tool system, including tool protocols, permissions, and execution flow.",
	"05.1文件工具-文件管理.md": "How Claude Code reads, edits, and writes files safely inside a real codebase.",
	"05.2终端工具-命令执行.md": "How Claude Code runs terminal commands, enforces permissions, and feeds results back into the loop.",
	"05.3工作流工具-任务管理.md": "How Claude Code tracks todos, plans, and long-running task state through workflow tools.",
	"06.MCP.md": "How Claude Code integrates MCP servers and turns external tools and resources into first-class runtime capabilities.",
	"07.Skill.md": "How Claude Code packages task experience into reusable skills and loads them at runtime.",
	"08.1Agent协作.md": "How Claude Code coordinates multiple agents, including sub-agents, tasks, and permission boundaries.",
	"08.2业界的Agent协作（选修）.md": "A comparison of how other agent systems split, coordinate, and converge multi-agent work.",
	"09.1Plan.md": "How Claude Code turns planning mode into a runtime mechanism with explicit permission boundaries.",
	"09.2业界Plan（选修）.md": "A comparison of planning designs across agent systems, and how planning evolved into an execution control plane.",
}

MANUAL_ALIASES = {
	"00.系列导读.md": [
		"Claude Code source analysis guide",
		"Claude Code series index",
	],
	"01.工程架构.md": [
		"Claude Code architecture",
		"Claude Code runtime architecture",
	],
	"02.核心机制-ReAct.md": [
		"Claude Code ReAct loop",
		"Claude Code main loop",
	],
	"03.核心机制-Prompt编写.md": [
		"Claude Code prompt construction",
		"Claude Code system prompt",
	],
	"04.1核心机制-Context管理.md": [
		"Claude Code context management",
		"Claude Code context compression",
	],
	"04.2ContextManage（选修）.md": [
		"Context governance for coding agents",
		"Claude Code context governance",
	],
	"05.0核心机制-Tools.md": [
		"Claude Code tools overview",
		"Claude Code tool system",
	],
	"05.1文件工具-文件管理.md": [
		"Claude Code file tools",
		"Claude Code file management",
	],
	"05.2终端工具-命令执行.md": [
		"Claude Code terminal tools",
		"Claude Code command execution",
	],
	"05.3工作流工具-任务管理.md": [
		"Claude Code task management",
		"Claude Code workflow tools",
	],
	"06.MCP.md": [
		"Claude Code MCP",
		"Claude Code MCP integration",
	],
	"07.Skill.md": [
		"Claude Code skills",
		"Claude Code skill system",
	],
	"08.1Agent协作.md": [
		"Claude Code agent collaboration",
		"Claude Code subagents",
	],
	"08.2业界的Agent协作（选修）.md": [
		"Industry agent collaboration",
		"Multi-agent orchestration patterns",
	],
	"09.1Plan.md": [
		"Claude Code planning mode",
		"Claude Code plan mode",
	],
	"09.2业界Plan（选修）.md": [
		"Industry planning patterns for agents",
		"Agent planning control plane",
	],
}

MANUAL_TAGS = {
	"源码解析": "Source Analysis",
	"系列导读": "Series Guide",
	"工程架构": "Architecture",
	"多 Agent 机制": "Multi-Agent Systems",
	"Agent 协作": "Agent Collaboration",
	"终端工具": "Terminal Tools",
	"文件工具": "File Tools",
	"任务管理": "Task Management",
	"核心机制": "Core Mechanisms",
	"上下文管理": "Context Management",
	"工具系统": "Tool System",
}

META = {
	"title": "Claude Code Source Analysis",
	"alias": "Claude Code Source Analysis",
	"description": "A guided walkthrough of Claude Code's architecture, context handling, tools, MCP integration, and agent collaboration model.",
	"cover": "/blog-covers/claude-code-typing.svg",
	"order": 3,
}

SYSTEM_PROMPT = """You are a translation engine, not an agent.
Translate Chinese technical writing into natural, idiomatic English for native readers.
Preserve technical meaning, markdown structure, headings, lists, links, code fences, inline code, commands, paths, filenames, and punctuation used inside code or path literals.
You may rewrite sentence structure so the result reads like a strong English technical blog post rather than a literal translation.
Do not mention reading files, do not describe your process, do not emit tool calls, XML, JSON, or commentary.
Output only the final translated markdown body."""

MAX_SECTION_CHARS = 2200

STANDALONE_PATH_RE = re.compile(r"^/Users/.+\.(?:md|txt|json|ya?ml|png|jpe?g|svg)$")
CHATTER_PATTERNS = (
	"I'll translate",
	"I will translate",
	"Let me ",
	"Here is the translation",
	"Here's the translation",
)

ALT_TEXT_REPLACEMENTS = {
	"手绘图": "Sketch",
	"图": "Figure",
	"架构图": "Architecture Diagram",
	"示意图": "Illustration",
	"流程图": "Flowchart",
}

HEADING_PREFIX_RE = re.compile(
	r"^(?:\d+\.\s+|[IVXLCDM]+\.\s+|[一二三四五六七八九十百千]+、)"
)
NOISE_LINE_RE = re.compile(
	r'^(\{"file_path":|for name in |\{"[^"]+":\s*".*translate-claude-code-series\.py")'
)


def protect_local_links(text: str) -> tuple[str, dict[str, str]]:
	link_map: dict[str, str] = {}

	def replacer(match: re.Match[str]) -> str:
		label = match.group(1)
		target = match.group(2)
		placeholder = f"__LOCAL_LINK_{len(link_map)}__"
		stem = Path(target).name
		mapped = FILE_MAP.get(f"{stem}.md")
		if mapped is None:
			return match.group(0)
		link_map[placeholder] = f"./{Path(mapped).stem}"
		return f"[{label}]({placeholder})"

	return re.sub(r"\[([^\]]+)\]\(\./([^)]+)\)", replacer, text), link_map


def restore_local_links(text: str, link_map: dict[str, str]) -> str:
	for placeholder, target in link_map.items():
		text = text.replace(f"({placeholder})", f"({target})")
	return text


def replace_local_links(text: str) -> str:
	for source_name, target_name in FILE_MAP.items():
		stem = Path(source_name).stem
		text = text.replace(f"](./{stem})", f"](./{Path(target_name).stem})")
	return text


def clean_translation_output(text: str) -> str:
	lines: list[str] = []
	for line in text.splitlines():
		stripped = line.strip()
		if STANDALONE_PATH_RE.match(stripped):
			continue
		if NOISE_LINE_RE.match(stripped):
			continue
		if stripped.startswith("<tool_call") or stripped.startswith("</tool_call"):
			continue
		if any(stripped.startswith(pattern) for pattern in CHATTER_PATTERNS):
			continue
		lines.append(line)
	return "\n".join(lines).strip()


def normalize_heading_numbering(text: str) -> str:
	heading_index = 0
	lines: list[str] = []
	for line in text.splitlines():
		if line.startswith("## "):
			heading_index += 1
			title = HEADING_PREFIX_RE.sub("", line[3:].strip())
			lines.append(f"## {heading_index}. {title}")
			continue
		lines.append(line)
	return "\n".join(lines)


def english_asset_name(filename: str) -> str:
	for source_name, target_name in FILE_MAP.items():
		source_stem = Path(source_name).stem
		target_stem = Path(target_name).stem
		if filename.startswith(f"{source_stem}-"):
			return f"{target_stem}{filename[len(source_stem):]}"
	return filename


def rewrite_asset_paths(text: str) -> str:
	def replacer(match: re.Match[str]) -> str:
		alt = match.group(1)
		filename = match.group(2)
		return f"![{alt}](./assets/{english_asset_name(filename)})"

	return re.sub(r"!\[([^\]]*)\]\(\./assets/([^)]+)\)", replacer, text)


def clean_alt_text(text: str) -> str:
	def replacer(match: re.Match[str]) -> str:
		alt = match.group(1)
		path = match.group(2)
		cleaned = alt
		for source, target in ALT_TEXT_REPLACEMENTS.items():
			cleaned = cleaned.replace(source, target)
		cleaned = re.sub(r"[《》]", "", cleaned)
		cleaned = re.sub(r"\s+", " ", cleaned).strip()
		return f"![{cleaned}](./{path})"

	return re.sub(r"!\[([^\]]*)\]\(\./([^)]+)\)", replacer, text)


def finalize_translated_body(text: str) -> str:
	text = clean_alt_text(text)
	text = rewrite_asset_paths(text)
	text = normalize_heading_numbering(text)
	return text


def ensure_asset_aliases() -> None:
	TARGET_ASSETS_DIR.mkdir(parents=True, exist_ok=True)
	for asset in SOURCE_ASSETS_DIR.iterdir():
		if not asset.is_file():
			continue
		original_target = TARGET_ASSETS_DIR / asset.name
		if not original_target.exists():
			shutil.copy2(asset, original_target)
		english_name = english_asset_name(asset.name)
		english_target = TARGET_ASSETS_DIR / english_name
		if english_target != original_target and not english_target.exists():
			shutil.copy2(asset, english_target)


def split_into_sections(body: str) -> list[str]:
	lines = body.splitlines(keepends=True)
	sections: list[str] = []
	current: list[str] = []
	in_code = False

	def flush() -> None:
		if current:
			sections.append("".join(current).strip("\n"))
			current.clear()

	for line in lines:
		if line.startswith("```"):
			in_code = not in_code
		if not in_code and line.startswith("## "):
			flush()
		current.append(line)

	flush()
	return [section for section in sections if section.strip()]


def split_large_section(section: str, max_chars: int = MAX_SECTION_CHARS) -> list[str]:
	if len(section) <= max_chars:
		return [section]

	lines = section.splitlines(keepends=True)
	chunks: list[str] = []
	current: list[str] = []
	in_code = False

	def flush() -> None:
		if current:
			chunks.append("".join(current).strip("\n"))
			current.clear()

	for line in lines:
		if line.startswith("```"):
			in_code = not in_code

		if (
			current
			and len("".join(current)) + len(line) > max_chars
			and not in_code
			and line.strip() == ""
		):
			flush()
			continue

		current.append(line)

	flush()
	return [chunk for chunk in chunks if chunk.strip()]


def translate_frontmatter(frontmatter: str, filename: str) -> str:
	lines = frontmatter.splitlines()
	output: list[str] = ["---"]
	in_tags = False
	in_aliases = False

	for line in lines[1:-1]:
		stripped = line.strip()
		if line.startswith("title: "):
			output.append(f"title: '{FRONTMATTER_TITLES[filename]}'")
			in_tags = False
			in_aliases = False
			continue
		if line.startswith("description: "):
			output.append(f"description: '{FRONTMATTER_DESCRIPTIONS[filename]}'")
			in_tags = False
			in_aliases = False
			continue
		if line.startswith("locale: "):
			output.append("locale: 'en'")
			in_tags = False
			in_aliases = False
			continue
		if line.startswith("tags:"):
			output.append("tags:")
			in_tags = True
			in_aliases = False
			continue
		if line.startswith("aliases:"):
			output.append("aliases:")
			for alias in MANUAL_ALIASES.get(filename, []):
				output.append(f"  - {alias}")
			in_tags = False
			in_aliases = True
			continue
		if stripped.startswith("- ") and in_tags:
			tag = stripped[2:]
			output.append(f"  - {MANUAL_TAGS.get(tag, tag)}")
			continue
		if stripped.startswith("- ") and in_aliases:
			continue
		in_tags = False
		in_aliases = False
		output.append(line)

	output.append("---")
	return "\n".join(output)


def run_claude_translate(body: str, source_name: str) -> str:
	protected_body, link_map = protect_local_links(body)
	user_prompt = (
		f"Translate the following markdown fragment from Chinese to English.\n"
		f"Source filename: {source_name}\n\n"
		f"{protected_body}"
	)
	result = subprocess.run(
		[
			"claude",
			"-p",
			"--tools",
			"",
			"--permission-mode",
			"bypassPermissions",
			"--model",
			"sonnet",
			"--append-system-prompt",
			SYSTEM_PROMPT,
			user_prompt,
		],
		check=True,
		capture_output=True,
		text=True,
		timeout=180,
	)
	text = clean_translation_output(result.stdout)
	text = restore_local_links(text, link_map)
	return replace_local_links(text)


def translate_body_in_blocks(body: str, source_name: str) -> str:
	translated_blocks: list[str] = []
	for section in split_into_sections(body):
		for block in split_large_section(section):
			if not re.search(r"[\u4e00-\u9fff]", block):
				translated_blocks.append(replace_local_links(block))
				continue
			translated_blocks.append(run_claude_translate(block, source_name))
	return "\n\n".join(block.rstrip() for block in translated_blocks if block.strip()).rstrip()


def translate_file(source_path: Path, target_path: Path) -> None:
	text = source_path.read_text(encoding="utf-8")
	match = re.match(r"^(---\n[\s\S]*?\n---)\n([\s\S]*)$", text)
	if not match:
		raise ValueError(f"Missing frontmatter in {source_path.name}")

	ensure_asset_aliases()
	frontmatter = translate_frontmatter(match.group(1), source_path.name)
	sections = split_into_sections(match.group(2))
	translated_sections: list[str] = []
	target_path.write_text(f"{frontmatter}\n", encoding="utf-8")

	for section in sections:
		translated_parts: list[str] = []
		for block in split_large_section(section):
			if not re.search(r"[\u4e00-\u9fff]", block):
				translated_parts.append(replace_local_links(block))
			else:
				translated_parts.append(run_claude_translate(block, source_path.name))
		translated_section = "\n\n".join(
			part.rstrip() for part in translated_parts if part.strip()
		).rstrip()
		translated_sections.append(translated_section)
		body_so_far = "\n\n".join(
			section_text for section_text in translated_sections if section_text.strip()
		).rstrip()
		target_path.write_text(
			f"{frontmatter}\n{finalize_translated_body(body_so_far)}\n",
			encoding="utf-8",
		)


def main() -> None:
	TARGET_DIR.mkdir(parents=True, exist_ok=True)
	if TARGET_ASSETS_DIR.exists():
		shutil.rmtree(TARGET_ASSETS_DIR)
	shutil.copytree(SOURCE_ASSETS_DIR, TARGET_ASSETS_DIR)

	for source_name, target_name in FILE_MAP.items():
		translate_file(SOURCE_DIR / source_name, TARGET_DIR / target_name)

	(TARGET_DIR / "_meta.json").write_text(
		f"{json.dumps(META, ensure_ascii=False, indent=2)}\n",
		encoding="utf-8",
	)


if __name__ == "__main__":
	main()
