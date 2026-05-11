#!/usr/bin/env python3
from __future__ import annotations

# Deprecated compatibility script.
# Current ordinary image localization entrypoints live under:
# - translate/skills/translate-assets/SKILL.md
# - translate/bin/translate-assets
# - translate/workflows/image-localization.md
# New original-article photo generation entrypoints live under:
# - images/skills/article-photos/SKILL.md
# - images/bin/article-images --stage photos

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
    from PIL import Image
except ModuleNotFoundError:
    venv_python = Path(__file__).resolve().parents[1] / "tmp/imagegen-venv/bin/python"
    if venv_python.exists() and Path(sys.executable).resolve() != venv_python.resolve():
        os.execv(str(venv_python), [str(venv_python), *sys.argv])
    raise

REPO = Path(__file__).resolve().parents[1]
SOURCE_DIR = REPO / "src/content/blog/zh/AI/3.ClaudeCode源码解析/assets"
TARGET_DIR = REPO / "src/content/blog/en/AI/Claude code/assets"
PROMPT_FILE = REPO / "tmp/claude-code-image-regeneration-prompts.jsonl"
TMP_DIR = REPO / "tmp/claude-code-image-regeneration"
DEFAULT_OPENAI_BASE_URL = "https://api.openai.com/v1"

EXISTING_PROMPTS = {
    "02-photo-05.png": REPO / "tmp/imagegen/claude-code-functional-architecture-photo.prompt",
}

EXISTING_PROMPT_TRANSLATIONS = {
    "02-photo-05.png": """Create an in-article technical explanation image about Claude Code's functional architecture: the model capability is wrapped by the QueryEngine main loop, the Tools system, Context/State management, Agent collaboration, and security governance, ultimately becoming an Agent Runtime that can execute tasks in a real engineering environment.

Style: off-white paper background with subtle paper texture, black hand-drawn pen linework with slightly uneven stroke width, a few pale yellow highlights, editorial technical illustration, technical-blog hand-drawn architecture diagram, clean, restrained, and engineering-sketch-like.

Composition: concentric layered architecture diagram. Put a circular core node in the center, draw four hand-drawn module rings around it, and draw a wide security-governance base across the bottom. Include seven key nodes with short arrows and light connector lines to show layered wrapping.

Nodes:
1. Model API: center circle with a brain-chip or small cloud-interface icon, representing the reasoning core.
2. QueryEngine: inner ring with heartbeat line and loop-arrow icon, representing the main loop.
3. Tools system: middle ring with wrench, folder, and terminal icons, representing file tools, shell, search, MCP, LSP, and Skills.
4. Context/State: side state card and memory-drawer icon connected to QueryEngine, representing context, memory, compaction, and AppState.
5. Agent collaboration: outer ring with small nodes and branching arrows, representing subagents, Task, and parallel collaboration.
6. Extension access: right-side slot and plug icon connected to the Tools system, representing MCP, LSP, and Skills access.
7. Security governance: wide bottom base with shield and audit-checklist icon, representing permissions, policy, sandboxing, prompt-injection defense, and audit logs.

Highlight QueryEngine and the bottom Security base in pale yellow.

Background: very faint circuit lines, node connectors, and engineering sketch guide lines that do not overpower the main diagram.

Text: use only short English node labels: Model API, QueryEngine, Tools, Context, Agent, MCP/LSP, Security. Do not generate any Chinese text. The overall feel should be a clear technical-blog hand-drawn mechanism diagram, not product UI and not a formal architecture chart.""",
}

BASE_STYLE = """Use the input image as the exact visual reference. Regenerate the same image as an English-language version.
Preserve the original composition, camera/framing, paper texture, off-white background, black hand-drawn ink linework, pale yellow highlight blocks, icon positions, arrows, spacing, technical-blog sketch style, and overall visual density.
Translate or replace every visible Chinese character with concise natural English. Keep existing English technical terms when already correct.
Use short labels only; avoid paragraphs. Do not leave any Chinese, Japanese, or Korean characters. Do not add watermarks, logos, or unrelated decoration.
The result should look like the original image was designed in English from the start, not like text was pasted over it."""

