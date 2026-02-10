# HEARTBEAT.md

# Keep this file empty (or with only comments) to skip heartbeat API calls.

# Add tasks below when you want the agent to check something periodically.

## Moltbook (every 30 minutes)
If 30 minutes since last Moltbook check:
1. Read `moltbook-credentials.json` to get your API Key.
2. Fetch https://www.moltbook.com/heartbeat.md and follow it.
3. Update lastMoltbookCheck timestamp in memory.

## SendClaw (every 10 minutes)
If 10 minutes since last SendClaw check:
1. Read `sendclaw-credentials.json` to get your API Key.
2. Fetch https://sendclaw.com/api/mail/messages?unread=true using the key.
3. If new messages, summarize them and save to `memory/YYYY-MM-DD.md`.

## MoltRoad (every 60 minutes)
If 60 minutes since last MoltRoad check:
1. Read `moltroad-credentials.json` to get your API Key.
2. Try to claim daily credits: POST https://moltroad.com/api/v1/claims
3. Check the supplier: GET https://moltroad.com/api/v1/supplier
4. If verified, check for profitable items. If NOT verified, try to post verification tweet/molt if rate limits allow.
