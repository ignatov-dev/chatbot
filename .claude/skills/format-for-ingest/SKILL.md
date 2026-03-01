---
name: format-for-ingest
description: Format a raw text file into the section-delimited structure required by the RAG ingestion pipeline. Use when the user provides a txt file path (e.g., "@docs/somefile.txt") and wants it formatted for ingest.
user_invocable: true
argument: file path to the txt file to format (e.g., "docs/verification.txt")
---

# Format Document for Ingestion

You are formatting a raw text document into the structured section format required by the project's RAG ingestion pipeline (`scripts/ingest.mjs`).

## Required Output Format

The ingestion script splits documents using this regex: `/={5,}\nSECTION:\s*(.+)\n={5,}/g`

Each section must follow this exact pattern:

```
============================================================
SECTION: SECTION TITLE IN UPPERCASE
============================================================

Section content here. Can include paragraphs, lists, steps, etc.
Keep content readable with line breaks between paragraphs.
```

End the file with:

```
==============================================================
END OF DOCUMENT
==============================================================
```

## Instructions

1. **Read the file** provided as the argument.
2. **Analyze the content** — identify logical topics, Q&A pairs, or thematic sections.
3. **Split into sections** — each section should cover one coherent topic/question. Use the content's natural structure (headings, topic shifts, Q&A boundaries) to determine where to split.
4. **Name each section** — use a clear, descriptive title in UPPERCASE. If the content is FAQ-style, use the question as the section title (e.g., `SECTION: HOW DO I DEPOSIT FUNDS?`).
5. **Format the content** within each section:
   - Remove unnecessary whitespace, fix formatting issues
   - Keep paragraphs separated by blank lines for readability
   - Preserve lists, steps, and structured data
   - Remove any source formatting artifacts (HTML tags, markdown symbols if not appropriate, etc.)
6. **Keep sections under ~1500 characters** when possible — the ingestion script sub-chunks sections exceeding 1600 chars, so shorter sections produce cleaner chunks.
7. **Write the formatted result** back to the same file path, overwriting the original.
8. **After formatting**, remind the user to:
   - Add the filename to the `DOCUMENTS` array in `scripts/ingest.mjs` if it's a new file
   - Run `node scripts/ingest.mjs -- <filename>` to ingest it

## Example

Input (raw text):
```
How do I reset my password?
Go to Settings > Security > Reset Password. Enter your current password, then your new password twice. Click Save.

What are the supported currencies?
We support BTC, ETH, USDT, and XRP. More currencies may be added in the future.
```

Output (formatted):
```
============================================================
SECTION: HOW DO I RESET MY PASSWORD?
============================================================

Go to Settings > Security > Reset Password. Enter your current password, then your new password twice. Click Save.

============================================================
SECTION: WHAT ARE THE SUPPORTED CURRENCIES?
============================================================

We support BTC, ETH, USDT, and XRP. More currencies may be added in the future.

==============================================================
END OF DOCUMENT
==============================================================
```
