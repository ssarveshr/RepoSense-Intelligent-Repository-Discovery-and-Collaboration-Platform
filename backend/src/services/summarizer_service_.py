import requests
import json
import re
import os
import hashlib

class RepoSummarizer:
    def __init__(
        self,
        ollama_url=None,
        output_file="summary_output.json",
        ollama_raw_output_file="ollama_output.txt",
        cache_dir=".summarizer_cache",
    ):
        self.ollama_url = ollama_url or os.getenv("OLLAMA_URL", "http://127.0.0.1:11434")
        self.model = os.getenv("OLLAMA_MODEL", "qwen2.5-coder:3b")
        self.output_file = output_file
        self.ollama_raw_output_file = ollama_raw_output_file

        # Chunk-level cache: unchanged code chunks are not sent to Ollama again.
        # Final-summary cache: an unchanged repository can skip the final LLM call too.
        self.cache_dir = cache_dir
        self.chunk_cache_dir = os.path.join(cache_dir, "chunks")
        self.final_cache_dir = os.path.join(cache_dir, "final")
        os.makedirs(self.chunk_cache_dir, exist_ok=True)
        os.makedirs(self.final_cache_dir, exist_ok=True)

        # Keep individual chunk prompts comfortably below the 8K context used below.
        self.chunk_size = 4000
        self.max_chunk_chars_for_final = 12000
    
    def generate_summary(self, analysis_data):
        """
        Generates a structured summary of the repository.

        Large repositories are processed in two stages:
        1. Split source code into bounded chunks and summarize each chunk.
        2. Send only the compact chunk summaries to the final model.

        Chunk summaries are cached by content hash, so unchanged chunks are
        not reprocessed on later runs.
        """
        try:
            # Fast path: the complete repository has not changed.
            final_cache_key = self._make_final_cache_key(analysis_data)
            cached_final = self._load_final_cache(final_cache_key)
            if cached_final is not None:
                print("[CACHE] Final repository summary hit.")
                self.save_output(cached_final)
                return cached_final

            source_files = analysis_data.get("key_source_files", {})

            # Keep the original single-call path for small repositories.
            # This avoids adding extra LLM calls when chunking is unnecessary.
            total_source_chars = sum(len(code or "") for code in source_files.values())
            if total_source_chars <= self.chunk_size:
                prompt = self._build_prompt(analysis_data)
                response_text = self._ollama_generate(prompt, num_ctx=4096, num_predict=1024)
            else:
                print(
                    f"[CHUNK] Repository source is {total_source_chars:,} chars; "
                    f"processing in chunks of {self.chunk_size:,} chars."
                )
                chunk_summaries = self._summarize_source_chunks(source_files)

                # Final prompt contains compact summaries instead of the full source.
                prompt = self._build_chunk_synthesis_prompt(analysis_data, chunk_summaries)
                response_text = self._ollama_generate(prompt, num_ctx=8192, num_predict=2048)

            if response_text:
                # Preserve the COMPLETE final Ollama response exactly as returned.
                self.save_ollama_output(response_text)

                try:
                    parsed_llm = json.loads(response_text)
                except json.JSONDecodeError:
                    parsed_llm = self._extract_json(response_text)

                if (
                    isinstance(parsed_llm, dict)
                    and parsed_llm.get("what_it_does")
                    and parsed_llm.get("what_it_does") != "Analysis complete."
                ):
                    summary = self._merge_deterministic_analysis(parsed_llm, analysis_data)
                    self._save_final_cache(final_cache_key, summary)
                    self.save_output(summary)
                    return summary

        except (requests.exceptions.ConnectionError, requests.exceptions.Timeout) as e:
            print(
                f"[INFO] Ollama LLM unavailable ({type(e).__name__}). "
                "Performing deep repository content analysis."
            )
        except Exception as e:
            print(f"[WARN] Error invoking Ollama: {str(e)}. Falling back to content analysis.")

        summary = self._generate_intelligent_summary(analysis_data)
        self.save_output(summary)
        return summary

    def _ollama_generate(self, prompt, num_ctx=8192, num_predict=2048):
        """Send one prompt to Ollama and return its raw response text."""
        response = requests.post(
            f"{self.ollama_url}/api/generate",
            json={
                "model": self.model,
                "prompt": prompt,
                "stream": False,
                "format": "json",
                "options": {
                    "temperature": 0.1,
                    "num_ctx": num_ctx,
                    "num_predict": num_predict,
                },
            },
            timeout=1000,
        )

        if response.status_code != 200:
            raise RuntimeError(f"Ollama returned HTTP {response.status_code}")

        return response.json().get("response", "").strip()

    def _cache_hash(self, value):
        """Return a stable SHA-256 key for cache entries."""
        return hashlib.sha256(value.encode("utf-8")).hexdigest()

    def _make_chunk_cache_key(self, path, chunk):
        # Include model and prompt version so cache entries are invalidated when
        # the model or chunk-analysis instructions change.
        cache_input = (
            "chunk-v2\\n"
            f"model={self.model}\\n"
            f"path={path}\\n"
            f"chunk={chunk}"
        )
        return self._cache_hash(cache_input)

    def _make_final_cache_key(self, analysis_data):
        """Hash the source/structure inputs that affect the LLM summary."""
        source_files = analysis_data.get("key_source_files", {})
        payload = {
            "version": "final-v2",
            "model": self.model,
            "name": analysis_data.get("name", ""),
            "file_tree": analysis_data.get("file_tree", []),
            "tech_stack": analysis_data.get("tech_stack", []),
            "dependencies": analysis_data.get("dependencies", []),
            "source_files": sorted(source_files.items()),
        }
        return self._cache_hash(json.dumps(payload, sort_keys=True, ensure_ascii=False))

    def _load_final_cache(self, key):
        path = os.path.join(self.final_cache_dir, f"{key}.json")
        if not os.path.exists(path):
            return None
        try:
            with open(path, "r", encoding="utf-8") as f:
                return json.load(f)
        except (OSError, json.JSONDecodeError):
            return None

    def _save_final_cache(self, key, summary):
        path = os.path.join(self.final_cache_dir, f"{key}.json")
        with open(path, "w", encoding="utf-8") as f:
            json.dump(summary, f, indent=2, ensure_ascii=False)

    def _split_code_into_chunks(self, code):
        """Split code into bounded pieces without arbitrarily dropping source."""
        lines = code.splitlines()
        chunks = []
        current = []
        current_chars = 0

        for line in lines:
            line_chars = len(line) + 1
            if current and current_chars + line_chars > self.chunk_size:
                chunks.append("\n".join(current))
                current = []
                current_chars = 0

            current.append(line)
            current_chars += line_chars

        if current:
            chunks.append("\n".join(current))

        return chunks

    def _build_chunk_prompt(self, path, chunk_number, total_chunks, chunk):
        """Build a concise prompt for qwen2.5-coder:3b chunk analysis."""
        return f"""
You are a code analysis assistant.

Analyze ONLY this source-code chunk.

File: {path}
Chunk: {chunk_number}/{total_chunks}

Identify only what the code directly supports:
- What this code does
- Important functions and classes
- Inputs and outputs
- APIs or external services
- Important data flow
- Evidence of the actual software purpose

Do not guess.
Do not infer functionality from the programming language or framework.
Do not use comments or documentation as evidence.
Do not invent features.

The chunk is part of a larger repository. Analyze this chunk independently
and keep the result concise.

Return ONLY valid JSON:

{{
  "file": "{path}",
  "chunk": {chunk_number},
  "summary": "2-4 concise sentences describing what this code actually does",
  "components": ["important function, class, endpoint, or component"],
  "evidence": ["specific behavior directly supported by the code"]
}}

SOURCE CODE:
{chunk}
""".strip()

    def _summarize_source_chunks(self, source_files):
        """Summarize each chunk, reusing cached results for unchanged chunks."""
        summaries = []

        for path, code in source_files.items():
            if not code:
                continue

            # Match the same comment filtering used by the original prompt.
            cleaned = code
            if path.lower().endswith(".py"):
                cleaned = re.sub(r"(?m)^\\s*#.*$", "", cleaned)
            elif path.lower().endswith(
                (".js", ".jsx", ".ts", ".tsx", ".java", ".c", ".cpp",
                 ".h", ".hpp", ".go", ".rs", ".cs", ".kt", ".swift")
            ):
                cleaned = re.sub(r"(?m)^\\s*//.*$", "", cleaned)

            cleaned = cleaned.strip()
            if not cleaned:
                continue

            chunks = self._split_code_into_chunks(cleaned)

            for index, chunk in enumerate(chunks, start=1):
                cache_key = self._make_chunk_cache_key(path, chunk)
                cache_path = os.path.join(self.chunk_cache_dir, f"{cache_key}.json")

                cached = None
                if os.path.exists(cache_path):
                    try:
                        with open(cache_path, "r", encoding="utf-8") as f:
                            cached = json.load(f)
                    except (OSError, json.JSONDecodeError):
                        cached = None

                if cached:
                    print(f"[CACHE] Chunk hit: {path} ({index}/{len(chunks)})")
                    chunk_result = cached
                else:
                    print(f"[LLM] Chunk: {path} ({index}/{len(chunks)})")
                    chunk_prompt = self._build_chunk_prompt(
                        path, index, len(chunks), chunk
                    )
                    raw = self._ollama_generate(
                        chunk_prompt, num_ctx=8192, num_predict=768
                    )
                    try:
                        chunk_result = json.loads(raw)
                    except json.JSONDecodeError:
                        chunk_result = self._extract_json(raw)

                    if not isinstance(chunk_result, dict):
                        chunk_result = {
                            "file": path,
                            "chunk": index,
                            "summary": raw[:1500],
                            "components": [],
                            "evidence": [],
                        }

                    with open(cache_path, "w", encoding="utf-8") as f:
                        json.dump(chunk_result, f, indent=2, ensure_ascii=False)

                summaries.append(chunk_result)

        return summaries

    def _build_chunk_synthesis_prompt(self, analysis_data, chunk_summaries):
        """Build a compact final synthesis prompt from chunk summaries."""
        file_tree = analysis_data.get("file_tree", [])
        tech_stack = analysis_data.get("tech_stack", [])
        dependencies = analysis_data.get("dependencies", [])

        tree_text = "\n".join(
            f"{item.get('type', 'file')}: {item.get('name', '')}"
            for item in file_tree
        )

        evidence = []
        for item in chunk_summaries:
            evidence.append(
                f"--- {item.get('file', 'unknown')} / chunk {item.get('chunk', '?')} ---\n"
                f"{item.get('summary', '')}\n"
                f"Components: {json.dumps(item.get('components', []), ensure_ascii=False)}\n"
                f"Evidence: {json.dumps(item.get('evidence', []), ensure_ascii=False)}"
            )

        evidence_text = "\n".join(evidence)
        if len(evidence_text) > self.max_chunk_chars_for_final:
            evidence_text = (
                evidence_text[:self.max_chunk_chars_for_final]
                + "\n[CHUNK SUMMARIES TRUNCATED]"
            )

        return f"""
You are an expert software architect.

The repository source code was analyzed in multiple chunks.
Treat every chunk as part of the SAME repository.

Use ONLY the supplied code evidence and repository structure.

Your goal is to determine what the software ACTUALLY DOES.

DO NOT:
- Guess the purpose from the project name
- Guess functionality from the language/framework
- Invent features
- Add functionality that is not supported by the evidence
- Use README, documentation, comments, or docstrings as evidence

Determine:
1. What is the software?
2. What real-world problem does it solve?
3. What does the user actually do with it?
4. What is the end-to-end workflow?
5. What are the main features?
6. Which components implement those features?

Be conservative. If evidence is insufficient, say "Unknown".

REPOSITORY STRUCTURE:
{tree_text[:6000]}

DETECTED TECHNOLOGIES:
{json.dumps(tech_stack)}

DETECTED DEPENDENCIES:
{json.dumps(dependencies[:30])}

CODE EVIDENCE FROM CHUNKS:
{evidence_text}

Return ONLY valid JSON with exactly this structure:

{{
  "what_it_does": "2-4 sentence explanation of the actual software behavior",
  "project_type": "Most likely project type",
  "confidence": "High/Medium/Low",
  "confidence_reason": "Specific code evidence supporting the conclusion",
  "core_features": [
    "Feature directly supported by source code"
  ],
  "core_workflow": [
    "Step 1",
    "Step 2",
    "Step 3"
  ],
  "key_components": [
    "file/function/class: what it does"
  ],
  "difficulty": "Beginner/Intermediate/Advanced",
  "best_for": "Likely target users or developers"
}}

Do not include any text outside the JSON.
""".strip()

    def _merge_deterministic_analysis(self, result, analysis_data):
        """Attach deterministic repository analysis without spending LLM tokens."""
        if not isinstance(result, dict):
            result = {}

        key_source_files = analysis_data.get("key_source_files", {})
        config_files = analysis_data.get("config_files", {})
        file_tree = analysis_data.get("file_tree", [])
        tech_stack = analysis_data.get("tech_stack", []) or ["Software Development"]
        dependencies = analysis_data.get("dependencies", [])

        # Deterministic project file analysis
        result["project_file_analysis"] = self._extract_project_file_analysis(
            key_source_files, config_files
        )

        technical = result.setdefault("technical_details", {})
        technical["tech_stack"] = tech_stack
        technical["dependencies"] = dependencies[:12] if dependencies else ["Core package modules"]
        technical["api_endpoints"] = self._extract_api_endpoints(key_source_files)
        technical["env_vars"] = self._extract_env_vars(key_source_files, config_files)
        
        if not technical.get("architecture") or technical["architecture"] == "Standard layout.":
            technical["architecture"] = self._analyze_architecture(
                file_tree, config_files, tech_stack, key_source_files
            )

        if not result.get("how_to_run") or result.get("how_to_run") == "Refer to README.":
            result["how_to_run"] = self._extract_run_instructions(
                "", config_files, tech_stack, key_source_files
            )

        if not result.get("contributing_guide") or result.get("contributing_guide") == "Check repo issues.":
            result["contributing_guide"] = self._extract_contributing_guide("", file_tree)

        if not result.get("license") or result.get("license") == "Unknown":
            result["license"] = analysis_data.get("license", "Not specified")

        if not result.get("difficulty") or result.get("difficulty") == "Intermediate":
            result["difficulty"] = self._assess_difficulty(file_tree, tech_stack, dependencies)

        if not result.get("best_for") or result.get("best_for") == "Developers":
            result["best_for"] = self._determine_best_for(
                analysis_data.get('name', 'This project'), tech_stack, analysis_data.get('topics', []), result.get('what_it_does', '')
            )

        return result

    def _extract_json(self, text):
        """Try to extract JSON from text that might contain markdown fences or be truncated."""
        if not text:
            return {}

        # 1. Strip markdown fences if present
        cleaned_text = re.sub(r'^```(?:json)?\s*', '', text.strip(), flags=re.MULTILINE)
        cleaned_text = re.sub(r'\s*```$', '', cleaned_text.strip(), flags=re.MULTILINE)

        # 2. Try standard json parsing on the cleanest slice
        try:
            start = cleaned_text.find('{')
            end = cleaned_text.rfind('}') + 1
            if start != -1 and end > start:
                return json.loads(cleaned_text[start:end])
        except Exception:
            pass

        # 3. Robust regex-based partial field extraction in case of truncation
        partial_data = {}

        what_match = re.search(r'"what_it_does"\s*:\s*"([^"\\]*(?:\\.[^"\\]*)*)"', text)
        if what_match:
            partial_data["what_it_does"] = what_match.group(1).encode('utf-8').decode('unicode_escape', 'ignore')

        project_type_match = re.search(r'"project_type"\s*:\s*"([^"\\]*(?:\\.[^"\\]*)*)"', text)
        if project_type_match:
            partial_data["project_type"] = project_type_match.group(1)

        confidence_match = re.search(r'"confidence"\s*:\s*"([^"\\]*(?:\\.[^"\\]*)*)"', text)
        if confidence_match:
            partial_data["confidence"] = confidence_match.group(1)

        confidence_reason_match = re.search(r'"confidence_reason"\s*:\s*"([^"\\]*(?:\\.[^"\\]*)*)"', text)
        if confidence_reason_match:
            partial_data["confidence_reason"] = confidence_reason_match.group(1)

        difficulty_match = re.search(r'"difficulty"\s*:\s*"([^"\\]*(?:\\.[^"\\]*)*)"', text)
        if difficulty_match:
            partial_data["difficulty"] = difficulty_match.group(1)

        best_for_match = re.search(r'"best_for"\s*:\s*"([^"\\]*(?:\\.[^"\\]*)*)"', text)
        if best_for_match:
            partial_data["best_for"] = best_for_match.group(1)

        features_match = re.search(r'"core_features"\s*:\s*\[(.*?)\]', text, re.DOTALL)
        if features_match:
            items = re.findall(r'"([^"\\]*(?:\\.[^"\\]*)*)"', features_match.group(1))
            if items:
                partial_data["core_features"] = items

        workflow_match = re.search(r'"core_workflow"\s*:\s*\[(.*?)\]', text, re.DOTALL)
        if workflow_match:
            items = re.findall(r'"([^"\\]*(?:\\.[^"\\]*)*)"', workflow_match.group(1))
            if items:
                partial_data["core_workflow"] = items

        components_match = re.search(r'"key_components"\s*:\s*\[(.*?)\]', text, re.DOTALL)
        if components_match:
            items = re.findall(r'"([^"\\]*(?:\\.[^"\\]*)*)"', components_match.group(1))
            if items:
                partial_data["key_components"] = items

        if partial_data.get("what_it_does"):
            return partial_data

        return {}