ITEMS = [
    ("00-cover-claude-code-runtime.jpg", "Claude Code Source Analysis", "From Model API to Agent Runtime", ["Model API", "QueryEngine", "ReAct", "Context", "Tools", "MCP / Skill", "Plan Mode", "Multi-Agent Collaboration"]),
    ("01-cover-engineering-architecture.jpg", "Claude Code Engineering Architecture", "Not a chatbot: an engineered runtime around model capability", ["Model API", "QueryEngine", "Tools", "Context / State", "Safety", "Agents", "Input / Request", "Permission / Security", "Extensibility", "Observable Results"]),
    ("02-cover-react-loop.jpg", "Claude Code ReAct Loop", "Observe -> Think -> Act -> Write Back", ["Observe", "Think", "Intent", "Tool", "Result", "State", "Continue", "Model Call", "Context"]),
    ("03-cover-prompt-runtime.jpg", "Prompt Runtime", "How Claude Code assembles one model request", ["Rules", "Memory", "Tools", "History", "Summary", "Prompt", "Model", "Model Call"]),
    ("04-1-cover-context-management.jpg", "Claude Code Context Management", "Token budget, files, tool results, compaction, and recent tail", ["History", "Files", "Tool Result", "Compact", "Recent", "Next Turn", "Working Set"]),
    ("04-2-cover-context-governance.jpg", "Context Governance", "Filter what enters context; decide what wins", ["Enter", "Policy", "Model", "External", "Compress", "Memory", "Relevance", "Authority", "Sensitivity", "Token Budget", "Task Goal"]),
    ("05-0-cover-tools-pipeline.jpg", "Claude Code Tools Pipeline", "Intent becomes a governed tool call", ["Intent", "Schema", "Permission", "Hooks", "Execute", "Result", "tool_result", "Model"]),
    ("05-1-cover-file-tools.jpg", "Claude Code File Workflow", "Read, snapshot, edit, diff, write, guard", ["READ", "SNAPSHOT", "EDIT", "DIFF", "WRITE", "GUARD", "Code Input", "Records Snapshot", "Safe Write", "Permission Guard"]),
    ("05-2-cover-terminal-tool.jpg", "Claude Code Terminal Tools", "Controlled command execution", ["Command", "Permission", "Sandbox", "Run", "Output", "Lifecycle", "Shell", "cwd", "env", "stdout", "stderr", "exit code"]),
    ("05-3-cover-workflow-task.jpg", "Claude Code Workflow Tools", "From Todo to Task: visible state for long-running work", ["Goal", "Todo", "Task", "Progress", "Blocker", "Done", "continuous state flow"]),
    ("06-cover-mcp-bridge.jpg", "MCP Integration", "Model Context Protocol as a bridge into Claude Code Runtime", ["External", "Issue", "Chat", "Design", "Database", "MCP", "Claude Code Runtime", "Registry", "Tool", "Resource", "Prompt", "Unified Protocol"]),
    ("07-cover-skill-package.jpg", "Skill Package", "Reusable capability package for agents", ["Trigger", "Workflow", "Template", "Script", "Skill Package", "Agent", "Input", "Processing", "Output"]),
    ("08-1-cover-agent-collaboration.jpg", "Agent Collaboration", "Isolation, task state, permission bubbling, and result merge", ["Main Agent", "Task", "Fork", "Subagent", "Result", "Merge", "Permission Boundary"]),
    ("08-2-cover-agent-orchestration.jpg", "Agent Orchestration", "Split work, coordinate, converge", ["Decompose", "Roles", "Context", "Parallel", "Review", "Converge", "Quality gates and convergence"]),
    ("09-1-cover-plan-mode.jpg", "Plan Mode", "Plan First, Then Execute", ["Goal", "Read-only", "Research", "Plan", "Approve", "Execute", "Validate", "Permission Boundary", "Planning is read-only"]),
    ("09-2-cover-plan-control-plane.jpg", "Planning Control Plane", "How agent systems govern execution", ["Plan Design", "Planning", "Control Panel", "Approval", "Validate", "Control", "Observation", "Workflow Tools", "Handoff", "Agent Chain", "Suggestion", "Prompt", "Next action"]),
    ("01-photo-01-engineering-shell.png", "Engineering Shell Around the Model", "A user request flows through Model API, runtime shell, tool environment, and verified result", ["User Request", "Model API", "Runtime Shell", "Tool Environment", "Verified Result"]),
    ("02-photo-05.png", "Claude Code Functional Architecture", "Layered runtime capabilities around Model API", ["Agent Collaboration", "Tools System", "QueryEngine", "Model API", "Base Tools", "ReAct Loop", "Token Budget", "Memory Mgmt", "Context Engineering", "Agent Tools", "MCP", "Security", "Permissions & Policy", "Sandbox", "Prompt-Injection Defense", "Audit Logs"]),
    ("01-photo-02-capability-layers.png", "Capability Layers", "Nested architecture layers around the model", ["Security Boundary", "Collaboration", "Context", "Tools", "Main Loop", "Model"]),
    ("01-photo-03-runtime-flow.png", "Runtime Flow", "User input becomes context, model decision, tool execution, and write-back", ["User Input", "Session Entry", "Build Context", "Model Decision", "Tool Run", "Write Back", "execute result / update context"]),
    ("01-photo-04-code-load-bearing-chain.png", "Load-Bearing Source Chain", "The source-code reading chain behind architecture understanding", ["Entry", "Interaction", "Orchestration", "Loop", "Tools", "Context / Prompt", "Safety / Permission", "Status Machine"]),
    ("02-photo-01-react-loop.png", "Minimal ReAct Loop", "The agent cycles through thinking, intent, action, observation, and re-thinking", ["Agent", "Think", "Intent", "Act", "Observe", "Re-think"]),
    ("02-photo-02-state-machine.png", "State Drives the Main Loop", "The State object coordinates messages, tools, turn, compaction, abort, reason, act, and observe", ["messages", "tools", "turn", "compact", "abort", "query loop", "reason", "act", "observe", "State"]),
    ("02-photo-03-agent-run.png", "Agent Run", "submitMessage starts an agent run", ["Submit", "Read Config", "Prepare Tools", "Build Context", "query loop", "Record State", "Agent Run"]),
    ("02-photo-04-observe-compact.png", "Observation Write-Back and Compaction Check", "Tool result is written to messages, then context size is checked", ["Model Decision", "Tool Call", "Tool Result", "Tool Shadow", "Write messages", "Next Turn"]),
    ("03-photo-01-prompt-runtime-workbench.png", "Prompt Runtime Workbench", "A workbench assembles rules, context, memory, tools, messages, user input, and model request", ["System Rules", "Runtime Context", "Project Memory", "Tools", "Messages", "User Input", "Workbench", "Model Request"]),
    ("03-photo-03-memory-layers.png", "CLAUDE.md Memory Layers", "Organization rules, user prefs, project rules, and local rules flow into the workbench", ["Org Rules", "User Prefs", "Project Rules", "Local Rules", "Workbench", "Model Request"]),
    ("03-photo-04-cache-boundary.png", "Prompt Cache Boundary", "Stable prefix is cached; dynamic tail refreshes every turn", ["Identity", "Rules", "Tool Schema", "Snapshot", "Files", "Git Status", "Skills", "MCP", "Date", "Cache as much as possible", "Refresh every turn", "Boundary"]),
    ("04-photo-01-context-workbench.png", "Context Workbench", "Model workbench assembled from system rules, project rules, tool results, history, summary, and current input", ["System Rules", "Project Rules", "Tool Results", "History", "Compact Summary", "Current Input", "Model Workbench"]),
    ("04-photo-02-token-failures.png", "Token Growth Failure Modes", "Tool output can overflow, pollute, or stale the context window", ["Tool Output", "Overflow", "Noise", "Stale Context", "Context Window"]),
    ("04-photo-03-compact-defenses.png", "Compaction Defenses", "Escalating defenses from budget to snip, micro-compact, collapse, auto-compact, and reactive compact", ["Tool Result Budget", "Snip", "MicroCompact", "Context Collapse", "AutoCompact", "Reactive Compact", "Trim", "Compress", "Context Healing"]),
    ("04-photo-04-recent-tail.png", "Summary Plus Recent Tail", "Compressed old history is exchanged for raw recent context", ["Summary", "Exchange", "Recent Tail", "raw samples", "Old history compressed", "Recent context kept verbatim"]),
    ("05-photo-01-tool-contract.png", "Tool Contract", "A tool contract coordinates name, schema, permission, execution, result, and UI", ["Name", "Schema", "Permission", "Tool Contract", "Execute", "Result", "UI"]),
    ("05-photo-02-structured-intent.png", "Structured Intent", "A vague user intent becomes inputSchema, tool_use, and a verifiable request", ["Vague Intent", "inputSchema", "tool_use", "Verifiable Request"]),
    ("05-photo-03-permission-gates.png", "Permission Gates", "Tool pool passes through visible path, model planning, permission, real execution, reject record, and allowed result", ["Tool Pool", "Visible Path", "Model Planning", "Permission", "Real Execution", "Reject Record", "Allowed Result"]),
    ("05-photo-04-tool-lifecycle.png", "Tool Lifecycle", "Schema, input check, permission, hooks, execute, serialize, write back", ["Schema", "Input Check", "Permission", "Hooks", "Execute", "Serialize", "Write Back"]),
]


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


