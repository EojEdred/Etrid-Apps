#!/bin/bash

# Check all Primearc validators via Tailscale
# Usage: ./check-validators.sh

VALIDATORS=(
  "100.93.43.18:vmi2896906"
  "100.71.127.127:vmi2896907"
  "100.68.185.50:vmi2896908"
  "100.70.73.10:vmi2896909"
  "100.88.104.58:vmi2896910"
  "100.117.43.53:vmi2896911"
  "100.109.252.56:vmi2896914"
  "100.80.84.82:vmi2896915"
  "100.125.147.88:vmi2896916"
  "100.86.111.37:vmi2896917"
  "100.95.0.72:vmi2896918"
  "100.113.226.111:vmi2896921"
  "100.114.244.62:vmi2896922"
  "100.125.251.60:vmi2896923"
  "100.74.204.23:vmi2896924"
  "100.124.117.73:vmi2896925"
  "100.89.102.75:vmi2897381"
  "100.74.84.28:vmi2897382"
  "100.71.242.104:vmi2897383"
  "100.102.128.51:vmi2897384"
)

echo "═══════════════════════════════════════════════════════════"
echo "       PRIMEARC VALIDATORS - QUICK HEALTH CHECK"
echo "═══════════════════════════════════════════════════════════"
echo ""

ONLINE=0
OFFLINE=0
SYNCING=0
SYNCED=0

for val in "${VALIDATORS[@]}"; do
  IP="${val%%:*}"
  NAME="${val##*:}"

  printf "%-15s %-15s " "$NAME" "$IP"

  # Quick health check with 2s timeout
  HEALTH=$(curl -s -m 2 -H "Content-Type: application/json" \
    -d '{"id":1, "jsonrpc":"2.0", "method": "system_health"}' \
    http://$IP:9944 2>/dev/null)

  if [ -n "$HEALTH" ]; then
    PEERS=$(echo "$HEALTH" | python3 -c "import sys, json; d=json.load(sys.stdin); print(d['result']['peers'])" 2>/dev/null || echo "?")
    IS_SYNCING=$(echo "$HEALTH" | python3 -c "import sys, json; d=json.load(sys.stdin); print(d['result']['isSyncing'])" 2>/dev/null || echo "?")

    printf "🟢 ONLINE   Peers: %-2s  " "$PEERS"

    if [ "$IS_SYNCING" = "True" ] || [ "$IS_SYNCING" = "true" ]; then
      echo "Status: 🟡 SYNCING"
      ((SYNCING++))
    elif [ "$IS_SYNCING" = "False" ] || [ "$IS_SYNCING" = "false" ]; then
      echo "Status: 🟢 SYNCED"
      ((SYNCED++))
    else
      echo "Status: ❓ UNKNOWN"
    fi
    ((ONLINE++))
  else
    echo "🔴 OFFLINE"
    ((OFFLINE++))
  fi
done

echo ""
echo "═══════════════════════════════════════════════════════════"
echo "📊 Summary:"
echo "   Online:  $ONLINE / ${#VALIDATORS[@]}"
echo "   Offline: $OFFLINE / ${#VALIDATORS[@]}"
echo "   Synced:  $SYNCED"
echo "   Syncing: $SYNCING"
echo "═══════════════════════════════════════════════════════════"
