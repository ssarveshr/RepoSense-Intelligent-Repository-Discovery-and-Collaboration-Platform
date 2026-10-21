# INVENTION DISCLOSURE & TECHNICAL SPECIFICATION DOCUMENT

---

## 1. Title of the Invention
**RepoSense: An Intelligent Semantic Repository Discovery, Zero-Clone Architectural Inference, AI-Agent Auditing, and Integrated Developer Collaboration Platform**

---

## 2. Inventors / Contributors
- **Sai Sarvesh R** (*Dept. of Computer Science and Engineering, RNS Institute of Technology, Bengaluru, India*)
- **Shashidhar N S** (*Dept. of Computer Science and Engineering, RNS Institute of Technology, Bengaluru, India*)
- **Priyanshu Kumar** (*Dept. of Computer Science and Engineering, RNS Institute of Technology, Bengaluru, India*)
- **Suhan Ganesh** (*Dept. of Computer Science and Engineering, RNS Institute of Technology, Bengaluru, India*)
- **Naveen B M** (*Assistant Professor, Dept. of Computer Science and Engineering, RNS Institute of Technology, Bengaluru, India*)

---

## 3. Technical Field of the Invention
This invention pertains generally to the fields of **Artificial Intelligence (AI), Natural Language Processing (NLP), Information Retrieval, Software Engineering Tooling, Version Control Systems (VCS), and Collaborative Distributed Systems**.

More specifically, the invention relates to:
- Dense vector similarity search and dynamic algorithmic reranking for source code repositories.
- Zero-clone architectural comprehension and automated REST API/environment variable schema extraction.
- Sandboxed runtime execution and differential patch generation via autonomous AI code agents.
- Embedded synchronous video conferencing integrated directly alongside software repository artifacts.
- Dynamic bare Git repository provisioning via a self-hosted HTTP Smart-Git version control gateway.

---

## 4. Background of the Invention & Prior Art
Open-source software has become foundational infrastructure for global computing. Millions of developers and enterprises rely on publicly hosted repositories across platforms such as GitHub, GitLab, and Bitbucket.

However, existing platforms exhibit structural deficiencies across the software lifecycle:
1. **Lexical Brittleness:** Current search engines rely on inverted indexing, BM25, and bag-of-words heuristics matched against repository titles, descriptions, and manual topic tags. When maintainers and developers use different terms for identical concepts (e.g., *"task runner"* vs. *"pipeline orchestrator"*), search fails due to vocabulary mismatch.
2. **Heavyweight Onboarding & Codebase Triage:** Understanding a prospective repository currently requires downloading or cloning gigabytes of data to local disk, navigating complex multi-level folder structures, manually tracing entrypoint files (`main.py`, `App.jsx`, `schema.prisma`), identifying undocumented REST API endpoints, and locating environment variable dependencies (`DATABASE_URL`, `JWT_SECRET`). README files are frequently stale or non-existent.
3. **Collaboration & Context Fragmentation:** Sprint discussions, code walkthroughs, and pair-programming sessions occur in standalone video conferencing applications (Zoom, Microsoft Teams, Google Meet), isolated from repository codebases. Developers incur severe context-switching costs alternating between browser tabs, terminals, and external meeting windows.
4. **Complex Remote Push Infrastructure:** Sharing and pushing code across distributed machines or local networks often requires centralized proprietary platform accounts or intricate server-side Git daemon configuration rather than seamless, self-hosted dynamic provisioning.

---

## 5. Problem Addressed

| Problem Dimension | Description & Impact |
| :--- | :--- |
| **Vocabulary Mismatch in Discovery** | Developers searching by functional intent fail to locate repositories because search engines match exact keywords rather than semantic concepts. |
| **High Latency & Disk/Bandwidth Overhead** | Developers must clone full codebases just to evaluate architectural patterns, dependencies, and API endpoints, consuming gigabytes of disk and network bandwidth. |
| **Codebase Comprehension Gap** | Traditional repository summaries are shallow or purely README-based, failing to explain internal source file roles, API routes, or environment variable requirements. |
| **Disconnected Communication Workspaces** | Code reviews, pair programming, and debugging meetings are decoupled from code repositories, leading to context loss and high switching latency. |
| **Bug Auditing & Contributor Friction** | First-time contributors struggle to audit bug patterns, trace logic flaws, or run unfamiliar code snippets in safe, isolated sandboxes. |

---

## 6. Brief Description of the Invention

**RepoSense** is an integrated full-stack intelligence and collaboration platform that addresses these limitations through four tightly integrated subsystems:

1. **AI Semantic Discovery & Dynamic Reranking Subsystem:**
   Encodes natural language user queries and repository composite metadata into 384-dimensional dense vectors using a pre-trained Sentence-Transformer (`all-MiniLM-L6-v2`) and ChromaDB vector store. Employs a hybrid scoring algorithm that combines semantic cosine similarity with logarithmic community adoption metrics (stars) and lexical name-boosting.
