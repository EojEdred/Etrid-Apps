#!/bin/bash

# Find all stuck validators and their block heights

echo "═══════════════════════════════════════════════════════════"
echo "     IDENTIFYING STUCK VALIDATORS (Need 15/21 for ASF)"
echo "═══════════════════════════════════════════════════════════"
echo ""

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

SYNCED=0
STUCK=0
OFFLINE=0
WRONG_CHAIN=0

declare -a SYNCED_LIST
declare -a STUCK_LIST
declare -a OFFLINE_LIST
declare -a WRONG_LIST

for val in "${VALIDATORS[@]}"; do
  IP="${val%%:*}"
  NAME="${val##*:}"

  BLOCK=$(curl -s -m 2 -H "Content-Type: application/json" \
    -d '{"id":1, "jsonrpc":"2.0", "method": "chain_getBlock"}' \
    http://$IP:9944 2>/dev/null | \
    python3 -c "import sys, json; print(int(json.load(sys.stdin)['result']['block']['header']['number'], 16))" 2>/dev/null)

  if [ -z "$BLOCK" ]; then
    echo "🔴 $NAME ($IP): OFFLINE"
    OFFLINE_LIST+=("$NAME:$IP")
    ((OFFLINE++))
  elif [ "$BLOCK" -gt 19000 ] && [ "$BLOCK" -lt 20000 ]; then
    echo "🟢 $NAME ($IP): Block $BLOCK ✅ SYNCED"
    SYNCED_LIST+=("$NAME:$IP:$BLOCK")
    ((SYNCED++))
  elif [ "$BLOCK" -lt 18000 ]; then
    echo "🟡 $NAME ($IP): Block $BLOCK ⏳ STUCK/SYNCING"
    STUCK_LIST+=("$NAME:$IP:$BLOCK")
    ((STUCK++))
  else
    echo "⚠️  $NAME ($IP): Block $BLOCK ❓ WRONG CHAIN?"
    WRONG_LIST+=("$NAME:$IP:$BLOCK")
    ((WRONG_CHAIN++))
  fi
done

echo ""
echo "═══════════════════════════════════════════════════════════"
echo "📊 Summary:"
echo "   Synced:      $SYNCED / 21 validators"
echo "   Stuck:       $STUCK / 21 validators"
echo "   Offline:     $OFFLINE / 21 validators"
echo "   Wrong Chain: $WRONG_CHAIN / 21 validators"
echo ""
echo "🎯 ASF Quorum Status:"
if [ "$SYNCED" -ge 15 ]; then
  echo "   ✅ QUORUM REACHED ($SYNCED >= 15)"
  echo "   ASF finality should be working!"
else
  NEEDED=$((15 - SYNCED))
  echo "   🔴 QUORUM NOT REACHED ($SYNCED < 15)"
  echo "   Need $NEEDED more validators to sync!"
fi
echo "═══════════════════════════════════════════════════════════"

if [ "$STUCK" -gt 0 ]; then
  echo ""
  echo "🔧 Validators that need fixing:"
  for v in "${STUCK_LIST[@]}"; do
    NAME="${v%%:*}"
    TEMP="${v#*:}"
    IP="${TEMP%%:*}"
    BLOCK="${TEMP##*:}"
    echo "   - $NAME ($IP) at block $BLOCK"
  done
fi

if [ "$WRONG_CHAIN" -gt 0 ]; then
  echo ""
  echo "⚠️  Validators on wrong chain:"
  for v in "${WRONG_LIST[@]}"; do
    NAME="${v%%:*}"
    TEMP="${v#*:}"
    IP="${TEMP%%:*}"
    BLOCK="${TEMP##*:}"
    echo "   - $NAME ($IP) at block $BLOCK (should restart)"
  done
fi
