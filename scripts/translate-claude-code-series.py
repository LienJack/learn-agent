#!/usr/bin/env python3
from __future__ import annotations

import subprocess
import sys
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[1]
TRANSLATE_BIN = REPO_ROOT / "translate/bin/translate-en"


def main() -> None:
	args = sys.argv[1:] or ["--pipeline", "claude-code-series"]
	if "--yes" not in args and "--dry-run" not in args and "--check" not in args:
		args = ["--dry-run", *args]
	print(
		"This compatibility script now delegates to translate/bin/translate-en, "
		"which uses GPT Codex for confirmed real translation.",
		file=sys.stderr,
	)
	raise SystemExit(subprocess.run([str(TRANSLATE_BIN), *args], cwd=REPO_ROOT).returncode)


if __name__ == "__main__":
	main()
