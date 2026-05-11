#!/usr/bin/env python3
from __future__ import annotations

import argparse
import base64
import json
import os
import shutil
import subprocess
import sys
import time
import tomllib
from pathlib import Path

try:
    from openai import OpenAI
    from openai import APIError
    from PIL import Image
except ModuleNotFoundError:
    venv_python = Path(__file__).resolve().parents[1] / "tmp/imagegen-venv/bin/python"
    if venv_python.exists() and Path(sys.executable).resolve() != venv_python.resolve():
        os.execv(str(venv_python), [str(venv_python), *sys.argv])
    raise

REPO = Path(__file__).resolve().parents[1]
SOURCE_DIR = REPO / "src/content/blog/zh/AI/3.ClaudeCode源码解析/assets"
TARGET_DIR = REPO / "src/content/blog/ja/AI/Claude Code/assets"
PROMPT_FILE = REPO / "tmp/claude-code-ja-image-regeneration-prompts.jsonl"
TMP_DIR = REPO / "tmp/claude-code-ja-image-regeneration"
SOURCE_PROMPT_JSON = REPO / "tmp/claude-code-en-image-prompts.json"
DEFAULT_OPENAI_BASE_URL = "https://api.openai.com/v1"

REFERENCE_PROMPT_FILES = {
    "02-photo-05.png": REPO / "tmp/imagegen/claude-code-functional-architecture-photo.prompt",
}

FALLBACK_REFERENCE_PROMPTS = {
    "03-photo-02-system-prompt-priority.png": """Create an in-article hand-drawn technical explanation image about the priority ladder for assembling the final system prompt in Claude Code.

Style: off-white paper background with subtle paper texture, black hand-drawn pen linework with slightly uneven stroke width, a few pale yellow highlights, editorial technical illustration, technical-blog hand-drawn mechanism diagram, clean, restrained, and engineering-sketch-like.

Composition: a tall vertical priority ladder on the left with six numbered slots from top to bottom, a selected primary rule book in the middle, a small append note near the right, and the final System Prompt document on the far right. Show a top-to-bottom priority arrow on the far left.

Content:
1. Top slot highlighted in pale yellow: override.
2. Then Coordinator.
3. Then Agent.
4. Then custom.
5. Then default.
6. Bottom slot highlighted in pale yellow: append.
Show that only one primary rule is selected by priority, then append is added afterward without overwriting the selected main rule.

Text: make all user-facing explanatory text natural Japanese. Keep short identifiers such as override, Coordinator, Agent, custom, default, append, and System Prompt in English if helpful, but all explanatory labels around them should be Japanese. Do not generate Chinese text.

Important: preserve the original composition and the same number of major objects. It should feel like the original image was authored for a Japanese technical blog from the start.""",
}

BASE_STYLE = """Use the input image as the exact visual reference. Regenerate the same image as a Japanese-language version for Japanese software engineers.
Preserve the original composition, camera/framing, paper texture, off-white background, black hand-drawn ink linework, pale yellow highlight blocks, icon positions, arrows, spacing, technical-blog sketch style, and overall visual density.
Translate or replace every visible Chinese character with concise natural Japanese. Keep existing English identifiers only when they are standard technical terms in Japanese engineering writing, such as Model API, QueryEngine, MCP, LSP, Agent, Task, Skills, inputSchema, and tool_use.
Use short labels only; avoid paragraphs. Do not leave any Chinese or Korean characters. Do not add watermarks, logos, or unrelated decoration.
The result should look like the original image was designed in Japanese from the start, not like text was pasted over it."""

