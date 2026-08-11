import requests
import json
import re

class RepoSummarizer:
    def __init__(self, ollama_url="http://localhost:11434"):
        self.ollama_url = ollama_url
        self.model = "llama3:8b"
    
    def generate_summary(self, analysis_data):
        """
        Generates a structured summary of the repository.
        Tries local Ollama LLM if available; otherwise uses deep repo content analysis.
        """
        # Call Ollama API if connected
        try:
            prompt = self._build_prompt(analysis_data)
            response = requests.post(
                f"{self.ollama_url}/api/generate",
                json={
                    "model": self.model,
                    "prompt": prompt,
                    "stream": False,
                    "format": "json"
                },
                timeout=5
            )
            
            if response.status_code == 200:
                result = response.json()
                response_text = result.get('response', '')
                try:
                    return json.loads(response_text)
                except json.JSONDecodeError:
                    return self._extract_json(response_text)
        except (requests.exceptions.ConnectionError, requests.exceptions.Timeout):
            print("[INFO] Ollama LLM unavailable. Performing deep repository content analysis.")
        except Exception as e:
            print(f"[WARN] Error invoking Ollama: {str(e)}. Falling back to content analysis.")

        # Perform intelligent repo content analysis based on actual codebase contents
        return self._generate_intelligent_summary(analysis_data)

    def _generate_intelligent_summary(self, analysis_data):
        """
        Analyzes the repository contents (README markdown, description, config files, topics, file tree)
        to extract what the project is doing and generate a detailed summary.
        """
        repo_name = analysis_data.get('name', 'This project')
        description = analysis_data.get('description', '')
        readme = analysis_data.get('readme_content', '')
        file_tree = analysis_data.get('file_tree', [])
        config_files = analysis_data.get('config_files', {})
        tech_stack = list(set(analysis_data.get('tech_stack', [])))
        topics = analysis_data.get('topics', [])
        language = analysis_data.get('language', '')
        dependencies = analysis_data.get('dependencies', [])

        if language and language != 'Unknown' and language not in tech_stack:
            tech_stack.insert(0, language)

        # --- 1. Purpose Analysis ---
        purpose_parts = []
        if description and description != 'No description provided':
            purpose_parts.append(description.strip())
        
        # Clean README to find the lead paragraph
        clean_readme = self._clean_readme_markdown(readme)
        lead_para = self._extract_lead_paragraph(clean_readme, repo_name)
        if lead_para and lead_para not in purpose_parts:
            purpose_parts.append(lead_para)

        if topics:
            purpose_parts.append(f"Key topics & focus areas: {', '.join(topics[:6])}.")

        if purpose_parts:
            purpose = " ".join(purpose_parts[:2])
            if len(purpose) > 400:
                purpose = purpose[:397] + "..."
        else:
            purpose = f"{repo_name} is a software project built with {', '.join(tech_stack[:3]) if tech_stack else 'modern technologies'}."

        # --- 2. How To Run Analysis ---
        how_to_run = self._extract_run_instructions(readme, config_files, tech_stack)

        # --- 3. Architecture Analysis ---
        architecture = self._analyze_architecture(file_tree, config_files, tech_stack)

        # --- 4. Key Components Analysis ---
        key_components = self._analyze_key_components(file_tree, repo_name)

        # --- 5. Difficulty Level ---
        difficulty = self._assess_difficulty(file_tree, tech_stack, dependencies)

        # --- 6. Best For Target Audience ---
        best_for = self._determine_best_for(repo_name, tech_stack, topics, purpose)

        # --- 7. Contributing Guide ---
        contributing_guide = self._extract_contributing_guide(readme, file_tree)

        return {
            "purpose": purpose,
            "tech_stack": tech_stack if tech_stack else ["Software Development"],
            "how_to_run": how_to_run,
            "architecture": architecture,
            "key_components": key_components,
            "dependencies": dependencies[:12] if dependencies else ["Core package modules"],
            "license": analysis_data.get('license', 'Not specified'),
            "difficulty": difficulty,
            "best_for": best_for,
            "contributing_guide": contributing_guide
        }

    def _clean_readme_markdown(self, readme):
        """Strips badges, HTML tags, images, and empty markdown headers."""
        if not readme or readme == "No README found":
            return ""
        # Remove badges & images ![...](...) or <img ...>
        text = re.sub(r'!\[.*?\]\(.*?\)', '', readme)
        text = re.sub(r'<img.*?>', '', text, flags=re.IGNORECASE)
        # Remove badges HTML <a href=...><img ...></a>
        text = re.sub(r'<a.*?><img.*?></a>', '', text, flags=re.IGNORECASE)
        # Remove HTML tags
        text = re.sub(r'<.*?>', '', text)
        return text

    def _extract_lead_paragraph(self, clean_readme, repo_name):
        """Extracts first meaningful paragraph from README after titles"""
        if not clean_readme:
            return ""
        lines = clean_readme.split('\n')
        paragraphs = []
        curr = []
        for line in lines:
            line_str = line.strip()
            if line_str.startswith('#') or line_str.startswith('===') or line_str.startswith('---'):
                if curr:
                    paragraphs.append(" ".join(curr))
                    curr = []
            elif line_str:
                curr.append(line_str)
            else:
                if curr:
                    paragraphs.append(" ".join(curr))
                    curr = []
        if curr:
            paragraphs.append(" ".join(curr))

        for p in paragraphs:
            # Skip short badge lines or markdown link lists
            if len(p) > 30 and not p.startswith('[') and not p.startswith('http'):
                return p[:300]
        return ""

    def _extract_run_instructions(self, readme, config_files, tech_stack):
        """Extracts run instructions from README or package scripts"""
        # Check package.json scripts first
        if 'package.json' in config_files:
            try:
                pkg_data = json.loads(config_files['package.json'])
                scripts = pkg_data.get('scripts', {})
                run_steps = ["1. Run `npm install` to install dependencies."]
                if 'dev' in scripts:
                    run_steps.append("2. Run `npm run dev` to start the development server.")
                elif 'start' in scripts:
                    run_steps.append("2. Run `npm start` to run the application.")
                elif 'build' in scripts:
                    run_steps.append("2. Run `npm run build` to compile the project.")
                if len(run_steps) > 1:
                    return "\n".join(run_steps)
            except:
                pass

        # Check README sections
        if readme and readme != "No README found":
            run_match = re.search(r'(?i)(?:#+|\*\*|\b)(getting started|installation|quick start|how to run|usage|setup|running)\b(.*?)(?=\n#+|\n\*\*|\Z)', readme, re.DOTALL)
            if run_match:
                extracted = run_match.group(2).strip()
                if len(extracted) > 30:
                    # Clean up code blocks or return trimmed text
                    lines = [line.strip() for line in extracted.split('\n') if line.strip() and not line.strip().startswith('```')]
                    return "\n".join(lines[:8])

        # Fallback based on tech stack
        if any(t in ['Python', 'FastAPI', 'Flask', 'Django'] for t in tech_stack):
            return "1. Clone repository.\n2. Run `pip install -r requirements.txt`.\n3. Run entrypoint script (`python main.py` or `uvicorn`)."
        elif any(t in ['Node.js', 'React', 'Vue.js', 'Next.js'] for t in tech_stack):
            return "1. Clone repository.\n2. Run `npm install`.\n3. Run `npm run dev` or `npm start`."
        elif 'Rust' in tech_stack:
            return "1. Clone repository.\n2. Run `cargo build`.\n3. Run `cargo run`."
        elif 'Go' in tech_stack:
            return "1. Clone repository.\n2. Run `go run main.go`."
        
        return "1. Clone repository.\n2. Install dependencies based on configuration files.\n3. Follow setup commands in README."

    def _analyze_architecture(self, file_tree, config_files, tech_stack):
        """Infers system architecture from directory layout and configs"""
        tree_paths = [item['name'].lower() for item in file_tree]
        
        is_monorepo = 'packages' in tree_paths or 'lerna.json' in config_files
        has_frontend = any(p in tree_paths for p in ['frontend', 'client', 'web', 'ui', 'src'])
        has_backend = any(p in tree_paths for p in ['backend', 'server', 'api', 'services'])
        has_docker = 'dockerfile' in [p.lower() for p in config_files.keys()] or 'docker-compose.yml' in [p.lower() for p in config_files.keys()]

        arch_desc = []
        if is_monorepo:
            arch_desc.append("Monorepo architecture organizing workspace modules into distinct package sub-directories.")
        elif has_frontend and has_backend:
            arch_desc.append("Full-stack client-server architecture with decoupled frontend and backend services.")
        elif 'src' in tree_paths:
            arch_desc.append("Modular single-repository layout with core application logic housed in `src/`.")
        else:
            arch_desc.append("Standard repository organization with top-level entrypoints and modules.")

        if has_docker:
            arch_desc.append("Includes Docker containerization configuration for deployment and local execution.")

        return " ".join(arch_desc)

    def _analyze_key_components(self, file_tree, repo_name):
        """Maps file tree directories to meaningful component roles"""
        directories = [item['name'] for item in file_tree if item['type'] == 'tree'][:10]
        
        role_map = {
            'src': 'Core source code and application logic',
            'packages': 'Sub-packages and modular libraries',
            'components': 'Reusable UI components',
            'pages': 'Application routing and page views',
            'api': 'REST / GraphQL API endpoints and backend routes',
            'backend': 'Backend server application & database integration',
            'frontend': 'Frontend user interface application',
            'services': 'Business logic services & integrations',
            'utils': 'Helper utilities and shared functions',
            'docs': 'Documentation and project guides',
            'tests': 'Automated test suite and integration specs',
            'test': 'Test suite and test fixtures',
            'scripts': 'Build, automation, and setup scripts',
            'public': 'Static assets and public web files',
            'config': 'Configuration files and environment settings'
        }

        components = []
        for d in directories:
            d_lower = d.lower()
            role = role_map.get(d_lower, f"Module folder containing `{d}` functionality")
            components.append(f"`{d}/`: {role}")

        if not components:
            components = [
                "`src/`: Primary source code and logic",
                "`config/`: Application settings and configuration"
            ]

        return components[:8]

    def _assess_difficulty(self, file_tree, tech_stack, dependencies):
        """Calculates project contribution difficulty based on complexity"""
        score = 0
        if len(file_tree) > 20: score += 1
        if len(dependencies) > 10: score += 1
        if any(t in ['C++', 'Rust', 'Go', 'Assembly'] for t in tech_stack): score += 1
        if any(item['name'].lower() == 'packages' for item in file_tree): score += 1

        if score == 0:
            return "Beginner"
        elif score <= 2:
            return "Intermediate"
        else:
            return "Advanced"

    def _determine_best_for(self, repo_name, tech_stack, topics, purpose):
        """Determines best target audience based on domain and tech stack"""
        if topics:
            top_str = ", ".join(topics[:3])
            return f"Developers and teams interested in {top_str} and {tech_stack[0] if tech_stack else 'modern software'}."
        elif tech_stack:
            return f"Software engineers working with {', '.join(tech_stack[:2])} looking to integrate or learn from {repo_name}."
        else:
            return f"Developers looking to explore and contribute to open source {repo_name} projects."

    def _extract_contributing_guide(self, readme, file_tree):
        """Extracts contributing section from README or file tree"""
        tree_files = [item['name'].lower() for item in file_tree]
        if 'contributing.md' in tree_files:
            return "Refer to the dedicated `CONTRIBUTING.md` file in the repository root for detailed pull request guidelines."
        
        if readme and readme != "No README found":
            contrib_match = re.search(r'(?i)(?:#+|\*\*|\b)(contributing|contribution|how to contribute)\b(.*?)(?=\n#+|\n\*\*|\Z)', readme, re.DOTALL)
            if contrib_match:
                extracted = contrib_match.group(2).strip()
                if len(extracted) > 20:
                    return extracted[:300]

        return "Check open issues for 'good first issue' or 'help wanted' tags, fork the repo, and submit a pull request with unit tests."

    def _build_prompt(self, analysis_data):
        """Build a detailed prompt for the LLM"""
        prompt = f"""You are an expert software architect. Analyze the following repository information and generate a comprehensive structured summary.

REPOSITORY ANALYSIS DATA:

READ ME CONTENT:
{analysis_data.get('readme_content', 'No README found')[:3000]}

LICENSE:
{analysis_data.get('license', 'No license found')[:1000]}

FOLDER STRUCTURE:
{json.dumps([item['name'] for item in analysis_data.get('file_tree', [])], indent=2)[:2000]}

TECH STACK DETECTED:
{', '.join(analysis_data.get('tech_stack', []))}

TOPICS:
{', '.join(analysis_data.get('topics', []))}

DEPENDENCIES:
{chr(10).join(analysis_data.get('dependencies', []))[:1000]}

Generate a JSON response with EXACTLY this structure (no additional text, only valid JSON):

{{
  "purpose": "A clear, concise description of what this project does and its main goal (2-3 sentences)",
  "tech_stack": ["list", "of", "technologies", "used"],
  "how_to_run": "Step-by-step instructions on how to set up and run this project",
  "architecture": "Overview of the project architecture and design patterns used",
  "key_components": ["list", "of", "main", "components", "and", "their", "purposes"],
  "dependencies": ["list", "of", "major", "dependencies"],
  "license": "License type if found, otherwise 'Not specified'",
  "difficulty": "Estimated difficulty to contribute (e.g. Beginner, Intermediate, Advanced)",
  "best_for": "Who this project is best for",
  "contributing_guide": "Brief summary on how to start contributing"
}}
"""
        return prompt

    def _extract_json(self, text):
        """Try to extract JSON from text that might contain additional content"""
        try:
            start = text.find('{')
            end = text.rfind('}') + 1
            if start != -1 and end > start:
                return json.loads(text[start:end])
        except:
            pass
        
        return {
            "purpose": "Analysis complete.",
            "tech_stack": [],
            "how_to_run": "Refer to README.",
            "architecture": "Standard layout.",
            "key_components": [],
            "dependencies": [],
            "license": "Unknown",
            "difficulty": "Intermediate",
            "best_for": "Developers",
            "contributing_guide": "Check repo issues."
        }
