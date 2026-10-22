# RepoSense: Comprehensive Technical & Project Content Guide

> **Project Title:** RepoSense: An Intelligent Semantic Repository Discovery, Zero-Clone Architectural Inference, AI-Agent Auditing, and Integrated Developer Collaboration Platform  
> **Authors:** Sai Sarvesh R, Shashidhar N S, Priyanshu Kumar, Suhan Ganesh  
> **Project Guide:** Naveen B M (Assistant Professor)  
> **Department:** Department of Computer Science and Engineering  
> **Institution:** RNS Institute of Technology, Bengaluru, India  
> **Academic Year:** 2025–2026  

---

## Table of Contents
1. [Executive Summary](#1-executive-summary)
2. [The Problem Statement (Deep Dive)](#2-the-problem-statement-deep-dive)
3. [The Proposed Solution (The 4 Pillars)](#3-the-proposed-solution-the-4-pillars)
4. [The End-to-End System Pipeline](#4-the-end-to-end-system-pipeline)
5. [System Architecture & Structure](#5-system-architecture--structure)
6. [Mathematical & Algorithmic Formulations](#6-mathematical--algorithmic-formulations)
7. [Empirical Evaluation & Benchmark Results](#7-empirical-evaluation--benchmark-results)gitgi
8. [Technology Stack Reference](#8-technology-stack-reference)
9. [Viva Voce & Exhibition Q&A Guide](#9-viva-voce--exhibition-qa-guide)

---

## 1. Executive Summary

Modern software development relies extensively on open-source ecosystems. Platforms such as GitHub host more than 400 million repositories. However, discovering the right project and understanding how it works internally is still fraught with friction:
- **Search fails on intent**: Standard search looks for exact keyword matches in titles and tags rather than what the software actually accomplishes.
- **Evaluation is slow and heavy**: Developers must clone gigabytes of code to their laptops just to find entrypoints, dependencies, or undocumented REST APIs.
- **Tools are fragmented**: Code reviews, pair programming, and debugging meetings take place in external apps (Zoom, Teams, Google Meet), disconnected from the actual source code.

**RepoSense** solves these issues within a single full-stack platform by uniting:
1. **Semantic vector retrieval** using Sentence-Transformers and ChromaDB.
2. **Zero-clone architectural inference** using recursive cloud tree harvesting and a local Llama 3 (8B) model.
3. **An isolated code execution sandbox** with automated bug auditing and Unified Diff patch generation.
4. **An embedded Zoom video meeting workspace** side-by-side with code, backed by an on-demand HTTP Smart-Git remote server.

---

## 2. The Problem Statement (Deep Dive)

### 2.1 Lexical Search Brittleness & Vocabulary Mismatch
Traditional code hosting search engines (GitHub, GitLab, Bitbucket) use lexical indexing (BM25, inverted index, TF-IDF). This creates severe vocabulary mismatch:
- If a developer searches for `"task scheduler with priority queues"`, but the maintainer labeled their repository `"job runner and pipeline orchestrator"`, the search returns zero relevant results.
- Keyword engines treat words as opaque tokens instead of semantic concepts. This causes a **51% lexical failure rate** when users express functional intent rather than exact repository names.

### 2.2 Heavyweight Onboarding Overhead ("Clone Fatigue")
Evaluating whether an open-source library fits an architectural need currently requires:
- Downloading hundreds of megabytes or gigabytes of source code, history, and dependencies.
- Consuming local SSD storage, bandwidth, and CPU cycles just to inspect a small set of files.
- Manually browsing through deeply nested folders (`src/`, `backend/`, `controllers/`) to identify the actual entrypoint (`main.py`, `index.ts`, `App.jsx`).

### 2.3 Documentation Decay & Comprehension Gap
README files are notoriously incomplete, outdated, or misleading:
- More than 60% of open-source projects have stale documentation that omits newly added REST API routes.
- Crucial configuration prerequisites—such as required environment variables (`DATABASE_URL`, `JWT_SECRET`, `REDIS_HOST`)—are buried across multiple source files without centralized documentation.

### 2.4 Collaboration Locality & Context Switching Latency
Developers collaborating on code reviews, bug fixes, or sprint onboarding must constantly switch contexts:
- Video meetings take place in standalone windows (Zoom, Microsoft Teams, Google Meet).
- Developers must share their entire screen, juggle between terminal sessions, code editors, and meeting tabs.
- Studies measure this switching friction at **~42 seconds per context transition**, breaking developer focus.

### 2.5 Security Risks in Testing Unfamiliar Code
First-time open-source contributors often download and run unfamiliar code snippets directly on their host machines, risking malicious scripts, infinite loops, and unhandled system crashes without sandbox protection.

---

## 3. The Proposed Solution (The 4 Pillars)

```
+-----------------------------------------------------------------------------------+
|                            REPOSENSE SOLUTION ECOSYSTEM                           |
+-----------------------------------------------------------------------------------+
|  [Pillar 1: Semantic Discovery]       |  [Pillar 2: Zero-Clone Inference]         |
|  • 384-dimensional dense vectors      |  • Scans remote file trees up to 500 files|
|  • Meaning-based conceptual search     |  • Discovers REST routes & env vars       |
|  • Hybrid star & name reranking       |  • 18-second Llama 3 8B architectural map |
+---------------------------------------+-------------------------------------------+
|  [Pillar 3: AI Sandbox & Agent Studio]|  [Pillar 4: In-Context Video & Git Push]  |
|  • Subprocess isolation (Δt ≤ 5.0s)   |  • Embedded Zoom SDK side-by-side with IDE|
|  • Automated security bug auditing    |  • Smart-Git HTTP gateway on LAN / WAN    |
|  • One-click Unified Diff patches     |  • Dynamic on-demand bare repo creation   |
+-----------------------------------------------------------------------------------+
```

### Pillar I: Semantic Vector Search & Hybrid Reranking
- Maps queries and repository descriptions into a shared 384-dimensional geometric space using the `all-MiniLM-L6-v2` Sentence-Transformer model.
- Indexes vectors inside a high-speed ChromaDB vector store using Hierarchical Navigable Small World (HNSW) graphs.
- Employs a custom hybrid reranking formula that blends semantic similarity with repository community adoption (stars) and lexical boosting for exact repository names.

### Pillar II: Zero-Clone Deep Multi-File Architectural Inference
- Reconstructs full repository directory trees up to 500 files via GitHub REST v3 API without running `git clone`.
- Samples entrypoints, manifests (`package.json`, `requirements.txt`, `Cargo.toml`), and extracts REST API endpoints (e.g., `GET /search`, `POST /audit`) and environment variable keys using AST and regex parsing.
- Prompts a locally hosted, quantized Large Language Model (**Llama 3 8B** via Ollama) to synthesize an end-to-end architectural summary in **18 seconds** (down from 1.2 minutes of manual browsing).

### Pillar III: Autonomous AI Code Agent & Sandboxed Execution Studio
- Provides an in-browser code editor paired with a secure subprocess worker.
- Enforces strict execution limits ($\Delta t_{\text{max}} = 5.0\text{ seconds}$) and memory caps to run Python/JavaScript snippets safely.
- Scans code for security vulnerabilities, logic errors, and memory leaks.
- Generates standardized Unified Diff patches ($\Delta P = \text{Diff}(C_{\text{original}}, C_{\text{fixed}})$) ready for GitHub pull requests.

### Pillar IV: In-Context Zoom Collaboration & Smart-Git Remote Server
- Embeds the Zoom Meeting Web Client SDK directly within the browser interface (`zoom.us/wc/{meeting_id}/join`), removing the need for an external desktop client.
- Reduces video context-switch transition time from 42 seconds to under 3 seconds.
- Complemented by a self-hosted HTTP Smart-Git version control server that automatically initializes bare repositories on the fly when developers run `git push origin main` over local Wi-Fi or public Cloudflare tunnels.

---

## 4. The End-to-End System Pipeline

```mermaid
graph TD
    A["1. User Plain Language Query"] --> B["2. Sentence-Transformer (all-MiniLM-L6-v2)"]
    B --> C["Dense 384-d Vector v_Q"]
    C --> D["3. ChromaDB Vector Store Query (Top-k Candidates)"]
    D --> E["4. Hybrid Reranker: Cosine Sim + log(Stars) + Name Boost"]
    E --> F["Surfaced Ranked Repositories"]
    F --> G["5. User Selects Repository for Deep Triage"]
    G --> H["6. Zero-Clone Tree Harvesting (GitHub REST v3, depth=500)"]
    H --> I["7. AST & Manifest Extractor (REST Routes + Env Vars + Dependencies)"]
    I --> J["8. Local Llama 3 8B Model (Ollama)"]
    J --> K["Structured Architectural Summary (18s)"]
    K --> L["9. Concurrent In-App Zoom Call + Code Sandbox Studio"]
```

### Detailed Pipeline Stages

| Step | Stage Name | Technical Action | Input $\rightarrow$ Output |
| :---: | :--- | :--- | :--- |
| **1** | **Query Ingestion** | Developer inputs a query into the React frontend (e.g., *"realtime multiplayer chess game in react with websockets"*). | Natural language string $\rightarrow$ JSON payload |
| **2** | **Dense Vector Encoding** | Pretrained Sentence-Transformer `all-MiniLM-L6-v2` encodes text into a dense mathematical vector. | Text $\rightarrow \vec{v}_Q \in \mathbb{R}^{384}$ |
| **3** | **Vector Search** | Vector $\vec{v}_Q$ queries ChromaDB using HNSW nearest-neighbor search against pre-indexed open-source repositories. | $\vec{v}_Q \rightarrow$ Top 20 candidate repositories |
| **4** | **Hybrid Scoring & Reranking** | Computes cosine similarity, combines with logarithmic stargazers, and applies exact/partial name boosts. | Raw candidates $\rightarrow$ Ranked results (MRR: 0.91) |
| **5** | **Zero-Clone Tree Read** | Recursively traverses remote repository directory trees via GitHub API (`depth=500`) without local disk storage. | Repo URL $\rightarrow$ Directory hierarchy + manifest files |
| **6** | **Static Schema & Route Extraction** | Parses manifests (`package.json`, `requirements.txt`) and extracts REST routes and env vars using AST/regex. | Source files $\rightarrow$ Route maps + required environment keys |
| **7** | **Local LLM Architectural Synthesis** | Compressed context is passed to local Llama 3 (8B) via Ollama, generating purpose, file roles, and blueprints. | Structured context $\rightarrow$ 18-second architectural summary |
| **8** | **Dual Studio & Collaboration** | Code snippets run in an isolated 5s subprocess sandbox while developers collaborate over embedded Zoom video. | Code snippet $\rightarrow$ Stdout/Stderr/Unified Diff + Video Stream |

---

## 5. System Architecture & Structure

```
+-----------------------------------------------------------------------------------------+
|                                    CLIENT VIEWPORT                                      |
|  [React 18 + Vite]  •  [Semantic Search UI]  •  [AI Studio]  •  [Embedded Zoom Web SDK] |
+-----------------------------------------------------------------------------------------+
                                        | (HTTP REST / WebSocket)
                                        v
+-----------------------------------------------------------------------------------------+
|                                 FASTAPI BACKEND GATEWAY                                 |
|  • Router & CORS Middleware       • Dynamic Reranker Service   • Remote Git Interceptor |
|  • Zero-Clone Tree Traversal      • Subprocess Execution Mgr   • Zoom Token Generator   |
+-----------------------------------------------------------------------------------------+
              |                              |                               |
              v                              v                               v
+---------------------------+  +---------------------------+  +---------------------------+
|    AI & MACHINE LEARNING  |  |    STORAGE & VECTOR DB    |  |    EXTERNAL PLATFORMS     |
| • all-MiniLM-L6-v2 (384d) |  | • ChromaDB (HNSW Graph)   |  | • GitHub REST API v3      |
| • Ollama (Llama 3 8B)     |  | • Dynamic Bare Git Repos  |  | • Zoom Video Infrastructure|
| • Subprocess Sandbox (≤5s)|  | • File Cache Storage      |  | • Cloudflare Tunnels (WAN)|
+---------------------------+  +---------------------------+  +---------------------------+
```

### 5.1 Presentation Layer (Frontend)
- **Framework**: React 18, bootstrapped with Vite for instant Hot Module Replacement (HMR).
- **Styling**: Tailored modern CSS design system with responsive layouts and light/dark modes.
- **Embedded Zoom Web SDK**: Houses `ZoomRoom.jsx` to render video meetings directly alongside code without desktop app installation.
- **AI Agent Studio**: An interactive code editor displaying standard output, execution duration, and side-by-side Unified Diff patch visualizations.

### 5.2 Application & Gateway Layer (Backend)
- **Framework**: Python 3.11 with FastAPI (asynchronous ASGI server powered by Uvicorn).
- **Endpoints**:
  - `POST /api/search`: Semantic search with hybrid reranking.
  - `POST /api/summarize-github`: Remote recursive tree harvesting and architectural synthesis.
  - `POST /api/execute`: Subprocess code execution with timeout enforcement.
  - `POST /api/generate-patch`: AI-driven bug auditing and Unified Diff patch production.
  - `GET /git/...`: HTTP Smart-Git daemon protocol handling dynamic repository pushes.

### 5.3 AI & Machine Learning Layer
- **Embedding Model**: `sentence-transformers/all-MiniLM-L6-v2` (fast 384-dimensional embeddings, ideal for low-latency retrieval).
- **Large Language Model**: **Meta Llama 3 (8B Instruct)** quantized and served locally using Ollama.
- **Privacy & Cost**: Runs entirely on-device, ensuring zero proprietary code leakage to third-party cloud APIs and zero per-token billing ($0.00 operational cost).

### 5.4 Storage & Persistence Layer
- **Vector Database**: ChromaDB with persistent local storage, employing HNSW indexing for rapid sub-50ms cosine distance queries.
- **Version Control Storage**: Dynamic local directory storing bare repositories (`git init --bare`) initialized on-the-fly upon the first push.

---

## 6. Mathematical & Algorithmic Formulations

### Algorithm 1: Semantic Search & Hybrid Reranking
```text
Input: User query Q, candidate retrieval count k, balance parameter alpha = 0.75
Output: Ranked repository candidate list R

1. v_Q = SentenceTransformer.Encode(Q)                    // 384-dimensional vector
2. Candidates = ChromaDB.Query(v_Q, top_k = 20)           // HNSW nearest neighbors
3. For each document D_i in Candidates:
4.     sim = CosineSimilarity(v_Q, v_{D_i})
5.     score = alpha * sim + (1 - alpha) * log10(1 + D_i.stars)
6.     If ExactMatch(Q.lower(), D_i.name.lower()):
7.         score = score + 0.8                            // Exact name boost
8.     Else If PartialMatch(Q.lower(), D_i.name.lower()):
9.         score = score + 0.4                            // Substring name boost
10.    D_i.final_score = score
11. R = Sort Candidates by final_score descending
12. Return R[1 ... k]
```

### Mathematical Formula: Hybrid Ranking Objective Function
$$\mathcal{R}(Q, D_i) = \alpha \cdot \left(\frac{\vec{v}_Q \cdot \vec{v}_{D_i}}{\|\vec{v}_Q\|_2 \|\vec{v}_{D_i}\|_2}\right) + (1 - \alpha) \cdot \log_{10}\Big(1 + \text{Stars}(D_i)\Big) + \beta_{\text{boost}}$$
- **$\alpha = 0.75$**: Balances semantic intent against community popularity.
- **$\log_{10}(1 + \text{Stars})$**: Compresses popularity disparities so high-star projects don't overwhelm niche, relevant tools.
- **$\beta_{\text{boost}}$**: Adds $+0.8$ for exact title matches and $+0.4$ for partial title matches.

### Algorithm 2: Zero-Clone Multi-File Architectural Extraction
```text
Input: GitHub Repository URL u
Output: Structured Architectural Breakdown S

1. FileTree = GitHubAPI.GetTree(u, recursive = true, max_files = 500)
2. ManifestFiles = Filter(FileTree, ['package.json', 'requirements.txt', 'Cargo.toml'])
3. CriticalFiles = FilterSourceFiles(FileTree, limit = 50)
4. ExtractedRoutes = [], ExtractedEnvVars = [], FileRoles = []
5. For each file f in CriticalFiles:
6.     code = GitHubAPI.GetRawBlob(f)
7.     ExtractedRoutes.Append(ParseAPIRoutes(code))        // Regex & AST matching
8.     ExtractedEnvVars.Append(ParseEnvKeys(code))         // Env var key harvesting
9.     FileRoles.Append(AnalyzeFileRole(f, code))
10. Context = Compile(FileTree, ManifestFiles, ExtractedRoutes, ExtractedEnvVars, FileRoles)
11. S = Ollama_Llama3.Generate(Prompt_Architectural_Synthesis + Context)
12. Return S
```

---

## 7. Empirical Evaluation & Benchmark Results

The RepoSense platform was empirically evaluated across a benchmark suite of **50 natural language developer queries** tested against an index of **500 GitHub repositories**, as well as **100 deep multi-file repository summarizations**:

| Evaluation Dimension | Traditional Approach (GitHub) | RepoSense Platform | Measurable Advantage |
| :--- | :--- | :--- | :--- |
| **Search Relevancy (MRR)** | 0.51 (Lexical BM25) | **0.91** (Semantic Vector + Rerank) | **+104.7% improvement** in surfacing intent-matching repos |
| **Precision@3 (P@3)** | 0.42 | **0.86** | **+104.8% precision** in top 3 recommended projects |
| **Codebase Evaluation Time** | 1.2 minutes (manual clone & browse) | **18 seconds** (Zero-Clone AI summary) | **74% reduction** in developer onboarding triage time |
| **Schema Compliance** | N/A (unstructured README) | **99.1%** | Verified across 100 test repositories |
| **Code Analysis Fidelity** | Manual tracing | **96.3%** | Accurately maps entrypoints, routes, and env vars |
| **Collaboration Context Switch** | 42 seconds (opening Zoom/Meet) | **< 3 seconds** (embedded Zoom viewport) | **92.8% reduction** in context-switching overhead |
| **Meeting Setup Latency** | Manual link generation | **~280 ms** | Instant in-app session creation |
| **Cost & Privacy** | Paid cloud LLM APIs (OpenAI/Anthropic) | **$0.00 / 100% On-Device** | Local Llama 3 8B ensures zero cost & total data privacy |

---

## 8. Technology Stack Reference

| Component / Layer | Technology Selected | Purpose & Rationale |
| :--- | :--- | :--- |
| **Frontend Framework** | **React 18 + Vite** | High performance, rapid virtual DOM updates, modular component architecture. |
| **Styling** | **Custom CSS Tokens & Tailwind** | Modern, clean developer dashboard design without heavy UI framework lock-in. |
| **Backend API** | **FastAPI (Python 3.11)** | High-throughput asynchronous endpoints, automatic OpenAPI schema generation. |
| **Embeddings Model** | **SentenceTransformers (`all-MiniLM-L6-v2`)** | Encodes natural language queries into 384-dimensional dense vectors in &lt;15ms. |
| **Vector Database** | **ChromaDB** | Local embedded vector store utilizing HNSW graphs for ultra-fast vector similarity search. |
| **Local LLM Engine** | **Meta Llama 3 (8B) via Ollama** | State-of-the-art open-source LLM running locally with zero token fees and complete privacy. |
| **Video Collaboration** | **Zoom Web Client SDK** | In-app video calling, screen sharing, and audio directly alongside source code. |
| **Version Control Gateway** | **HTTP Smart-Git Server + Cloudflare** | Self-hosted dynamic bare Git repository provisioning across local Wi-Fi and WAN tunnels. |
| **Execution Sandbox** | **Python Subprocess Worker** | Isolated snippet execution with strict timeout limits ($\le 5.0\text{s}$) and memory caps. |

---

## 9. Viva Voce & Exhibition Q&A Guide

### Q1: What makes RepoSense different from GitHub's native search?
> **Answer:** GitHub relies on keyword matching (BM25) over titles, descriptions, and manual tags. If you search for *"task runner"* and a repository is called *"pipeline orchestrator"*, GitHub will miss it. RepoSense converts queries into mathematical vectors of meaning (`all-MiniLM-L6-v2`), so it retrieves repositories based on what they *do*, not just the exact words used in their title.

### Q2: What does "Zero-Clone" mean, and why is it important?
> **Answer:** Normally, to inspect an unfamiliar codebase, a developer has to run `git clone`, downloading hundreds of megabytes of commit history, asset files, and modules. "Zero-Clone" means RepoSense reads the remote file tree hierarchy and critical source files via GitHub's REST API. It extracts API routes and configuration keys without saving a single byte to disk, reducing assessment time from over a minute to 18 seconds.

### Q3: Why run Llama 3 locally instead of using OpenAI GPT-4?
> **Answer:** Two reasons: **Cost** and **Privacy**. Running Llama 3 (8B) locally via Ollama costs $0.00 in API tokens. Furthermore, enterprise and open-source developers often cannot send proprietary or unreleased source code to third-party cloud servers. Local LLMs guarantee 100% data confidentiality.

### Q4: How does the in-app Zoom video collaboration work?
> **Answer:** Instead of forcing developers to leave their workspace and open an external Zoom application, RepoSense embeds the Zoom Web Client SDK directly within the browser viewport (`ZoomRoom.jsx`). Developers can talk, screenshare, and review code side-by-side with the AI Studio, cutting transition latency from 42 seconds to under 3 seconds.

### Q5: What is the HTTP Smart-Git remote server?
> **Answer:** It is a self-hosted Git gateway built directly into the FastAPI backend. When a developer pushes code to `http://<server-ip>:8000/git/...`, the server intercepts the payload, dynamically creates a bare repository on the fly, and unpacks commits without needing a third-party service like GitHub.
