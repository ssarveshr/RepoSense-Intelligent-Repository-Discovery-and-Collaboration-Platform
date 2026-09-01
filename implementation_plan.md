# Implementation Plan: Full Codebase Ollama Summary Generation

Enhance the Ollama repository summarization engine so that Llama 3 analyzes source code files across the entire codebase (routes, models, components, entry points, configs) rather than relying primarily on `README.md` or a 3,000-character truncated snippet.

## User Review Required

> [!IMPORTANT]
> **LLM Response Time & Timeout**:
> Deep codebase analysis across up to 50 source files increases the Ollama prompt size from ~3KB to ~25KB. Local Llama 3 (8B) inference with larger prompts takes around 30 to 90 seconds depending on local GPU/CPU hardware. The backend HTTP timeout will be increased from `5s` to `90s` to allow Ollama sufficient time to complete inference without timing out.

> [!NOTE]
> **Code Context Window Management**:
> Modern local LLMs like `llama3:8b` support an 8K-16K token context window (~25,000-50,000 characters). We will construct a structured, multi-file codebase manifest containing signatures, key logic, file structures, and code chunks across the entire tree.

---

## Proposed Changes

### Backend - Integrations & Services

#### [MODIFY] [github.py](file:///c:/Users/ssr10/Desktop/CODESSSS/RepoSense-Intelligent-Repository-Discovery-and-Collaboration-Platform/backend/src/integrations/github.py)
- Refine file tree traversal and source file selection in `_fetch_key_source_files`.
- Prioritize important architectural code files across all directories (entry points, API routers, database schemas, frontend components, business services, configuration files).
- Increase file content fetching limits and capture representative slices from top source files across the codebase tree.

#### [MODIFY] [summarizer_service.py](file:///c:/Users/ssr10/Desktop/CODESSSS/RepoSense-Intelligent-Repository-Discovery-and-Collaboration-Platform/backend/src/services/summarizer_service.py)
- **Increase Ollama Timeout**: Update `requests.post` timeout from `5` seconds to `90` seconds.
- **Expand Ollama Code Prompt**:
  - Remove the strict 3,000-character hard cap on `key_source_summary` in `_build_prompt`.
  - Format source code files into structured blocks with file paths, line counts, and code snippets up to 25,000 characters total.
  - Instruct Ollama explicitly: `"You are analyzing the FULL codebase. Do NOT rely solely on the README. Inspect the provided source code files, application entry points, API routes, data models, and directory structures to derive your architectural and functional summary."`
- **Fallback Alignment**: Update `_generate_intelligent_summary` to also incorporate full codebase file traversal results if Ollama is offline or unavailable.

---

## Verification Plan

### Automated / Manual Verification
1. **Ollama Live Test**:
   - Send a `/summarize-github` request for a repository (e.g. RepoSense itself or a target open-source repository).
   - Verify in backend logs that Ollama receives the enlarged codebase prompt containing source code files across multiple directories.
   - Verify that Ollama responds successfully without timing out.
2. **Output Validation**:
   - Inspect the returned summary JSON to ensure `project_file_analysis`, `architecture`, `api_endpoints`, `tech_stack`, and `key_components` reflect actual codebase source code (functions, routes, components) rather than just repeating README sentences.
3. **Frontend Integration Check**:
   - Open the GitHub Summarizer view in the browser (`GitHubSummarizer.jsx`), trigger a summary, and confirm that file-by-file code insights and architectural breakdowns display properly.
