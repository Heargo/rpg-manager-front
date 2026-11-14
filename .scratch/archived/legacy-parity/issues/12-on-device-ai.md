# Item generation with Chrome's on-device AI

Status: wontfix
Type: task
Blocked by: 09

Split from L09 (2026-11-07). Tier 2 of "Item generation" in `spec.md`: in the item editor's Generate tab, feature-detect Chrome's built-in Prompt API (`LanguageModel`, Gemini Nano), and hide it elsewhere. It receives the random generator's draw and the world's attributes, writes the name and description, and returns JSON that the L09 JSON validation accepts. First check the API's status on regular websites (stable or origin trial). Handle the one-time model download (progress, cancel).

## Comments

2026-11-13: removed by the user; not planned.