2. **Zero-Clone Deep Architectural Inference Engine:**
   Recursively traverses remote repository trees (inspecting up to 500 files) via GitHub REST APIs without disk cloning. Samples key source entrypoints and configuration manifests (`package.json`, `requirements.txt`, `Cargo.toml`), parses REST API routes and environment variables via AST/regex, and uses a locally hosted Large Language Model (Llama 3 8B via Ollama) to synthesize deep architectural breakdowns, file role walkthroughs, and installation guides.
3. **Autonomous AI Code Agent Studio & Execution Sandbox:**
   Features an isolated subprocess execution sandbox enforcing strict time limits ($\Delta t_{\text{max}} = 5.0\text{s}$) and memory constraints to safely run Python/JavaScript code snippets. Features an autonomous AI agent capable of vulnerability auditing, logic explanation, code refactoring, and automated Unified Diff patch generation.
4. **In-Context Video Collaboration Hub & Self-Hosted Git VCS Server:**
   Embeds the Zoom Web Client SDK (`ZoomRoom.jsx`) directly beside repository code and the AI Agent Studio, enabling zero-install video, audio, and screen sharing. Complemented by an HTTP Smart-Git Version Control Gateway that intercepts `git push` payloads to dynamically initialize bare repositories on-the-fly over Wi-Fi LAN and Cloudflare WAN tunnels.

```
+-----------------------------------------------------------------------------------+
|                            REPOSENSE PLATFORM ARCHITECTURE                        |
+-----------------------------------------------------------------------------------+
|                                                                                   |
|  [ User Browser: React 18 + Vite + Custom CSS Tokens ]                           |
|       |                                               |                           |
|       v (REST API)                                    v (Embedded Web SDK)        |
|  +-------------------------------------+       +-------------------------------+  |
|  |     FastAPI Backend Server (:8000)  |       |   Zoom Web Client SDK Viewport|  |
|  +-------------------------------------+       |   (Side-by-Side Dual Studio)  |  |
|     |            |             |               +-------------------------------+  |
|     |            |             |                              |                   |
|     v            v             v                              v                   |
|  [ChromaDB]  [Ollama LLM]  [Subprocess Sandbox]        [Zoom Video Servers]       |
|  VectorStore  (Llama 3 8B)   (Isolated Runner)                                    |
|     |                                                                             |
|     +--------> [Smart-Git HTTP Gateway] ----> [Dynamic Bare Repositories]         |
|     +--------> [GitHub REST v3 API] --------> [Recursive Remote Tree Harvesting]  |
+-----------------------------------------------------------------------------------+
```

---

## 7. Novel Features & Inventive Aspects

### A. Dual-Stage Semantic Vector Search with Hybrid Reranking
- Maps queries and documents into a shared latent metric space $\mathbb{R}^d$ ($d=384$).
- Employs a custom hybrid objective function $\mathcal{R}(Q, D_i)$ balancing semantic cosine similarity $\mathcal{S}_{\text{semantic}}(Q, D_i)$ with a logarithmic dampening of repository stargazers:
  $$\mathcal{R}(Q, D_i) = \alpha \cdot \mathcal{S}_{\text{semantic}}(Q, D_i) + (1 - \alpha) \cdot \log_{10}\Big(1 + \text{Stars}(D_i)\Big)$$
  where $\alpha = 0.75$.
- Incorporates dynamic name-boosting heuristics ($+0.8$ exact match, $+0.4$ partial match) to maintain precise retrieval when specific project names are queried.

### B. Zero-Clone Deep Multi-File Architectural Inference
- Reconstructs remote file trees up to a depth of 500 files via `git/trees?recursive=1` without performing `git clone` or allocating disk storage.
- Automatically analyzes dependency manifests ($\mathcal{M} = \{\text{package.json}, \text{requirements.txt}, \text{Cargo.toml}\}$), identifies architectural layout patterns (Full-Stack Decoupled, Monorepo, Microservice), and surfaces:
  - Exported symbols, line counts, and functional roles for critical files.
  - REST API endpoint routes (e.g., `GET /search`, `POST /summarize-github`).
  - Required environment variable configurations (`DATABASE_URL`, `JWT_SECRET`).

### C. Sandboxed Autonomous AI Code Agent & Differential Patch Engine
- Dispatches user source code $C_{\text{input}}$ into an isolated worker process with strict timeouts ($\Delta t_{\text{max}} = 5.0\text{s}$), capturing standard output $O_{\text{stdout}}$, standard error $O_{\text{stderr}}$, runtime duration $\Delta t$, and exit code $c_{\text{exit}}$.
- Converts bug detection and refactoring transformations into standard Unified Diff patches:
  $$\Delta P = \text{Diff}\Big(C_{\text{input}}, C_{\text{modified}}\Big)$$
  allowing one-click export into pull-request ready format.