def make_prompt(
    title: str,
    subtitle: str,
    labels: list[str],
    output_format: str,
    *,
    existing_prompt: str | None = None,
) -> str:
    label_text = ", ".join(labels)
    source_prompt_block = ""
    if existing_prompt:
        source_prompt_block = f"""
Original Chinese prompt found in tmp. Use it as the semantic and composition brief, but translate all visible text into English:
{existing_prompt.strip()}
"""
    return f"""{BASE_STYLE}
{source_prompt_block}

Image topic: {title}
Meaning: {subtitle}
Required English text labels, if labels appear in the image: {label_text}
Output format target: {output_format.upper()}.
Important: preserve the original layout and visual hierarchy from the input image. Use the same number of major panels/nodes where possible. Keep labels legible, hand-drawn, and in English only."""


def ensure_prompts() -> None:
    TMP_DIR.mkdir(parents=True, exist_ok=True)
    with PROMPT_FILE.open("w", encoding="utf-8") as f:
        for filename, title, subtitle, labels in ITEMS:
            src = SOURCE_DIR / filename
            if not src.exists():
                raise FileNotFoundError(src)
            ext = Path(filename).suffix.lower()
            output_format = "jpeg" if ext in {".jpg", ".jpeg"} else "png"
            with Image.open(src) as im:
                width, height = im.size
            prompt_path = EXISTING_PROMPTS.get(filename)
            existing_prompt = None
            if prompt_path and prompt_path.exists():
                existing_prompt = EXISTING_PROMPT_TRANSLATIONS.get(filename) or prompt_path.read_text(encoding="utf-8")
            row = {
                "file": filename,
                "source": str(src),
                "target": str(TARGET_DIR / filename),
                "prompt_origin": "tmp_existing_prompt_translated" if existing_prompt else "generated_from_original_image_and_context",
                "source_prompt": str(prompt_path) if existing_prompt and prompt_path else None,
                "width": width,
                "height": height,
                "output_format": output_format,
                "title": title,
                "subtitle": subtitle,
                "labels": labels,
                "prompt": make_prompt(title, subtitle, labels, output_format, existing_prompt=existing_prompt),
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
) -> None:
    print(f"image generation base_url: {base_url}")
    if dry_run:
        print(f"Prompt file written: {PROMPT_FILE}")
        for entry in entries:
            print(f"DRY {entry['file']} <- {entry['source']}")
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
    parser = argparse.ArgumentParser(description="Regenerate Claude Code English images from original-image prompts.")
    parser.add_argument("--dry-run", action="store_true", help="Only write prompt JSONL and print selected files.")
    parser.add_argument("--only", action="append", default=[], help="Generate only files whose name contains this substring. Repeatable.")
    parser.add_argument("--limit", type=int, default=0, help="Generate only the first N selected entries.")
    parser.add_argument("--model", default="gpt-image-2")
    parser.add_argument("--quality", default="high", choices=["low", "medium", "high", "auto"])
    parser.add_argument("--delay", type=float, default=2.0)
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
    )


if __name__ == "__main__":
    main()