ITEMS = [
    ("00-cover-claude-code-runtime.jpg", "Claude Code source analysis", "From Model API to Agent Runtime.", ["Claude Code ソースコード解説", "Model API から Agent ランタイムへ", "マルチ Agent 協調"]),
    ("01-cover-engineering-architecture.jpg", "Claude Code engineering architecture", "Not a chatbot: an engineered runtime around model capability.", ["Claude Code エンジニアリングアーキテクチャ", "入力 / 依頼", "ツール / ランタイム", "Context / 状態", "Agent / Task", "権限 / セキュリティ", "拡張性", "観測可能な結果", "推論コア", "主ループ", "Tools", "Context / State", "Safety", "Agents"]),
    ("02-cover-react-loop.jpg", "Claude Code ReAct loop", "Observe, think, act, and write back.", ["Claude Code ReAct ループ", "観測", "思考", "結果", "継続", "State", "Tool", "Context", "モデル呼び出し", "停止"]),
    ("03-cover-prompt-runtime.jpg", "Prompt runtime", "How Claude Code assembles one model request.", ["Prompt ランタイム", "ルール", "メモリ", "ツール", "履歴", "要約", "Prompt", "モデル"]),
    ("04-1-cover-context-management.jpg", "Claude Code context management", "Token budget, files, tool results, compaction, and recent tail.", ["Claude Code コンテキスト管理", "履歴", "ファイル", "ツール結果", "圧縮", "最近", "次ターン", "working set"]),
    ("04-2-cover-context-governance.jpg", "Context governance", "Filter what enters context and decide what wins.", ["コンテキストガバナンス", "入力", "ポリシー", "モデル", "外部", "圧縮", "メモリ", "フィードバックと指標"]),
    ("05-0-cover-tools-pipeline.jpg", "Claude Code tools pipeline", "Intent becomes a governed tool call.", ["Claude Code Tools パイプライン", "意図", "スキーマ", "権限", "フック", "実行", "結果", "tool_result", "モデル"]),
    ("05-1-cover-file-tools.jpg", "Claude Code file workflow", "Read, snapshot, edit, diff, write, and guard.", ["Claude Code ファイルワークフロー", "READ", "SNAPSHOT", "EDIT", "DIFF", "WRITE", "GUARD", "コード入力", "スナップショット記録", "安全に書き込み", "権限ガード"]),
    ("05-2-cover-terminal-tool.jpg", "Claude Code terminal tools", "Controlled command execution.", ["Claude Code 端末ツール", "コマンド", "権限", "Sandbox", "実行", "出力", "ライフサイクル", "Shell command", "stdout / stderr", "exit code", "再開可能"]),
    ("05-3-cover-workflow-task.jpg", "Claude Code workflow tools", "From Todo to Task: visible state for long-running work.", ["Claude Code ワークフローツール", "目標", "Todo", "Task", "進捗", "ブロッカー", "完了", "連続する状態フロー"]),
    ("06-cover-mcp-bridge.jpg", "MCP integration", "Model Context Protocol as a bridge into Claude Code Runtime.", ["MCP", "Model Context Protocol", "Claude Code Runtime", "Registry", "Tool", "Resource", "外部 Issue", "チャット", "デザイン", "データベース", "統一プロトコル"]),
    ("07-cover-skill-package.jpg", "Skill package", "Reusable capability package for agents.", ["Skill", "再利用できる能力パッケージ", "Agent", "トリガー", "ワークフロー", "テンプレート", "スクリプト", "Skill Package", "入力", "処理", "出力"]),
    ("08-1-cover-agent-collaboration.jpg", "Agent collaboration", "Isolation, task state, permission bubbling, and result merge.", ["Main Agent", "Task", "Fork", "Merge", "Subagent 調査", "Subagent レビュー", "Subagent 修正", "結果", "権限境界"]),
    ("08-2-cover-agent-orchestration.jpg", "Agent orchestration", "Split work, coordinate, and converge.", ["分解", "役割", "Context", "並列", "レビュー", "収束", "作業分割", "品質ゲートと収束"]),
    ("09-1-cover-plan-mode.jpg", "Plan mode", "Plan first, then execute.", ["Plan モード", "目標", "読み取り専用", "調査", "計画", "承認", "実行", "検証", "権限境界"]),
    ("09-2-cover-plan-control-plane.jpg", "Planning control plane", "How agent systems govern execution.", ["プラン設計", "プラン制御プレーン", "計画", "制御パネル", "承認", "検証", "制御", "観測", "ワークフローツール", "引き継ぎ", "Agent 連鎖", "提案", "プロンプト"]),
    ("01-photo-01-engineering-shell.png", "Engineering shell around the model", "A user request flows through Model API, runtime shell, tool environment, and verified result.", ["ユーザー依頼", "Model API", "ランタイムシェル", "ツール環境", "検証済み結果"]),
    ("02-photo-05.png", "Claude Code functional architecture", "Layered runtime capabilities around the reasoning core.", ["Agent 協調", "Tools システム", "QueryEngine", "基本 Tools", "ReAct Loop", "Token 予算", "メモリ管理", "Context 設計", "Agent Tools", "MCP", "Security", "権限とポリシー", "Sandbox", "プロンプトインジェクション防御", "監査ログ"]),
    ("01-photo-02-capability-layers.png", "Capability layers", "Nested architecture layers around the model.", ["セキュリティ境界", "協調", "Context", "Tools", "主ループ", "モデル"]),
    ("01-photo-03-runtime-flow.png", "Runtime flow", "User input becomes context, model decision, tool execution, and write-back.", ["ユーザー入力", "セッション入口", "Context 構築", "モデル判断", "ツール実行", "書き戻し", "結果を実行 / Context を更新"]),
    ("01-photo-04-code-load-bearing-chain.png", "Load-bearing source chain", "The source-code reading chain behind architecture understanding.", ["入口", "対話", "オーケストレーション", "ループ", "ツール", "Context", "Safety", "状態マシン"]),
    ("02-photo-01-react-loop.png", "Minimal ReAct loop", "The agent cycles through thinking, intent, action, observation, and re-thinking.", ["思考", "意図", "実行", "観測", "再思考"]),
    ("02-photo-02-state-machine.png", "State drives the main loop", "The State object coordinates messages, tools, turn, compact, abort, reason, act, and observe.", ["messages", "メッセージ", "tools", "ツール", "turn", "ターン", "compact", "圧縮", "abort", "中断", "reason", "判断", "act", "実行", "observe", "観測", "State", "query loop"]),
    ("02-photo-03-agent-run.png", "Agent run", "submitMessage starts an agent run.", ["送信", "設定を読む", "Tools を準備", "Context 構築", "query loop", "State を記録", "Agent Run"]),
    ("02-photo-04-observe-compact.png", "Observation write-back and compaction check", "Tool result is written to messages, then context size is checked.", ["次ターン", "Tool Call", "Tool Result", "Tool Shadow", "messages へ書き戻し", "Model Decision"]),
    ("03-photo-01-prompt-runtime-workbench.png", "Prompt runtime workbench", "A workbench assembles rules, context, memory, tools, messages, user input, and model request.", ["システムルール", "ランタイム Context", "プロジェクトメモリ", "Tools", "Messages", "ユーザー入力", "ワークベンチ", "モデルリクエスト"]),
    ("03-photo-02-system-prompt-priority.png", "System prompt priority ladder", "Override, coordinator, agent, custom, default, and append are resolved by priority.", ["優先度高", "優先度低", "override", "Coordinator", "Agent", "custom", "default", "append", "主ルール", "System Prompt", "優先度順に上から選ぶ"]),
    ("03-photo-03-memory-layers.png", "CLAUDE.md memory layers", "Organization rules, user preferences, project rules, and local rules flow into the workbench.", ["組織ルール", "ユーザー設定", "プロジェクトルール", "ローカルルール", "ワークベンチ", "モデルリクエスト"]),
    ("03-photo-04-cache-boundary.png", "Prompt cache boundary", "Stable prefix is cached while the dynamic tail refreshes every turn.", ["Identity", "Rules", "Tool Schema", "Snapshot", "Files", "Git Status", "Skills", "MCP", "Date", "可能な限りキャッシュ", "毎ターン更新", "境界"]),
    ("04-photo-01-context-workbench.png", "Context workbench", "Model workbench assembled from system rules, project rules, tool results, history, summary, and current input.", ["モデルワークベンチ", "システムルール", "プロジェクトルール", "ツール結果", "履歴", "圧縮要約", "現在の入力"]),
    ("04-photo-02-token-failures.png", "Token growth failure modes", "Tool output can overflow, pollute, or stale the context window.", ["ツール出力", "オーバーフロー", "ノイズ", "古い文脈", "Context Window"]),
    ("04-photo-03-compact-defenses.png", "Compaction defenses", "Escalating defenses from budget to snip, micro-compact, collapse, auto-compact, and reactive compact.", ["ツール結果予算", "Snip", "Micro Compact", "Context Collapse", "Auto Compact", "Reactive Compact", "切り詰め", "圧縮", "文脈の回復"]),
    ("04-photo-04-recent-tail.png", "Summary plus recent tail", "Compressed old history is exchanged for raw recent context.", ["要約", "入れ替え", "Recent Tail", "古い履歴（圧縮済み）", "最近の文脈（生のまま保持）"]),
    ("05-photo-01-tool-contract.png", "Tool contract", "A tool contract coordinates name, permission, execution, result, and UI.", ["名前", "Tool Contract", "権限", "実行", "結果", "UI"]),
    ("05-photo-02-structured-intent.png", "Structured intent", "A vague user intent becomes inputSchema, tool_use, and a verifiable request.", ["曖昧な意図", "inputSchema", "tool_use", "検証可能なリクエスト"]),
    ("05-photo-03-permission-gates.png", "Permission gates", "The tool pool passes through visibility, planning, permission, execution, reject record, and allowed result.", ["Tool Pool", "Visible Path", "モデル計画", "権限", "実行", "拒否記録", "許可された結果"]),
    ("05-photo-04-tool-lifecycle.png", "Tool lifecycle", "Schema, input check, permission, hooks, execute, serialize, and write-back.", ["Schema", "入力検証", "権限", "Hooks", "Execute", "Serialize", "Write Back"]),
]


