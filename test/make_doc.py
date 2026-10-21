import docx
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.oxml import OxmlElement, parse_xml
from docx.oxml.ns import nsdecls, qn

def set_cell_background(cell, fill_hex):
    tcPr = cell._tc.get_or_add_tcPr()
    shd = parse_xml(f'<w:shd {nsdecls("w")} w:fill="{fill_hex}"/>')
    tcPr.append(shd)

def set_cell_margins(cell, top=100, bottom=100, left=150, right=150):
    tcPr = cell._tc.get_or_add_tcPr()
    tcMar = parse_xml(f'<w:tcMar {nsdecls("w")}><w:top w:w="{top}" w:type="dxa"/><w:bottom w:w="{bottom}" w:type="dxa"/><w:left w:w="{left}" w:type="dxa"/><w:right w:w="{right}" w:type="dxa"/></w:tcMar>')
    tcPr.append(tcMar)

def create_document():
    doc = docx.Document()

    # Page Margins
    for section in doc.sections:
        section.top_margin = Inches(0.8)
        section.bottom_margin = Inches(0.8)
        section.left_margin = Inches(0.8)
        section.right_margin = Inches(0.8)

    primary_color = RGBColor(15, 76, 129)    # Classic Deep Blue
    accent_color = RGBColor(30, 41, 59)      # Slate Dark
    text_color = RGBColor(51, 51, 51)        # Off-black

    # Title
    p_title = doc.add_paragraph()
    p_title.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r_title = p_title.add_run("INVENTION DISCLOSURE & TECHNICAL SPECIFICATION")
    r_title.bold = True
    r_title.font.name = "Calibri"
    r_title.font.size = Pt(22)
    r_title.font.color.rgb = primary_color

    # Subtitle
    p_sub = doc.add_paragraph()
    p_sub.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r_sub = p_sub.add_run("RepoSense: Semantic Repository Discovery, Zero-Clone Architecture Inference, AI Code Auditing & Integrated Collaboration")
    r_sub.font.name = "Calibri"
    r_sub.font.size = Pt(13)
    r_sub.font.italic = True
    r_sub.font.color.rgb = accent_color

    doc.add_paragraph().paragraph_format.space_after = Pt(12)

    def add_section_header(title):
        p = doc.add_paragraph()
        p.paragraph_format.space_before = Pt(14)
        p.paragraph_format.space_after = Pt(4)
        r = p.add_run(title)
        r.bold = True
        r.font.name = "Calibri"
        r.font.size = Pt(15)
        r.font.color.rgb = primary_color

        # Add a subtle border or line under heading
        p_line = doc.add_paragraph()
        p_line.paragraph_format.space_before = Pt(0)
        p_line.paragraph_format.space_after = Pt(6)
        r_line = p_line.add_run("―" * 58)
        r_line.font.size = Pt(8)
        r_line.font.color.rgb = RGBColor(200, 200, 200)

    # 1. Title
    add_section_header("1. Title of the Invention")
    p = doc.add_paragraph()
    p.add_run("RepoSense: An Intelligent Semantic Repository Discovery, Zero-Clone Architectural Inference, AI-Agent Auditing, and Integrated Developer Collaboration Platform").bold = True

    # 2. Inventors
    add_section_header("2. Inventors & Affiliations")
    inventors = [
        ("Sai Sarvesh R", "Dept. of Computer Science & Engineering, RNS Institute of Technology, Bengaluru, India"),
        ("Shashidhar N S", "Dept. of Computer Science & Engineering, RNS Institute of Technology, Bengaluru, India"),
        ("Priyanshu Kumar", "Dept. of Computer Science & Engineering, RNS Institute of Technology, Bengaluru, India"),
        ("Suhan Ganesh", "Dept. of Computer Science & Engineering, RNS Institute of Technology, Bengaluru, India"),
        ("Naveen B M", "Assistant Professor, Dept. of Computer Science & Engineering, RNS Institute of Technology, Bengaluru, India")
    ]
    t_inv = doc.add_table(rows=1, cols=2)
    t_inv.alignment = WD_TABLE_ALIGNMENT.CENTER
    t_inv.rows[0].cells[0].paragraphs[0].add_run("Inventor Name").bold = True
    t_inv.rows[0].cells[1].paragraphs[0].add_run("Affiliation & Department").bold = True
    set_cell_background(t_inv.rows[0].cells[0], "0F4C81")
    set_cell_background(t_inv.rows[0].cells[1], "0F4C81")
    t_inv.rows[0].cells[0].paragraphs[0].runs[0].font.color.rgb = RGBColor(255, 255, 255)
    t_inv.rows[0].cells[1].paragraphs[0].runs[0].font.color.rgb = RGBColor(255, 255, 255)

    for name, aff in inventors:
        row = t_inv.add_row()
        row.cells[0].paragraphs[0].add_run(name).bold = True
        row.cells[1].paragraphs[0].add_run(aff)
        set_cell_margins(row.cells[0], 80, 80, 100, 100)
        set_cell_margins(row.cells[1], 80, 80, 100, 100)

    # 3. Technical Field
    add_section_header("3. Technical Field of the Invention")
    p = doc.add_paragraph()
    p.add_run("This invention pertains generally to Artificial Intelligence (AI), Natural Language Processing (NLP), Semantic Information Retrieval, Software Engineering Tooling, Version Control Systems (VCS), and Collaborative Distributed Systems. More specifically, it relates to dense vector similarity search with dynamic popularity-reranking, zero-clone remote codebase AST/manifest extraction, sandboxed code execution with differential patch generation, and embedded in-app video conferencing co-located with version control sync.")

    # 4. Background & Prior Art
    add_section_header("4. Background of the Invention & Prior Art")
    p = doc.add_paragraph()
    p.add_run("Open-source software has become foundational infrastructure for global computing. Millions of developers and enterprises rely on publicly hosted repositories across platforms such as GitHub, GitLab, and Bitbucket. However, existing platforms exhibit structural deficiencies across the software lifecycle:\n\n"
              "• Lexical Brittleness: Current repository discovery relies on inverted indexing, BM25, and bag-of-words heuristics matched against repository titles, descriptions, and manual topic tags. When maintainers and developers use different terms for identical concepts (e.g., 'task runner' vs. 'pipeline orchestrator'), search fails due to vocabulary mismatch.\n"
              "• Heavyweight Onboarding & Codebase Triage: Evaluating prospective repositories requires downloading or cloning gigabytes of data to local disk, navigating complex multi-level folder structures, manually tracing entrypoint files (main.py, App.jsx, schema.prisma), identifying undocumented REST API endpoints, and locating environment variable dependencies (DATABASE_URL, JWT_SECRET).\n"
              "• Collaboration & Context Fragmentation: Sprint discussions, code walkthroughs, and pair-programming sessions occur in standalone video conferencing applications (Zoom, Microsoft Teams, Google Meet), isolated from repository codebases. Developers incur severe context-switching costs alternating between browser tabs, terminals, and external meeting windows.\n"
              "• Complex Remote Push Infrastructure: Sharing and pushing code across distributed machines or local networks often requires centralized proprietary platform accounts or intricate server-side Git daemon configuration rather than seamless, self-hosted dynamic provisioning.")

    # 5. Problem Addressed
    add_section_header("5. Problem Addressed")
    prob_table = doc.add_table(rows=1, cols=2)
    prob_table.alignment = WD_TABLE_ALIGNMENT.CENTER
    prob_table.rows[0].cells[0].paragraphs[0].add_run("Problem Dimension").bold = True
    prob_table.rows[0].cells[1].paragraphs[0].add_run("Description & Impact").bold = True
    set_cell_background(prob_table.rows[0].cells[0], "1E293B")
    set_cell_background(prob_table.rows[0].cells[1], "1E293B")
    prob_table.rows[0].cells[0].paragraphs[0].runs[0].font.color.rgb = RGBColor(255, 255, 255)
    prob_table.rows[0].cells[1].paragraphs[0].runs[0].font.color.rgb = RGBColor(255, 255, 255)

    problems = [
        ("Vocabulary Mismatch in Discovery", "Developers searching by functional intent fail to locate repositories because search engines match exact keywords rather than semantic concepts."),
        ("High Latency & Disk/Bandwidth Overhead", "Developers must clone full codebases just to evaluate architectural patterns, dependencies, and API endpoints, consuming gigabytes of disk and network bandwidth."),
        ("Codebase Comprehension Gap", "Traditional repository summaries are shallow or purely README-based, failing to explain internal source file roles, API routes, or environment variable requirements."),
        ("Disconnected Communication Workspaces", "Code reviews, pair programming, and debugging meetings are decoupled from code repositories, leading to context loss and high switching latency."),
        ("Bug Auditing & Contributor Friction", "First-time contributors struggle to audit bug patterns, trace logic flaws, or run unfamiliar code snippets in safe, isolated sandboxes.")
    ]
    for dim, desc in problems:
        row = prob_table.add_row()
        row.cells[0].paragraphs[0].add_run(dim).bold = True
        row.cells[1].paragraphs[0].add_run(desc)
        set_cell_margins(row.cells[0], 80, 80, 100, 100)
        set_cell_margins(row.cells[1], 80, 80, 100, 100)

    # 6. Brief Description of Invention
    add_section_header("6. Brief Description of the Invention")
    p = doc.add_paragraph()
    p.add_run("RepoSense is an integrated full-stack intelligence and collaboration platform that addresses these limitations through four tightly integrated subsystems:\n\n"
              "1. AI Semantic Discovery & Dynamic Reranking Subsystem: Encodes natural language user queries and repository composite metadata into 384-dimensional dense vectors using a pre-trained Sentence-Transformer (all-MiniLM-L6-v2) and ChromaDB vector store. Employs a hybrid scoring algorithm that combines semantic cosine similarity with logarithmic community adoption metrics (stars) and lexical name-boosting.\n"
              "2. Zero-Clone Deep Architectural Inference Engine: Recursively traverses remote repository trees (inspecting up to 500 files) via GitHub REST APIs without disk cloning. Samples key source entrypoints and configuration manifests (package.json, requirements.txt, Cargo.toml), parses REST API routes and environment variables via AST/regex, and uses a locally hosted Large Language Model (Llama 3 8B via Ollama) to synthesize deep architectural breakdowns, file role walkthroughs, and installation guides.\n"
              "3. Autonomous AI Code Agent Studio & Execution Sandbox: Features an isolated subprocess execution sandbox enforcing strict time limits (Δt_max = 5.0s) and memory constraints to safely run Python/JavaScript code snippets. Features an autonomous AI agent capable of vulnerability auditing, logic explanation, code refactoring, and automated Unified Diff patch generation.\n"
              "4. In-Context Video Collaboration Hub & Self-Hosted Git VCS Server: Embeds the Zoom Web Client SDK (ZoomRoom.jsx) directly beside repository code and the AI Agent Studio, enabling zero-install video, audio, and screen sharing. Complemented by an HTTP Smart-Git Version Control Gateway that intercepts git push payloads to dynamically initialize bare repositories on-the-fly over Wi-Fi LAN and Cloudflare WAN tunnels.")

    # 7. Novel Features / Inventive Aspects
    add_section_header("7. Novel Features / Inventive Aspects")
    p = doc.add_paragraph()
    p.add_run("A. Dual-Stage Semantic Vector Search with Hybrid Reranking\n").bold = True
    p.add_run("• Maps queries and documents into a shared latent metric space R^384.\n"
              "• Employs a custom hybrid objective function R(Q, D_i) balancing semantic cosine similarity S_semantic(Q, D_i) with a logarithmic dampening of repository stargazers:\n"
              "    R(Q, D_i) = α · S_semantic(Q, D_i) + (1 - α) · log10(1 + Stars(D_i))\n"
              "  where α = 0.75.\n"
              "• Incorporates dynamic name-boosting heuristics (+0.8 exact match, +0.4 partial match) to maintain precise retrieval when specific project names are queried.\n\n")

    p.add_run("B. Zero-Clone Deep Multi-File Architectural Inference\n").bold = True
    p.add_run("• Reconstructs remote file trees up to a depth of 500 files via git/trees?recursive=1 without performing git clone or allocating disk storage.\n"
              "• Automatically analyzes dependency manifests (package.json, requirements.txt, Cargo.toml), identifies architectural layout patterns (Full-Stack Decoupled, Monorepo, Microservice), and surfaces:\n"
              "    - Exported symbols, line counts, and functional roles for critical files.\n"
              "    - REST API endpoint routes (e.g., GET /search, POST /summarize-github).\n"
              "    - Required environment variable configurations (DATABASE_URL, JWT_SECRET).\n\n")

    p.add_run("C. Sandboxed Autonomous AI Code Agent & Differential Patch Engine\n").bold = True
    p.add_run("• Dispatches user source code C_input into an isolated worker process with strict timeouts (Δt_max = 5.0s), capturing standard output O_stdout, standard error O_stderr, runtime duration Δt, and exit code c_exit.\n"
              "• Converts bug detection and refactoring transformations into standard Unified Diff patches:\n"
              "    ΔP = Diff(C_input, C_modified)\n"
              "  allowing one-click export into pull-request ready format.\n\n")

    p.add_run("D. Embedded In-App Zoom Meeting Collaboration Hub\n").bold = True
    p.add_run("• Integrates the Zoom Meeting Web Client directly within the web application viewport (zoom.us/wc/{meeting_id}/join), removing the requirement for standalone desktop client installations.\n"
              "• Automatically provisions 10-digit meeting IDs, dynamic secure passcodes, and shareable join links.\n"
              "• Implements a concurrent Dual-Workspace Studio featuring synchronous video calls and screen sharing side-by-side with live code execution and AI refactoring.\n\n")

    p.add_run("E. On-Demand Dynamic Bare Git Provisioning over HTTP Smart Protocol\n").bold = True
    p.add_run("• The HTTP Smart-Git gateway intercepts Git transport requests directed at non-existent paths (/git/developer/<repo_name>.git).\n"
              "• Automatically initiates 'git init --bare', unpacks packfiles, and updates branch refs on the fly upon the first git push origin main, operating across both LAN (http://192.168.x.x:8000) and Cloudflare WAN tunnels.")

    # 8. Advantages over Existing Solutions
    add_section_header("8. Advantages over Existing Solutions")
    adv_table = doc.add_table(rows=1, cols=3)
    adv_table.alignment = WD_TABLE_ALIGNMENT.CENTER
    adv_table.rows[0].cells[0].paragraphs[0].add_run("Dimension").bold = True
    adv_table.rows[0].cells[1].paragraphs[0].add_run("Existing Solutions (GitHub / GitLab)").bold = True
    adv_table.rows[0].cells[2].paragraphs[0].add_run("RepoSense Platform").bold = True
    for c in adv_table.rows[0].cells:
        set_cell_background(c, "0F4C81")
        c.paragraphs[0].runs[0].font.color.rgb = RGBColor(255, 255, 255)

    advantages = [
        ("Search Relevancy", "Keyword / BM25 lexical matching; vulnerable to vocabulary mismatch", "Dense vector embeddings (all-MiniLM-L6-v2) + ChromaDB: MRR of 0.91 vs. 0.51 (104.7% improvement; P@3: 0.86 vs. 0.42)"),
        ("Codebase Evaluation", "Manual git clone (hundreds of MBs/GBs), manual file inspection", "Zero-Clone multi-file recursive inspection + Llama 3 8B inference: Assessment time reduced from 1.2 min to 18 sec (74% reduction)"),
        ("API & Config Extraction", "Manual code tracing across directories", "Automated regex/AST extraction of REST routes and required env vars without code execution"),
        ("Interactive Code Auditing", "External IDE / offline linter setup required", "In-app isolated subprocess sandbox (≤ 5s) with Unified Diff output and live stdout/stderr streams"),
        ("Collaboration Locality", "Standalone apps (Zoom, Teams) outside repository", "In-app embedded Zoom Meeting SDK side-by-side with code: Context-switching reduced from 42 sec to < 3 sec (~280 ms connection latency)"),
        ("Version Control Hosting", "Manual web portal creation, SSH key configuration", "Self-hosted HTTP Smart-Git Gateway with instant on-demand bare repo init over LAN or tunnels"),
        ("Cost & Privacy", "Expensive cloud LLM API tokens, potential code leakage", "Locally hosted, quantized models (Llama 3 8B via Ollama): Zero API token fees; private, on-premise execution")
    ]
    for dim, exist, repo in advantages:
        row = adv_table.add_row()
        row.cells[0].paragraphs[0].add_run(dim).bold = True
        row.cells[1].paragraphs[0].add_run(exist)
        row.cells[2].paragraphs[0].add_run(repo)
        for c in row.cells:
            set_cell_margins(c, 80, 80, 100, 100)

    # 9. Industrial & Commercial Applications
    add_section_header("9. Industrial & Practical Applications")
    p = doc.add_paragraph()
    p.add_run("• Enterprise Codebase Onboarding: Rapid developer orientation for large monorepos and distributed microservice architectures.\n"
              "• Open-Source Discovery Portals: Next-generation package and repository indexing systems for enterprises and developer communities.\n"
              "• Educational & University Laboratories: Integrated pair programming, lab submission verification, and video code walkthroughs without third-party tool overhead.\n"
              "• Automated Security Auditing & PR Automation: Instant vulnerability triage and differential patch generation for open-source maintainers.")

    output_path = r"d:\projects\major project\RepoSense-Intelligent-Repository-Discovery-and-Collaboration-Platform\RepoSense_Invention_Disclosure.docx"
    doc.save(output_path)
    print(f"Document successfully created at {output_path}")

if __name__ == "__main__":
    create_document()
