#!/bin/sh
# Read-only environment probe. Runs without Node.js, npm, or Git installed.
webapp=false
case "${1-}" in
  '') ;;
  --webapp) webapp=true; shift ;;
  --help) printf '%s\n' 'sh doctor.sh [--webapp] — check Node/npm; webapp also requires Git and Node >=20.9'; exit 0 ;;
  *) printf '%s\n' 'ERROR: unknown argument' >&2; exit 2 ;;
esac
if [ "$#" -ne 0 ]; then printf '%s\n' 'ERROR: unexpected arguments' >&2; exit 2; fi

ready=true
mode=general
if [ "$webapp" = true ]; then mode=webapp; fi
printf '%s\n' "mode=$mode"
if command -v node >/dev/null 2>&1; then
  node_version=$(node --version 2>/dev/null)
  node_result=$?
  node_ok=false
  if [ "$node_result" -eq 0 ]; then
    version=${node_version#v}
    case "$version" in
      *[!0-9.]*|'') ;;
      *)
        major=${version%%.*}
        rest=${version#*.}
        minor=${rest%%.*}
        patch=${rest#*.}
        if [ "$version" != "$rest" ] && [ "$rest" != "$patch" ] && [ -n "$major" ] && [ -n "$minor" ] && [ -n "$patch" ]; then
          case "$patch" in
            *[!0-9]*) ;;
            *)
              if [ "$major" -gt 20 ] 2>/dev/null || { [ "$major" -eq 20 ] 2>/dev/null && { [ "$webapp" = false ] || [ "$minor" -ge 9 ] 2>/dev/null; }; }; then
                node_ok=true
              fi
              ;;
          esac
        fi
        ;;
    esac
  fi
  if [ "$node_ok" = true ]; then
    printf '%s\n' "node=ready ($node_version)"
  else
    printf '%s\n' 'node=needs-attention (failed version check or below minimum)'
    ready=false
  fi
else
  printf '%s\n' 'node=missing (check installation and PATH)'
  ready=false
fi

if command -v npm >/dev/null 2>&1 && npm --version >/dev/null 2>&1; then
  printf '%s\n' 'npm=ready'
else
  printf '%s\n' 'npm=missing-or-failed (provided by Node installation)'
  ready=false
fi
if command -v git >/dev/null 2>&1 && git --version >/dev/null 2>&1; then
  printf '%s\n' 'git=ready'
else
  printf '%s\n' 'git=missing-or-failed (required for shared webapps; optional for local general tools)'
  if [ "$webapp" = true ]; then ready=false; fi
fi

if [ "$ready" = true ]; then
  printf '%s\n' 'READY: current-shell tools only; check app-specific requirements separately.'
  exit 0
fi
printf '%s\n' 'ACTION NEEDED: read references/setup.md; do not mark installation complete yet.'
exit 1