def load_reference_prompt_records() -> dict[str, dict]:
    if not SOURCE_PROMPT_JSON.exists():
        return {}
    records = json.loads(SOURCE_PROMPT_JSON.read_text(encoding="utf-8"))
    return {record["file"]: record for record in records}


def load_env() -> None:
    env_path = REPO / ".env"
    if not env_path.exists():
        return
    for line in env_path.read_text().splitlines():
        if not line.strip() or line.strip().startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        key = key.strip()
        value = value.strip().strip('"').strip("'")
        os.environ.setdefault(key, value)


def normalize_base_url(base_url: str) -> str:
    base_url = base_url.rstrip("/")
    if base_url.endswith("/v1"):
        return base_url
    return f"{base_url}/v1"


def load_codex_provider_config(config_path: Path | None = None) -> dict:
    codex_home = Path(os.environ.get("CODEX_HOME", Path.home() / ".codex"))
    path = config_path or Path(os.environ.get("CODEX_CONFIG", codex_home / "config.toml"))
    if not path.exists():
        return {}

    with path.open("rb") as f:
        config = tomllib.load(f)

    provider_name = config.get("model_provider")
    providers = config.get("model_providers", {})
    if not provider_name or provider_name not in providers:
        return {}
    return providers[provider_name]


def resolve_base_url(config_path: Path | None = None) -> str:
    explicit = os.environ.get("OPENAI_IMAGE_BASE_URL") or os.environ.get("OPENAI_BASE_URL")
    if explicit:
        return normalize_base_url(explicit)

    provider = load_codex_provider_config(config_path)
    if provider.get("base_url"):
        return normalize_base_url(provider["base_url"])

    return DEFAULT_OPENAI_BASE_URL


