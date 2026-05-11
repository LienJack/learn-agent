from __future__ import annotations

# Deprecated compatibility script.
# Current translation entrypoints live under translate/:
# - translate/skills/translate-ja/SKILL.md
# - translate/bin/translate-ja
# - translate/pipelines/claude-code-series.json

import importlib.util
from pathlib import Path


BASE_SCRIPT = Path(__file__).with_name("translate-claude-code-series.py")
SPEC = importlib.util.spec_from_file_location("translate_claude_code_series_base", BASE_SCRIPT)
if SPEC is None or SPEC.loader is None:  # pragma: no cover
	raise RuntimeError(f"Unable to load base script: {BASE_SCRIPT}")

module = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(module)

module.SOURCE_DIR = Path(
	"/Users/lienli/Documents/GitHub/learn-agent/src/content/blog/zh/AI/3.ClaudeCode源码解析"
)
module.TARGET_DIR = Path(
	"/Users/lienli/Documents/GitHub/learn-agent/src/content/blog/ja/AI/Claude Code"
)
module.SOURCE_ASSETS_DIR = Path(
	"/Users/lienli/Documents/GitHub/learn-agent/src/content/blog/zh/AI/3.ClaudeCode源码解析/assets"
)
module.TARGET_ASSETS_DIR = module.TARGET_DIR / "assets"

module.FRONTMATTER_TITLES = {
	"00.系列导读.md": "Claude Code ソースコード解説シリーズ ガイド",
	"01.工程架构.md": "Claude Code ソースコード解説シリーズ 第1章: アーキテクチャ",
	"02.核心机制-ReAct.md": "Claude Code ソースコード解説シリーズ 第2章: ReAct メインループ",
	"03.核心机制-Prompt编写.md": "Claude Code ソースコード解説シリーズ 第3章: プロンプト構築",
	"04.1核心机制-Context管理.md": "Claude Code ソースコード解説シリーズ 第4章: コンテキスト管理",
	"04.2ContextManage（选修）.md": "Claude Code ソースコード解説シリーズ 第5章: コンテキストガバナンス（選択）",
	"05.0核心机制-Tools.md": "Claude Code ソースコード解説シリーズ 第6章: ツール概要",
	"05.1文件工具-文件管理.md": "Claude Code ソースコード解説シリーズ 第7章: ファイルツール",
	"05.2终端工具-命令执行.md": "Claude Code ソースコード解説シリーズ 第8章: ターミナルツール",
	"05.3工作流工具-任务管理.md": "Claude Code ソースコード解説シリーズ 第9章: タスク管理",
	"06.MCP.md": "Claude Code ソースコード解説シリーズ 第10章: MCP",
	"07.Skill.md": "Claude Code ソースコード解説シリーズ 第11章: Skill",
	"08.1Agent协作.md": "Claude Code ソースコード解説シリーズ 第12章: Agent 協調",
	"08.2业界的Agent协作（选修）.md": "Claude Code ソースコード解説シリーズ 第13章: 業界の Agent 協調（選択）",
	"09.1Plan.md": "Claude Code ソースコード解説シリーズ 第14章: Plan",
	"09.2业界Plan（选修）.md": "Claude Code ソースコード解説シリーズ 第15章: 業界の Plan（選択）",
}

module.FRONTMATTER_DESCRIPTIONS = {
	"00.系列导读.md": "Claude Code のアーキテクチャ、コンテキスト、ツール、MCP、複数 Agent の協調をたどるシリーズの導入ページです。",
	"01.工程架构.md": "Claude Code のランタイムアーキテクチャ、能力レイヤー、主要モジュールを俯瞰します。",
	"02.核心机制-ReAct.md": "Claude Code の ReAct ループを分解し、query.ts がモデルの継続行動をどう駆動するかを理解します。",
	"03.核心机制-Prompt编写.md": "Claude Code が system prompt、記憶、ランタイムコンテキストを毎ターンどう組み立てるかを説明します。",
	"04.1核心机制-Context管理.md": "Claude Code がコンテキストを管理し、履歴を圧縮し、長いタスクの一貫性を保つ仕組みを解説します。",
	"04.2ContextManage（选修）.md": "コンテキスト管理を業界全体の視点から補足し、他の Agent システムと比較します。",
	"05.0核心机制-Tools.md": "Claude Code のツールシステムを、プロトコル、権限、実行フローの観点から整理します。",
	"05.1文件工具-文件管理.md": "Claude Code が実際のコードベース内でファイルを安全に読み書きする方法を見ていきます。",
	"05.2终端工具-命令执行.md": "Claude Code がターミナルコマンドを実行し、権限を守りながら結果をループに戻す仕組みを解説します。",
	"05.3工作流工具-任务管理.md": "Claude Code が Todo、Plan、長期タスク状態をワークフローツールで追跡する方法を説明します。",
	"06.MCP.md": "Claude Code が MCP サーバーを統合し、外部ツールとリソースをランタイム能力として扱う方法を示します。",
	"07.Skill.md": "Claude Code がタスク経験を再利用可能な Skill にまとめ、実行時に読み込む仕組みを解説します。",
	"08.1Agent协作.md": "Claude Code の複数 Agent 協調、サブ Agent、Task、権限制御を分解して説明します。",
	"08.2业界的Agent协作（选修）.md": "業界の複数 Agent 設計を横断比較し、仕事の分割と収束の仕方を整理します。",
	"09.1Plan.md": "Claude Code が Plan Mode を権限境界つきのランタイム機構に変える方法を説明します。",
	"09.2业界Plan（选修）.md": "業界の Agent 設計における Plan を比較し、計画が実行制御面へ進化する流れを見ます。",
}

