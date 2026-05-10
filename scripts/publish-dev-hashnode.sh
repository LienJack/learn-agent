#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
CRIER_VERSION="${CRIER_VERSION:-2.0.2}"

load_env() {
	if [[ -f "${REPO_ROOT}/.env" ]]; then
		set -a
		# shellcheck disable=SC1091
		source "${REPO_ROOT}/.env"
		set +a
	fi
}

usage() {
	cat <<'USAGE'
Usage:
  scripts/publish-dev-hashnode.sh <article.md> [article-2.md ...]
  scripts/publish-dev-hashnode.sh setup
  scripts/publish-dev-hashnode.sh doctor
  scripts/publish-dev-hashnode.sh check <article.md> [article-2.md ...]
  scripts/publish-dev-hashnode.sh status [article.md]
  scripts/publish-dev-hashnode.sh audit [path]
  scripts/publish-dev-hashnode.sh draft <article.md> [article-2.md ...]
  scripts/publish-dev-hashnode.sh publish <article.md> [article-2.md ...]
  scripts/publish-dev-hashnode.sh medium-manual <article.md> [article-2.md ...]
  scripts/publish-dev-hashnode.sh medium-token <article.md> [article-2.md ...]

Environment:
  CRIER_DEVTO_API_KEY        DEV API key
  CRIER_HASHNODE_API_KEY     Hashnode token, or token:publication_id
  CRIER_MEDIUM_API_KEY       Existing Medium integration token, if you have one
  CRIER_VERSION              Optional crier version, default 2.0.2
  DEVTO_IMAGE_UPLOAD_COOKIE  Optional DEV browser cookie for uploading local images
  PUBLISH_IMAGE_UPLOAD_COMMAND
                             Optional command that prints a public URL for $PUBLISH_IMAGE_FILE
  PUBLISH_IMAGE_BASE_URL     Optional public base URL for already-hosted local assets

Notes:
  - draft publishes with frontmatter `published: false` semantics when supported by the platform.
  - publish performs a real public publish.
  - publish/draft rewrite local Markdown image paths to public URLs in a temporary copy.
  - crier keeps its registry at ~/.config/crier/crier.db.
USAGE
}

run_crier() {
	uvx --from "crier==${CRIER_VERSION}" crier "$@"
}

prepare_publish_file() {
	local file="$1"
	local prepared_file="$2"

	PUBLISH_IMAGE_MODE="${PUBLISH_IMAGE_MODE:-}" node "${SCRIPT_DIR}/prepare-crosspost-assets.mjs" "${file}" "${prepared_file}"
}

check_local_images() {
	local file="$1"

	node "${SCRIPT_DIR}/prepare-crosspost-assets.mjs" --check-only "${file}"
}

publish_prepared_file() {
	local file="$1"
	shift

	local original
	original="$(mktemp)"
	cp "${file}" "${original}"
	local prepared
	prepared="$(mktemp)"
	prepare_publish_file "${file}" "${prepared}"
	cp "${prepared}" "${file}"

	local status=0
	"$@" || status=$?
	cp "${original}" "${file}"
	rm -f "${original}" "${prepared}"
	return "${status}"
}

require_files() {
	if [[ "$#" -eq 0 ]]; then
		echo "Missing markdown file path." >&2
		usage >&2
		exit 1
	fi
	for file in "$@"; do
		if [[ ! -f "${file}" ]]; then
			echo "File not found: ${file}" >&2
			exit 1
		fi
	done
}

for_each_file() {
	local action="$1"
	shift
	require_files "$@"

	for file in "$@"; do
		echo "==> ${action}: ${file}"
		case "${action}" in
			check)
				check_local_images "${file}"
				run_crier check "${file}" --to devto --to hashnode
				;;
			draft)
				publish_prepared_file "${file}" run_crier publish "${file}" --to devto --to hashnode --draft --no-check
				;;
			publish)
				publish_prepared_file "${file}" run_crier publish "${file}" --to devto --to hashnode --no-check --yes
				;;
			medium-manual)
				run_crier publish "${file}" --to medium --manual
				;;
			medium-token)
				run_crier publish "${file}" --to medium --draft --no-check
				;;
			*)
				echo "Unsupported file action: ${action}" >&2
				exit 1
				;;
		esac
	done
}

ensure_config() {
	mkdir -p "${HOME}/.config/crier"
	if [[ -f "${HOME}/.config/crier/config.yaml" ]]; then
		echo "Crier config already exists: ${HOME}/.config/crier/config.yaml"
		return
	fi

	cat > "${HOME}/.config/crier/config.yaml" <<EOF
site_root: ${REPO_ROOT}
site_base_url: https://blog.lienjack.com
content_paths:
  - src/content/blog
file_extensions:
  - .md
  - .mdx
exclude_patterns:
  - "**/assets/**"
  - "**/_meta.json"
default_profile: dev-hashnode
platforms:
  devto:
    api_key: "\${CRIER_DEVTO_API_KEY}"
  hashnode:
    api_key: "\${CRIER_HASHNODE_API_KEY}"
  medium:
    api_key: "\${CRIER_MEDIUM_API_KEY}"
profiles:
  dev-hashnode:
    - devto
    - hashnode
EOF
	echo "Created ${HOME}/.config/crier/config.yaml"
}

command="${1:-help}"
shift || true

cd "${REPO_ROOT}"
load_env

case "${command}" in
	setup)
		ensure_config
		run_crier doctor
		;;
	doctor)
		run_crier doctor
		;;
	check)
		for_each_file check "$@"
		;;
	status)
		run_crier status "$@"
		;;
	audit)
		run_crier audit "${1:-src/content/blog}" --long-form
		;;
	draft)
		for_each_file draft "$@"
		;;
	publish)
		for_each_file publish "$@"
		;;
	medium-manual)
		for_each_file medium-manual "$@"
		;;
	medium-token)
		for_each_file medium-token "$@"
		;;
	help|-h|--help)
		usage
		;;
	*)
		for_each_file publish "${command}" "$@"
		;;
esac