### D. Embedded In-App Zoom Meeting Collaboration Hub
- Integrates the Zoom Meeting Web Client directly within the web application viewport (`zoom.us/wc/{meeting_id}/join`), removing the requirement for standalone desktop client installations.
- Automatically provisions 10-digit meeting IDs, dynamic secure passcodes, and shareable join links.
- Implements a concurrent **Dual-Workspace Studio** featuring synchronous video calls and screen sharing side-by-side with live code execution and AI refactoring.

### E. On-Demand Dynamic Bare Git Provisioning over HTTP Smart Protocol
- The HTTP Smart-Git gateway intercepts Git transport requests directed at non-existent paths (`/git/developer/<repo_name>.git`).
- Automatically initiates `git init --bare`, unpacks packfiles, and updates branch refs on the fly upon the first `git push origin main`, operating across both LAN (`http://192.168.x.x:8000`) and Cloudflare WAN tunnels.

---

## 8. Mathematical & Algorithmic Formulations

### Algorithm 1: Semantic Search with Hybrid Reranking
```text
Input: User query q, candidate count k, hyperparameter alpha = 0.75
Output: Ranked repository list R

1. v_q <- SentenceTransformer.Encode(q)
2. Candidates <- ChromaDB.Query(v_q, top_k = 20)
3. For each candidate D_i in Candidates:
4.     sim <- CosineSimilarity(v_q, v_{D_i})
5.     score <- alpha * sim + (1 - alpha) * log10(1 + D_i.stars)
6.     If ExactMatch(q, D_i.name):
7.         score <- score + 0.8
8.     Else If PartialMatch(q, D_i.name):
9.         score <- score + 0.4
10.    D_i.final_score <- score
11. R <- Sort Candidates by final_score descending
12. Return R[1 ... k]
```

### Algorithm 2: Zero-Clone Deep Multi-File Analysis
```text
Input: Repository URL u
Output: Structured Architectural Summary S

1. Tree <- FetchRecursiveTree(u, depth = 500)
2. SourceFiles <- FilterSourceFiles(Tree, limit = 50)
3. FileRoles <- {}, Routes <- {}, EnvVars <- {}
4. For each file f in SourceFiles:
5.     Content <- FetchRawContent(f)
6.     FileRoles <- FileRoles U AnalyzeFileRole(f, Content)
7.     Routes    <- Routes U ExtractAPIRoutes(Content)
8.     EnvVars   <- EnvVars U ExtractEnvVars(Content)
9. Context <- Format(Tree, FileRoles, Routes, EnvVars, Readme)
10. S <- LLM_Inference(Prompt_Architecture + Context)
11. Return S
```

---

## 9. Advantages over Existing Solutions

| Dimension | Existing Platforms (GitHub / GitLab / Sourcegraph) | RepoSense Platform | Measurable Advantage |
| :--- | :--- | :--- | :--- |
| **Search Relevancy** | Keyword / BM25 lexical matching; vulnerable to vocabulary mismatch | Dense vector embeddings (`all-MiniLM-L6-v2`) + ChromaDB | **Mean Reciprocal Rank (MRR) of 0.91 vs. 0.51** (**104.7% improvement**; P@3: 0.86 vs. 0.42) |
| **Codebase Evaluation** | Manual `git clone` (hundreds of MBs/GBs), manual file inspection | Zero-Clone multi-file recursive inspection + Llama 3 8B inference | Assessment time reduced from **1.2 min to 18 sec** (**74% reduction in onboarding time**; 99.1% schema compliance) |
| **API & Config Extraction** | Manual code tracing across directories | Automated regex/AST extraction of REST routes and required env vars | Automatic discovery of endpoints and configuration keys without code execution |
| **Interactive Code Auditing** | External IDE / offline linter setup required | In-app isolated subprocess sandbox ($\le 5\text{s}$) with Unified Diff output | Instant execution feedback and pull-request ready diff patches |
| **Collaboration Locality** | Standalone apps (Zoom, Teams, Meet) outside repository | In-app embedded Zoom Meeting SDK side-by-side with code & AI Agent | Context-switching transition time reduced from **42 sec to < 3 sec** (~280 ms connection latency) |
| **Version Control Hosting** | Manual web portal creation, SSH key configuration | Self-hosted HTTP Smart-Git Gateway with instant on-demand bare repo init | Zero-configuration remote push over local Wi-Fi or public tunnels |
| **Cost & Privacy** | Expensive cloud LLM API tokens, potential code leakage | Locally hosted, quantized models (Llama 3 8B via Ollama) | Zero API token fees; private, on-premise execution capability |

---

## 10. Commercial & Practical Applications
- **Open-Source Discovery Portals:** Next-generation package and repository indexing systems for enterprises and developer communities.
- **Enterprise Codebase Onboarding:** Rapid developer orientation for large monorepos and distributed microservice architectures.
- **Educational & University Labs:** Integrated pair programming, lab submission verification, and video code walkthroughs without third-party tool overhead.
- **Automated Security Auditing & PR Automation:** Instant vulnerability triage and differential patch generation for open-source maintainers.

---
*Document prepared for patent filing, institutional documentation, research grant submissions, and academic technical reports.*
