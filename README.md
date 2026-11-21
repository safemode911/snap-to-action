# Snap-to-Action AI (Zero-Prompt Deterministic Engine)

Drop or forward anything (receipts, event posters, PDFs, voice notes) with zero prompting. Outputs ready-to-use artifacts (`.ics`, interactive split-bill, structured exports)—not another wall of text.

## Anti-Hallucination Architecture

The LLM never generates the final artifact. It acts strictly as an intent router and schema-constrained parser:

1. **Constrained JSON Extraction**: Strict schema validation (`receipt` | `event`). No freeform generation.
2. **Deterministic Verification**: Pure code runs math checksums (`sum(items) + tax + tip == total`) and strict ISO date validation.
3. **Confidence-Gated Fallback**: Any field under `0.92` confidence or failing a checksum triggers a 1-tap user confirmation on that exact field—zero silent guessing.
4. **Pure Code Rendering**: Deterministic builders render valid RFC 5545 `.ics` files and interactive split-bill calculators.

## Run Prototype
Open `index.html` directly in any browser (zero dependencies) or view via GitHub Pages.
