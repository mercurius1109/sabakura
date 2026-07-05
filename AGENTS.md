# Project Instructions

## Local LLM Token-Saving Policy

When a task involves large read-only inputs, such as logs, dependency output,
long documents, generated files, or broad codebase exploration, use a local
LLM through Ollama for first-pass summarization when it is available.

Use the local LLM only for bounded, read-heavy support work:

- Summarize long logs, traces, test output, or documents.
- Identify likely relevant files from large search results.
- Extract short evidence lists from large text inputs.
- Produce concise JSON or bullet summaries for Codex to inspect.

Do not use the local LLM for final decisions, code edits, security-sensitive
judgment, dependency installation, or destructive actions. Codex remains
responsible for final reasoning, implementation, and verification.

Prefer short local-LLM outputs. Ask for no more than 5 to 20 lines, or a compact
JSON object. Do not paste raw large local-LLM output back into the Codex thread.

If Ollama is not installed, no local model is available, or the local call fails,
continue with normal Codex workflow and mention the fallback briefly.

Default local model for this project:

- `gemma3:4b` for general summarization and first-pass read-heavy analysis.

On Windows, if `ollama` is not available on `PATH`, try the default per-user
install path:

```powershell
C:\Users\hkawa\AppData\Local\Programs\Ollama\ollama.exe
```

Prefer the local Ollama HTTP API for scripted calls because it avoids terminal
spinner output. In PowerShell, send JSON as UTF-8 bytes when the prompt contains
Japanese text.

Other useful local models, when available:

- `qwen2.5-coder:7b` for code-oriented summaries on modest hardware.
- `llama3.1:8b` or similar small general models for prose/log summaries.

Example pattern:

```text
Use Ollama to summarize this input. Return only:
{
  "summary": "...",
  "relevant_files": ["..."],
  "evidence": ["..."],
  "next_steps": ["..."]
}
```

## Background-Friendly Workflow

For this project, prefer short background-friendly loops over long foreground-only
sessions when possible.

- Use `pnpm dev:bg` to start the Vite dev server in the background.
- Use `pnpm dev:status` to check whether the dev server is still running.
- Use `pnpm dev:stop` to stop the tracked background dev server.

The background dev server writes to `dev-server.log` and tracks its PID in
`.vite-dev.pid`.
