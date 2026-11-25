#!/usr/bin/env bash
set -euo pipefail

STOREFRONT_HOST_EXPRESSION=$(node scripts/hosted-gateway.mjs storefront-expression)
export STOREFRONT_HOST_EXPRESSION
env -u TUNNEL_TOKEN caddy validate --config scripts/Caddyfile.hosted --adapter caddyfile

# Docker's wrapper-script supervision pattern. Treat either child exiting as a failure.
children=()
shutdown() {
    trap ':' TERM INT
    kill -TERM "${children[@]}" 2>/dev/null || true
    (
        sleep 35 &
        countdown=$!
        trap 'kill "$countdown" 2>/dev/null || true; exit 0' TERM
        wait "$countdown"
        kill -KILL "${children[@]}" 2>/dev/null || true
    ) &
    local deadline=$!
    trap '' TERM INT
    for child in "${children[@]}"; do
        wait "$child" 2>/dev/null || true
    done
    kill "$deadline" 2>/dev/null || true
    wait "$deadline" 2>/dev/null || true
    exit "$1"
}
trap 'shutdown 0' TERM INT

env -u TUNNEL_TOKEN caddy run --config scripts/Caddyfile.hosted --adapter caddyfile &
children+=("$!")
(
    unset MARKET_ADMIN_INGRESS_KEY MARKET_STOREFRONT_INGRESS_KEY MARKET_API_INGRESS_KEY
    exec cloudflared tunnel --no-autoupdate --metrics 127.0.0.1:20241 --grace-period 30s run
) &
children+=("$!")

wait -n "${children[@]}" || true
echo 'Gateway process exited unexpectedly' >&2
shutdown 1