def load_codex_auth() -> dict:
    codex_home = Path(os.environ.get("CODEX_HOME", Path.home() / ".codex"))
    path = Path(os.environ.get("CODEX_AUTH", codex_home / "auth.json"))
    if not path.exists():
        return {}
    return json.loads(path.read_text(encoding="utf-8"))


def get_api_key() -> str | None:
    if os.environ.get("OPENAI_API_KEY"):
        return os.environ["OPENAI_API_KEY"]
    return load_codex_auth().get("OPENAI_API_KEY")


def load_reference_prompt_text(filename: str, reference_record: dict | None) -> str | None:
    prompt_path = REFERENCE_PROMPT_FILES.get(filename)
    if prompt_path and prompt_path.exists():
        return prompt_path.read_text(encoding="utf-8").strip()
    if reference_record and reference_record.get("prompt"):
        return str(reference_record["prompt"]).strip()
    return FALLBACK_REFERENCE_PROMPTS.get(filename)


def make_prompt(
    title: str,
    subtitle: str,
    labels: list[str],
    output_format: str,
    *,
    reference_prompt: str | None = None,
) -> str:
    label_text = ", ".join(labels)
    source_prompt_block = ""
    if reference_prompt:
        source_prompt_block = f"""
Reference prompt from the existing image-localization workflow. Preserve its semantic intent, composition hints, and visual constraints, but convert all visible text requirements to Japanese:
{reference_prompt.strip()}
"""
    return f"""{BASE_STYLE}
{source_prompt_block}

Image topic: {title}
Meaning: {subtitle}
Required Japanese-visible labels, if labels appear in the image: {label_text}
Output format target: {output_format.upper()}.
Important: preserve the original layout and visual hierarchy from the input image. Use the same number of major panels or nodes where possible. Keep labels legible, hand-drawn, and suitable for a Japanese technical blog."""


