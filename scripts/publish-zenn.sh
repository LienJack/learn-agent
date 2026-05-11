#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

load_env() {
	if [[ -f "${REPO_ROOT}/.env" ]]; then
		set -a
		# shellcheck disable=SC1091
		source "${REPO_ROOT}/.env"
		set +a
	fi
}

cd "${REPO_ROOT}"
load_env

exec node "${SCRIPT_DIR}/publish-zenn.mjs" "$@"