module.MANUAL_ALIASES = {
	"00.系列导读.md": [
		"Claude Code ソースコード解説ガイド",
		"Claude Code シリーズ目次",
	],
	"01.工程架构.md": [
		"Claude Code アーキテクチャ",
		"Claude Code ランタイムアーキテクチャ",
	],
	"02.核心机制-ReAct.md": [
		"Claude Code ReAct ループ",
		"Claude Code メインループ",
	],
	"03.核心机制-Prompt编写.md": [
		"Claude Code プロンプト構築",
		"Claude Code システムプロンプト",
	],
	"04.1核心机制-Context管理.md": [
		"Claude Code コンテキスト管理",
		"Claude Code コンテキスト圧縮",
	],
	"04.2ContextManage（选修）.md": [
		"コンテキストガバナンス",
		"Claude Code コンテキストガバナンス",
	],
	"05.0核心机制-Tools.md": [
		"Claude Code ツール概要",
		"Claude Code ツールシステム",
	],
	"05.1文件工具-文件管理.md": [
		"Claude Code ファイルツール",
		"Claude Code ファイル管理",
	],
	"05.2终端工具-命令执行.md": [
		"Claude Code ターミナルツール",
		"Claude Code コマンド実行",
	],
	"05.3工作流工具-任务管理.md": [
		"Claude Code タスク管理",
		"Claude Code ワークフローツール",
	],
	"06.MCP.md": [
		"Claude Code MCP",
		"Claude Code MCP 統合",
	],
	"07.Skill.md": [
		"Claude Code Skill",
		"Claude Code Skill システム",
	],
	"08.1Agent协作.md": [
		"Claude Code Agent 協調",
		"Claude Code サブ Agent",
	],
	"08.2业界的Agent协作（选修）.md": [
		"業界の Agent 協調",
		"マルチ Agent オーケストレーション",
	],
	"09.1Plan.md": [
		"Claude Code Plan Mode",
		"Claude Code 計画モード",
	],
	"09.2业界Plan（选修）.md": [
		"業界の Plan 設計",
		"Agent の計画制御面",
	],
}

module.MANUAL_TAGS = {
	"源码解析": "ソースコード解説",
	"系列导读": "シリーズ導入",
	"工程架构": "アーキテクチャ",
	"多 Agent 机制": "マルチ Agent",
	"Agent 协作": "Agent 協調",
	"终端工具": "ターミナルツール",
	"文件工具": "ファイルツール",
	"任务管理": "タスク管理",
	"核心机制": "コア機構",
	"上下文管理": "コンテキスト管理",
	"工具系统": "ツールシステム",
}

module.META = {
	"title": "Claude Code ソースコード解説",
	"alias": "Claude Code ソースコード解説",
	"description": "Claude Code のアーキテクチャ、コンテキスト、ツール、MCP、協調設計をたどる日語シリーズの入口です。",
	"cover": "/blog-covers/claude-code-typing.svg",
	"order": 3,
}

module.SYSTEM_PROMPT = """You are a translation engine, not an agent.
Translate Chinese technical writing into natural Japanese for Japanese software engineers.
Prefer idiomatic Japanese technical-blog prose over literal Chinese sentence order.
Use a consistent Japanese writing style that is readable and natural, and keep the tone calm rather than promotional.
Output Japanese text only, including headings and prose. Do not leave English section titles unless they are technical identifiers, file names, or code literals.
Preserve markdown structure, headings, lists, links, inline code, code fences, commands, file paths, filenames, and technical identifiers.
Do not translate code identifiers.
Do not mention reading files, do not describe your process, do not emit tool calls, XML, JSON, or commentary.
Output only the final translated markdown body."""