def ensure_prompts() -> None:
    TMP_DIR.mkdir(parents=True, exist_ok=True)
    reference_records = load_reference_prompt_records()
    with PROMPT_FILE.open("w", encoding="utf-8") as f:
        for filename, title, subtitle, labels in ITEMS:
            src = SOURCE_DIR / filename
            if not src.exists():
                raise FileNotFoundError(src)
            ext = Path(filename).suffix.lower()
            output_format = "jpeg" if ext in {".jpg", ".jpeg"} else "png"
            with Image.open(src) as im:
                width, height = im.size
            reference_record = reference_records.get(filename)
            reference_prompt = load_reference_prompt_text(filename, reference_record)
            row = {
                "file": filename,
                "source": str(src),
                "target": str(TARGET_DIR / filename),
                "prompt_origin": "existing_workflow_prompt" if reference_prompt else "generated_from_original_image_and_context",
                "source_prompt_file": str(REFERENCE_PROMPT_FILES[filename]) if filename in REFERENCE_PROMPT_FILES else None,
                "width": width,
                "height": height,
                "output_format": output_format,
                "title": title,
                "subtitle": subtitle,
                "labels": labels,
                "reference_prompt": reference_prompt,
                "prompt": make_prompt(title, subtitle, labels, output_format, reference_prompt=reference_prompt),
            }
            f.write(json.dumps(row, ensure_ascii=False) + "\n")


def read_entries() -> list[dict]:
    ensure_prompts()
    return [json.loads(line) for line in PROMPT_FILE.read_text(encoding="utf-8").splitlines() if line.strip()]


