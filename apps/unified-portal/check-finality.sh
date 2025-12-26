#!/bin/bash

# Check Primearc Finality and ASF Certificate Activity

VALIDATOR_IP="100.109.252.56"
RPC_PORT="9944"

echo "═══════════════════════════════════════════════════════════"
echo "      PRIMEARC FINALITY & ASF CERTIFICATE CHECK"
echo "═══════════════════════════════════════════════════════════"
echo ""

# Get finalized block
FINALIZED_HASH=$(curl -s -H "Content-Type: application/json" \
  -d '{"id":1, "jsonrpc":"2.0", "method": "chain_getFinalizedHead"}' \
  http://$VALIDATOR_IP:$RPC_PORT 2>/dev/null | \
  python3 -c "import sys, json; print(json.load(sys.stdin)['result'])" 2>/dev/null)

echo "🔐 Finalized Block Hash: ${FINALIZED_HASH:0:20}...${FINALIZED_HASH: -10}"

# Get finalized block number
FINALIZED_NUM=$(curl -s -H "Content-Type: application/json" \
  -d "{\"id\":1, \"jsonrpc\":\"2.0\", \"method\": \"chain_getHeader\", \"params\": [\"$FINALIZED_HASH\"]}" \
  http://$VALIDATOR_IP:$RPC_PORT 2>/dev/null | \
  python3 -c "import sys, json; print(int(json.load(sys.stdin)['result']['number'], 16))" 2>/dev/null)

# Get latest block number
LATEST_NUM=$(curl -s -H "Content-Type: application/json" \
  -d '{"id":1, "jsonrpc":"2.0", "method": "chain_getBlock"}' \
  http://$VALIDATOR_IP:$RPC_PORT 2>/dev/null | \
  python3 -c "import sys, json; print(int(json.load(sys.stdin)['result']['block']['header']['number'], 16))" 2>/dev/null)

echo "📊 Finalized Block: #${FINALIZED_NUM}"
echo "📊 Latest Block:    #${LATEST_NUM}"
echo ""

if [ -n "$FINALIZED_NUM" ] && [ -n "$LATEST_NUM" ]; then
  FINALITY_LAG=$((LATEST_NUM - FINALIZED_NUM))
  echo "⏱️  Finality Lag: ${FINALITY_LAG} blocks"
  echo ""

  if [ "$FINALITY_LAG" -lt 3 ]; then
    echo "✅ Finality Status: EXCELLENT (lag < 3 blocks)"
  elif [ "$FINALITY_LAG" -lt 10 ]; then
    echo "🟢 Finality Status: GOOD (lag < 10 blocks)"
  elif [ "$FINALITY_LAG" -lt 50 ]; then
    echo "🟡 Finality Status: DEGRADED (lag < 50 blocks)"
  else
    echo "🔴 Finality Status: POOR (lag >= 50 blocks)"
  fi
else
  echo "❌ Unable to retrieve block information"
fi

echo ""
echo "───────────────────────────────────────────────────────────"
echo "🔍 Checking ASF Certificate Activity..."
echo ""

# Check recent block for justifications (ASF certificates)
RECENT_BLOCK=$(curl -s -H "Content-Type: application/json" \
  -d '{"id":1, "jsonrpc":"2.0", "method": "chain_getBlock"}' \
  http://$VALIDATOR_IP:$RPC_PORT 2>/dev/null)

HAS_JUSTIFICATION=$(echo "$RECENT_BLOCK" | python3 -c "
import sys, json
try:
    data = json.load(sys.stdin)
    justifications = data['result']['justifications']
    if justifications and len(justifications) > 0:
        print('YES')
    else:
        print('NO')
except:
    print('UNKNOWN')
" 2>/dev/null)

if [ "$HAS_JUSTIFICATION" = "YES" ]; then
  echo "✅ ASF Certificates: ACTIVE (justifications present)"
elif [ "$HAS_JUSTIFICATION" = "NO" ]; then
  echo "🟡 ASF Certificates: Not in recent block (may be on finalized blocks)"
else
  echo "❓ ASF Certificates: Unable to determine"
fi

echo ""
echo "───────────────────────────────────────────────────────────"
echo "👥 Active Validator Set..."
echo ""

# Get session validators
VALIDATORS=$(curl -s -H "Content-Type: application/json" \
  -d '{"id":1, "jsonrpc":"2.0", "method": "session_validators"}' \
  http://$VALIDATOR_IP:$RPC_PORT 2>/dev/null | \
  python3 -c "
import sys, json
try:
    data = json.load(sys.stdin)
    validators = data['result']
    print(f'Active Validators: {len(validators)}')
    for i, v in enumerate(validators[:5]):
        print(f'  {i+1}. {v[:10]}...{v[-8:]}')
    if len(validators) > 5:
        print(f'  ... and {len(validators) - 5} more')
except Exception as e:
    print('Unable to retrieve validator set')
" 2>/dev/null)

echo "$VALIDATORS"

echo ""
echo "═══════════════════════════════════════════════════════════"
