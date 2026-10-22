# RepoSense — Academic A3 Project & Research Poster Guide

This document accompanies the newly generated print-ready **[a3_poster.html](file:///d:/projects/major%20project/RepoSense-Intelligent-Repository-Discovery-and-Collaboration-Platform/a3_poster.html)** for **RepoSense: Intelligent Repository Discovery and Collaboration Platform**.

---

## 1. Quick Start: How to View and Print the Poster

### Option A: Open directly in your Web Browser
1. Double-click or open `a3_poster.html` in **Google Chrome**, **Microsoft Edge**, or **Brave**.
   - Path: `d:\projects\major project\RepoSense-Intelligent-Repository-Discovery-and-Collaboration-Platform\a3_poster.html`
2. You will see an interactive top toolbar:
   - **🖨️ Print / Save A3 PDF**: Automatically triggers the print dialog configured for standard A3 paper.
   - **📐 Switch to Portrait / Landscape**: Switches the layout between standard ISO A3 Landscape ($420\text{mm} \times 297\text{mm}$) and A3 Portrait ($297\text{mm} \times 420\text{mm}$).
   - **🎨 Academic Light / Cyber Dark**: Toggles between high-contrast light mode (ideal for physical paper printing to save ink) and cyber dark mode (ideal for digital screens/projectors).
   - **🔍 Zoom Controls (`-`, `+`, `Fit`)**: Zoom dynamically to inspect cards, math formulas, and diagrams at 100% scale.

### Option B: Exporting / Printing to PDF at 300 DPI A3 Quality
When you click **Print / Save A3 PDF** (or press `Ctrl + P` / `Cmd + P`):
1. **Destination**: Select **Save as PDF** (or your high-resolution plotter / color printer).
2. **Paper size**: Choose **A3** (if A3 is not visible, select *More settings* $\rightarrow$ Paper size $\rightarrow$ A3).
3. **Layout**: **Landscape** (or Portrait if you toggled to portrait).
4. **Margins**: Set to **None** (the CSS has built-in $10\text{mm}$ safety margins).
5. **Options**: Check **Background graphics** so gradients, badges, and cards render crisply.
6. Click **Save**.

---

## 2. Complete Content Breakdown

### Masthead / Header
- **Title**: RepoSense: Intelligent Repository Discovery & Collaboration Platform
- **Subtitle**: A Unified Semantic Vector Retrieval, Zero-Clone Architectural Inference, Autonomous AI Code Agent, and Integrated Video Collaboration Ecosystem
- **Authors**: Sai Sarvesh R, Shashidhar N S, Priyanshu Kumar, Suhan Ganesh
- **Guide**: Under the Guidance of Naveen B M (Assistant Professor)
- **Institution**: Department of Computer Science and Engineering, RNS Institute of Technology, Bengaluru, India

---

### Section 1: The Problem (Structural Gaps in Existing Platforms)
Current platforms (GitHub, GitLab, Bitbucket) exhibit 5 critical deficiencies:
1. **Vocabulary Mismatch in Discovery**: Lexical search (BM25) relies on exact string matches. A query for *"task runner"* will miss projects tagged as *"pipeline orchestrator"*.
2. **Heavyweight Onboarding Overhead**: Developers must clone gigabytes of code to local disk just to understand whether a repository fits their requirements.
3. **Shallow Documentation & Comprehension Gap**: README files are frequently out-of-date, omitting exported REST API routes, environment variables (`DATABASE_URL`, `JWT_SECRET`), and internal module relationships.
4. **Collaboration Locality & Context Switching**: Video meetings (Zoom/Teams) happen outside the repository interface, causing friction and cognitive context switching costs (~42 seconds per switch).
5. **Contributor Sandboxing & Remote Push Hurdles**: Unsafe execution of unfamiliar open-source code and complicated server configuration for multi-laptop Git pushes.

---

### Section 2: Mathematical Formulations & Algorithms
- **Semantic Vector Similarity**:
  $$\mathcal{S}_{\text{semantic}}(Q, D_i) = \frac{\vec{v}_Q \cdot \vec{v}_{D_i}}{\|\vec{v}_Q\|_2 \|\vec{v}_{D_i}\|_2}$$
  Mapped into a 384-dimensional latent embedding space via Sentence-Transformers (`all-MiniLM-L6-v2`).
- **Hybrid Objective Reranking Model**:
  $$\mathcal{R}(Q, D_i) = \alpha \cdot \mathcal{S}_{\text{semantic}}(Q, D_i) + (1 - \alpha) \cdot \log_{10}\Big(1 + \text{Stars}(D_i)\Big) + \beta_{\text{boost}}$$
  Balancing semantic relevancy ($\alpha = 0.75$) with historical community adoption while rewarding exact name matches ($\beta_{\text{exact}} = +0.8, \beta_{\text{partial}} = +0.4$).
- **Differential Patch Generation**:
  $$\Delta P = \text{Diff}(C_{\text{input}}, C_{\text{modified}})$$
  Enforcing an execution sandbox limit ($\Delta t_{\text{max}} \le 5.0\text{s}$) with automated Unified Diff output.

---

### Section 3: The End-to-End Execution Pipeline (6 Stages)
1. **Stage 1 (Query Ingestion)**: Natural language query entered into the React frontend and passed via REST API to FastAPI.
2. **Stage 2 (Dense Vector Encoding & HNSW Search)**: `all-MiniLM-L6-v2` encodes query into $\mathbb{R}^{384}$; candidate repositories fetched from ChromaDB.
3. **Stage 3 (Hybrid Reranking)**: Combines cosine similarity with log star engagement and exact-name heuristics.
4. **Stage 4 (Zero-Clone Remote Tree Harvesting)**: Uses GitHub REST v3 recursive tree queries (`depth=500`) to inspect files, routes, and configs without local cloning.
5. **Stage 5 (Local LLM Architectural Inference)**: Locally hosted, quantized Llama 3 (8B) analyzes file roles, REST routes, and directory layouts.
6. **Stage 6 (Dual Studio & Sandboxed Video Hub)**: Isolated subprocess code runner ($\Delta t \le 5\text{s}$) concurrent with embedded Zoom meeting rooms and on-demand Smart-Git HTTP gateway.

---

### Section 4: System Architecture & Structure (Layered Breakdown)
- **Layer 1: Client & Presentation (React 18 + Vite)**
  - Semantic Search Explorer
  - AI Code Agent Studio & Unified Diff Viewer
  - In-App Zoom Web Client SDK Viewport
- **Layer 2: API Gateway & Core Services (FastAPI - Python 3.11)**
  - Dynamic Reranker Service
  - Zero-Clone Multi-File Harvesting Engine
  - Smart-Git HTTP Transport Protocol Gateway
- **Layer 3: AI Models & Persistence Layer**
  - ChromaDB HNSW Vector Store
  - Sentence-Transformers (`all-MiniLM-L6-v2`)
  - Ollama Engine with Llama 3 (8B Quantized)
  - Isolated Subprocess Execution Sandbox

---

### Section 5: The Proposed Solution (The 4 Integrated Pillars)
1. **Pillar I — Dense Semantic Vector Retrieval**: Resolves lexical brittleness with transformer embeddings.
2. **Pillar II — Zero-Clone Architectural Inference**: Parses ASTs, dependencies, and REST routes directly from remote trees in 18 seconds.
3. **Pillar III — Sandboxed AI Code Agent & Patch Generator**: Instant bug auditing, memory leak detection, and PR-ready Unified Diffs.
4. **Pillar IV — In-App Zoom Video Hub & Smart-Git Remote Server**: Synchronous video collaboration side-by-side with code and instant bare Git provisioning.

---

### Section 6: Experimental Results & Benchmarks

| Metric / Dimension | Traditional Baseline (GitHub) | RepoSense Platform | Measurable Gain |
| :--- | :--- | :--- | :--- |
| **Search Relevancy (MRR)** | 0.51 (Lexical BM25) | **0.91** (Semantic + Rerank) | **+104.7% improvement** |
| **Precision@3 (P@3)** | 0.42 | **0.86** | **+104.8% precision** |
| **Codebase Evaluation Time** | 1.2 min (manual clone & inspect) | **18 seconds** (Zero-Clone AI) | **74% time reduction** |
| **Schema Compliance** | N/A | **99.1%** | Verified across 100 repositories |
| **Video Context Switching** | 42 seconds (external app) | **< 3 seconds** (embedded Zoom) | **92.8% reduction** |
| **Video Room Init Latency** | N/A | **~280 ms** | Instant session creation |
| **API Token Costs & Privacy** | Paid Cloud LLM APIs | **$0.00 / Local On-Premise** | Complete source privacy |

---

## 3. Presentation & Viva Voce Tips
- **Pointing to Problem vs. Solution**: Use Column 1 to demonstrate the five structural pain points of GitHub/GitLab, then immediately point to Column 3 to show how RepoSense's 4 pillars solve each pain point directly.
- **Explaining the Pipeline**: Walk the evaluators through Steps 1 to 6 in Column 2. Highlight that **Zero-Clone** means the developer never has to run `git clone` or waste gigabytes of disk space to evaluate a repository.
- **Demonstrating the Architecture**: Point to the 3-tier diagram in the center column. Emphasize that all AI runs **locally** using Ollama (Llama 3 8B) and SentenceTransformers, meaning zero cloud API costs and 100% intellectual property privacy.
- **Emphasizing Numbers**: Highlight the **0.91 MRR (+104.7%)** and **18 seconds onboarding time (74% faster)**.