module.CHATTER_PATTERNS = (
	"I'll translate",
	"I will translate",
	"Let me ",
	"Here is the translation",
	"Here's the translation",
	"以下が翻訳です",
	"翻訳は以下です",
	"こちらが翻訳です",
)

module.ALT_TEXT_REPLACEMENTS = {
	"手绘图": "スケッチ図",
	"图": "図",
	"架构图": "構成図",
	"示意图": "概念図",
	"流程图": "フローチャート",
}

module.MAX_SECTION_CHARS = 900


def translate_frontmatter(frontmatter: str, filename: str) -> str:
	lines = frontmatter.splitlines()
	output: list[str] = ["---"]
	in_tags = False
	in_aliases = False

	for line in lines[1:-1]:
		stripped = line.strip()
		if line.startswith("title: "):
			output.append(f"title: '{module.FRONTMATTER_TITLES[filename]}'")
			in_tags = False
			in_aliases = False
			continue
		if line.startswith("description: "):
			output.append(f"description: '{module.FRONTMATTER_DESCRIPTIONS[filename]}'")
			in_tags = False
			in_aliases = False
			continue
		if line.startswith("locale: "):
			output.append("locale: 'ja'")
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
			for alias in module.MANUAL_ALIASES.get(filename, []):
				output.append(f"  - {alias}")
			in_tags = False
			in_aliases = True
			continue
		if stripped.startswith("- ") and in_tags:
			tag = stripped[2:]
			output.append(f"  - {module.MANUAL_TAGS.get(tag, tag)}")
			continue
		if stripped.startswith("- ") and in_aliases:
			continue
		in_tags = False
		in_aliases = False
		output.append(line)

	output.append("---")
	return "\n".join(output)


module.translate_frontmatter = translate_frontmatter


def run_claude_translate(body: str, source_name: str) -> str:
	protected_body, link_map = module.protect_local_links(body)
	user_prompt = (
		f"Translate the following markdown fragment from Chinese to Japanese.\n"
		f"Source filename: {source_name}\n\n"
		f"{protected_body}"
	)
	result = module.subprocess.run(
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
			module.SYSTEM_PROMPT,
			user_prompt,
		],
		check=True,
		capture_output=True,
		text=True,
		timeout=180,
	)
	text = module.clean_translation_output(result.stdout)
	text = module.restore_local_links(text, link_map)
	return module.replace_local_links(text)


module.run_claude_translate = run_claude_translate


def split_large_section(section: str, max_chars: int = 900) -> list[str]:
	if len(section) <= max_chars:
		return [section]

	lines: list[str] = section.splitlines(keepends=True)
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


def translate_body_in_blocks(body: str, source_name: str) -> str:
	translated_blocks: list[str] = []
	for section in module.split_into_sections(body):
		for block in split_large_section(section):
			if not module.re.search(r"[\u4e00-\u9fff]", block):
				translated_blocks.append(module.replace_local_links(block))
				continue
			translated_blocks.append(run_claude_translate(block, source_name))
	return "\n\n".join(block.rstrip() for block in translated_blocks if block.strip()).rstrip()


def translate_file(source_path: Path, target_path: Path) -> None:
	text = source_path.read_text(encoding="utf-8")
	match = module.re.match(r"^(---\n[\s\S]*?\n---)\n([\s\S]*)$", text)
	if not match:
		raise ValueError(f"Missing frontmatter in {source_path.name}")

	module.ensure_asset_aliases()
	frontmatter = translate_frontmatter(match.group(1), source_path.name)
	sections = module.split_into_sections(match.group(2))
	translated_sections: list[str] = []
	target_path.write_text(f"{frontmatter}\n", encoding="utf-8")

	for section in sections:
		translated_parts: list[str] = []
		for block in split_large_section(section):
			if not module.re.search(r"[\u4e00-\u9fff]", block):
				translated_parts.append(module.replace_local_links(block))
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
			f"{frontmatter}\n{module.finalize_translated_body(body_so_far)}\n",
			encoding="utf-8",
		)


module.translate_body_in_blocks = translate_body_in_blocks
module.translate_file = translate_file


if __name__ == "__main__":
	module.main()
