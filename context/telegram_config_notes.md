# Telegram Config Notes (pointer)

- Bot: `@msaletra_bot`. Chat/thread IDs and token live in `.env` (gitignored) — see `.env.example` for the variable names, `src/config.js` for how they're loaded and mapped (`TELEGRAM_TOPIC_THREADS`).
- Topic routing: `xau`, `waluty`, `indeksy`, `krypto`, `wyniki` (fallback `plan`) — pass via `--topic` to the CLI.
- **Critical:** never call the MCP tools `telegram_send_signal`/`telegram_send_text` — the MCP server process has no internet access and they always fail with `"fetch failed"`. Always send via Bash + CLI:
  `cd "C:\Users\Magic\tradingview-mcp" && node src/cli/index.js telegram send-doc --photo "<path>" --topic "<topic>"`
- CLI send auto-appends to `trade_log.md` (legacy behavior) — under v2, routines should instead append structured entries directly to `journal/signals_log.jsonl` / `journal/results_log.jsonl` themselves; don't rely on the CLI's legacy auto-log as the source of truth going forward.

Do not duplicate the full root-cause writeup here — see memory `project-mcp-no-internet-use-cli` for that.