def optimize(path: Path, fmt: str) -> None:
    magick = shutil.which("magick")
    zopflipng = shutil.which("zopflipng") or ("/opt/anaconda3/bin/zopflipng" if Path("/opt/anaconda3/bin/zopflipng").exists() else None)
    if fmt == "png":
        if magick:
            tmp = path.with_suffix(path.suffix + ".strip.png")
            subprocess.run([magick, str(path), "-strip", "-define", "png:compression-level=9", str(tmp)], check=True)
            tmp.replace(path)
        if zopflipng:
            tmp = path.with_suffix(path.suffix + ".zop.png")
            subprocess.run([zopflipng, "-y", str(path), str(tmp)], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            if tmp.stat().st_size < path.stat().st_size:
                tmp.replace(path)
            else:
                tmp.unlink(missing_ok=True)
    else:
        if magick:
            tmp = path.with_suffix(path.suffix + ".opt.jpg")
            subprocess.run([magick, str(path), "-strip", "-interlace", "Plane", "-quality", "90", str(tmp)], check=True)
            tmp.replace(path)


def resize_to_target(path: Path, width: int, height: int, fmt: str) -> None:
    with Image.open(path) as im:
        im = im.convert("RGB") if fmt == "jpeg" else im.convert("RGBA")
        im.thumbnail((width, height), Image.Resampling.LANCZOS)
        if fmt == "jpeg":
            canvas = Image.new("RGB", (width, height), (248, 242, 229))
            canvas.paste(im, ((width - im.width) // 2, (height - im.height) // 2))
            canvas.save(path, "JPEG", quality=92, optimize=True)
        else:
            canvas = Image.new("RGBA", (width, height), (248, 242, 229, 255))
            canvas.paste(im, ((width - im.width) // 2, (height - im.height) // 2), im if im.mode == "RGBA" else None)
            canvas.save(path, "PNG", optimize=True)


def generate(
    entries: list[dict],
    *,
    model: str,
    quality: str,
    delay: float,
    dry_run: bool,
    base_url: str,
    max_retries: int,
    retry_wait: float,
) -> None:
    if dry_run:
        print(f"image generation base_url: {base_url}")
        print(f"prompt file: {PROMPT_FILE}")
        for entry in entries:
            print(entry["file"])
        return

    api_key = get_api_key()
    if not api_key:
        raise SystemExit(
            "OPENAI_API_KEY is missing. Set it in your shell, .env, or ~/.codex/auth.json, then rerun. "
            "Do not paste the key into chat."
        )

    TARGET_DIR.mkdir(parents=True, exist_ok=True)
    client = OpenAI(api_key=api_key, base_url=base_url)
    for i, entry in enumerate(entries, 1):
        source = Path(entry["source"])
        target = Path(entry["target"])
        fmt = entry["output_format"]
        print(f"[{i}/{len(entries)}] generating {entry['file']}")
        result = None
        for attempt in range(1, max_retries + 2):
            try:
                with source.open("rb") as image_file:
                    result = client.images.edit(
                        model=model,
                        image=image_file,
                        prompt=entry["prompt"],
                        size="auto",
                        response_format="b64_json",
                        extra_body={
                            "quality": quality,
                            "input_fidelity": "high",
                            "output_format": fmt,
                        },
                    )
                break
            except APIError as exc:
                if attempt > max_retries:
                    raise
                status_code = getattr(exc, "status_code", None)
                if status_code and status_code < 500 and status_code != 429:
                    raise
                wait_seconds = retry_wait * attempt
                print(
                    f"    retry {attempt}/{max_retries} after API error"
                    f" status={status_code or 'unknown'}: waiting {wait_seconds:.0f}s",
                    flush=True,
                )
                time.sleep(wait_seconds)
        if result is None:
            raise RuntimeError(f"No response returned for {entry['file']}")
        b64 = result.data[0].b64_json
        if not b64:
            raise RuntimeError(f"No image returned for {entry['file']}")
        target.write_bytes(base64.b64decode(b64))
        resize_to_target(target, entry["width"], entry["height"], fmt)
        optimize(target, fmt)
        print(f"    wrote {target} ({target.stat().st_size / 1024:.0f} KB)")
        if delay and i < len(entries):
            time.sleep(delay)


def main() -> None:
    parser = argparse.ArgumentParser(description="Regenerate Claude Code Japanese images from original-image prompts.")
    parser.add_argument("--dry-run", action="store_true", help="Only write prompt JSONL and print selected files.")
    parser.add_argument("--only", action="append", default=[], help="Generate only files whose name contains this substring. Repeatable.")
    parser.add_argument("--limit", type=int, default=0, help="Generate only the first N selected entries.")
    parser.add_argument("--model", default="gpt-image-2")
    parser.add_argument("--quality", default="high", choices=["low", "medium", "high", "auto"])
    parser.add_argument("--delay", type=float, default=2.0)
    parser.add_argument("--max-retries", type=int, default=3, help="Retry count for retryable 5xx/429 image API failures.")
    parser.add_argument("--retry-wait", type=float, default=120.0, help="Base wait seconds before retry; multiplied by attempt number.")
    parser.add_argument(
        "--base-url",
        default=None,
        help="Override image API base URL. Defaults to OPENAI_IMAGE_BASE_URL, OPENAI_BASE_URL, or the selected provider in ~/.codex/config.toml.",
    )
    parser.add_argument(
        "--codex-config",
        type=Path,
        default=None,
        help="Path to a Codex config.toml to read model_provider/model_providers from.",
    )
    args = parser.parse_args()

    load_env()
    base_url = normalize_base_url(args.base_url) if args.base_url else resolve_base_url(args.codex_config)
    entries = read_entries()
    if args.only:
        needles = [needle.lower() for needle in args.only]
        entries = [entry for entry in entries if any(needle in entry["file"].lower() for needle in needles)]
    if args.limit:
        entries = entries[: args.limit]
    generate(
        entries,
        model=args.model,
        quality=args.quality,
        delay=args.delay,
        dry_run=args.dry_run,
        base_url=base_url,
        max_retries=args.max_retries,
        retry_wait=args.retry_wait,
    )


if __name__ == "__main__":
    main()
