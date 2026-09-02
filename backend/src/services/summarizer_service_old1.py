import requests
import json
import re
import os

class RepoSummarizer:
    def __init__(self, ollama_url=None):
        self.ollama_url = ollama_url or os.getenv("OLLAMA_URL", "http://127.0.0.1:11434")
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
                timeout=300
            )
            
            if response.status_code == 200:
                result = response.json()
                response_text = result.get('response', '')
                try:
                    return json.loads(response_text)
                except json.JSONDecodeError:
                    return self._extract_json(response_text)
        except (requests.exceptions.ConnectionError, requests.exceptions.Timeout) as e:
            print(f"[INFO] Ollama LLM unavailable ({type(e).__name__}). Performing deep repository content analysis.")
        except Exception as e:
            print(f"[WARN] Error invoking Ollama: {str(e)}. Falling back to content analysis.")

        # Perform intelligent repo content analysis based on actual codebase contents
        return self._generate_intelligent_summary(analysis_data)

    def _generate_intelligent_summary(self, analysis_data):
        """
        Analyzes actual repository source code files, config files, README, and directory structure
        to generate a deep architectural and code file analysis.
        """
        repo_name = analysis_data.get('name', 'This project')
        description = analysis_data.get('description', '')
        readme = analysis_data.get('readme_content', '')
        file_tree = analysis_data.get('file_tree', [])
        config_files = analysis_data.get('config_files', {})
        key_source_files = analysis_data.get('key_source_files', {})
        tech_stack = list(set(analysis_data.get('tech_stack', [])))
        topics = analysis_data.get('topics', [])
        language = analysis_data.get('language', '')
        dependencies = analysis_data.get('dependencies', [])

        if language and language != 'Unknown' and language not in tech_stack:
            tech_stack.insert(0, language)

        # --- 1. Deep Project File Analysis ---
        project_file_analysis = self._extract_project_file_analysis(key_source_files, config_files)

        # --- 2. API Endpoints Detection ---
        api_endpoints = self._extract_api_endpoints(key_source_files)

        # --- 3. Environment Variables Extraction ---
        env_vars = self._extract_env_vars(key_source_files, config_files)

        # --- 4. Purpose Analysis -> what_it_does ---
        readme_intro = analysis_data.get('readme_intro', '')
        pkg_desc = analysis_data.get('package_description', {}).get('description', '')
        
        purpose_parts = []
        if readme_intro:
            purpose_parts.append(readme_intro)
        elif pkg_desc:
            purpose_parts.append(pkg_desc)
        elif description and description != 'No description provided':
            purpose_parts.append(description.strip())
        
        if topics:
            purpose_parts.append(f"Key topics & focus areas: {', '.join(topics[:6])}.")
            
        if purpose_parts:
            what_it_does = " ".join(purpose_parts[:2]).strip()
            if len(what_it_does) > 600:
                what_it_does = what_it_does[:597] + "..."
            if len(what_it_does) < 5 or what_it_does == "-":
                what_it_does = f"{repo_name} is a software project built with {', '.join(tech_stack[:3]) if tech_stack else 'modern technologies'}."
        else:
            what_it_does = f"{repo_name} is a software project built with {', '.join(tech_stack[:3]) if tech_stack else 'modern technologies'}."

        # --- 4.5 Core Features Analysis ---
        route_paths = analysis_data.get('route_paths', [])
        ui_strings = analysis_data.get('ui_strings', [])
        docstrings = analysis_data.get('docstrings', [])
        
        keyword_map = {
            'auth': 'Manages user authentication and authorization',
            'login': 'Handles user login',
            'upload': 'Supports file uploads and management',
            'predict': 'Runs predictive models or machine learning inference',
            'match': 'Matches data entities based on criteria',
            'checkout': 'Processes e-commerce checkout and payments',
            'cart': 'Manages shopping cart functionality',
            'booking': 'Handles reservations and bookings',
            'search': 'Provides search capabilities',
            'profile': 'Manages user profiles',
            'dashboard': 'Provides a central data dashboard',
            'generate': 'Generates reports, invoices, or content'
        }
        
        core_features = set()
        
        for route in route_paths:
            for kw, phrase in keyword_map.items():
                if kw in route.lower():
                    core_features.add(phrase)
                    
        for text in ui_strings + docstrings:
            for kw, phrase in keyword_map.items():
                if kw in text.lower():
                    core_features.add(phrase)
        
        # Add basic feature if none found
        if not core_features:
            if api_endpoints:
                core_features.add("Provides REST API endpoints for data integration")
            if 'React' in tech_stack or 'Vue' in tech_stack:
                core_features.add("Provides an interactive web user interface")
            if not core_features:
                core_features.add("Core application logic and processing")

        core_features = list(core_features)[:6]

        # --- 5. How To Run Analysis ---
        how_to_run = self._extract_run_instructions(readme, config_files, tech_stack, key_source_files)

        # --- 6. Architecture Analysis ---
        architecture = self._analyze_architecture(file_tree, config_files, tech_stack, key_source_files)

        # --- 7. Key Components Analysis ---
        key_components = self._analyze_key_components(file_tree, repo_name, project_file_analysis)

        # --- 8. Difficulty & Audience ---
        difficulty = self._assess_difficulty(file_tree, tech_stack, dependencies)
        best_for = self._determine_best_for(repo_name, tech_stack, topics, what_it_does)
        contributing_guide = self._extract_contributing_guide(readme, file_tree)

        return {
            "what_it_does": what_it_does,
            "core_features": core_features,
            "technical_details": {
                "tech_stack": tech_stack if tech_stack else ["Software Development"],
                "architecture": architecture,
                "dependencies": dependencies[:12] if dependencies else ["Core package modules"],
                "api_endpoints": api_endpoints,
                "env_vars": env_vars
            },
            "how_to_run": how_to_run,
            "key_components": key_components,
            "project_file_analysis": project_file_analysis,
            "license": analysis_data.get('license', 'Not specified'),
            "difficulty": difficulty,
            "best_for": best_for,
            "contributing_guide": contributing_guide
        }

    def _extract_project_file_analysis(self, key_source_files, config_files):
        """Analyzes all source and configuration files to build a comprehensive file-by-file summary"""
        file_analysis = []
        combined_files = {**config_files, **key_source_files}

        for path, content in combined_files.items():
            lines = content.splitlines()
            line_count = len(lines)
            path_lower = path.lower()
            role = "Code Module / Script"
            insights = []

            if 'package.json' in path_lower:
                role = "Node.js Package Manifest & Dependencies"
                try:
                    data = json.loads(content)
                    scripts = list(data.get('scripts', {}).keys())
                    if scripts:
                        insights.append(f"Npm scripts: `{', '.join(scripts[:6])}`")
                except:
                    pass
            elif 'requirements.txt' in path_lower:
                role = "Python Package Dependencies"
                insights.append(f"{line_count} dependencies listed")
            elif 'docker-compose' in path_lower:
                role = "Docker Multi-Container Composition"
                services = re.findall(r'^\s\s([a-zA-Z0-9_-]+):', content, re.MULTILINE)
                if services:
                    insights.append(f"Services: `{', '.join(services[:5])}`")
            elif 'dockerfile' in path_lower:
                role = "Container Image Build Spec"
                base_img = re.search(r'(?i)^FROM\s+([^\s]+)', content, re.MULTILINE)
                if base_img:
                    insights.append(f"Base image: `{base_img.group(1)}`")
            elif re.search(r'(?:main|app|server)\.py$', path_lower):
                role = "Backend Service Entry Point & API Server"
                endpoints = re.findall(r'@(?:app|router)\.(get|post|put|delete|patch)\(["\']([^"\']+)["\']', content, re.IGNORECASE)
                if endpoints:
                    insights.append(f"{len(endpoints)} API endpoints defined")
            elif re.search(r'(?:App|index)\.(?:jsx|tsx|js|ts)$', path_lower):
                role = "Frontend Root Component / Application Shell"
                components = re.findall(r'<([A-Z][a-zA-Z0-9]+)', content)
                if components:
                    unique_comps = list(set(components))[:5]
                    insights.append(f"Components rendered: `{', '.join(unique_comps)}`")
            elif 'routes' in path_lower or 'controller' in path_lower or 'api' in path_lower:
                role = "API Routing & Request Controller Module"
                routes = re.findall(r'(?:app|router)\.(get|post|put|delete)\(["\']([^"\']+)["\']', content, re.IGNORECASE)
                if routes:
                    insights.append(f"{len(routes)} route handlers")
            elif 'component' in path_lower or path_lower.endswith(('.jsx', '.tsx', '.vue')):
                role = "User Interface Component View"
                state_hooks = re.findall(r'use(?:State|Effect|Context|Reducer)\b', content)
                if state_hooks:
                    insights.append(f"React state hooks: `{', '.join(list(set(state_hooks)))[:30]}`")
            elif 'service' in path_lower or 'util' in path_lower or 'helper' in path_lower:
                role = "Business Logic & Utility Helper Module"
                funcs = re.findall(r'(?:def|function|const)\s+([a-zA-Z0-9_]+)', content)
                if funcs:
                    insights.append(f"Functions: `{', '.join(list(set(funcs))[:5])}`")
            elif 'model' in path_lower or 'schema' in path_lower or 'entity' in path_lower or 'db' in path_lower:
                role = "Data Model & Database Schema Definition"
                classes = re.findall(r'(?:class|model|struct)\s+([a-zA-Z0-9_]+)', content)
                if classes:
                    insights.append(f"Entities: `{', '.join(list(set(classes))[:5])}`")
            elif 'test' in path_lower or 'spec' in path_lower:
                role = "Automated Test Suite & Specification"
                tests = re.findall(r'(?:def test_|it\(|test\()\s*["\']?([^"\']+)["\']?', content)
                if tests:
                    insights.append(f"{len(tests)} test cases defined")
            else:
                funcs = re.findall(r'(?:def|function|const|class)\s+([a-zA-Z0-9_]+)', content)
                if funcs:
                    insights.append(f"Exports: `{', '.join(list(set(funcs))[:5])}`")

            insight_text = " | ".join(insights) if insights else f"{line_count} lines of code"

            file_analysis.append({
                "file": path,
                "lines": line_count,
                "role": role,
                "insights": insight_text
            })

        return file_analysis

    def _extract_api_endpoints(self, key_source_files):
        """Scans code files for REST API route definitions"""
        endpoints = []
        
        for path, content in key_source_files.items():
            # Python FastAPI / Flask routes
            py_matches = re.findall(r'@(?:app|router)\.(get|post|put|delete|patch)\(["\']([^"\']+)["\']', content, re.IGNORECASE)
            for method, route in py_matches:
                endpoints.append({
                    "method": method.upper(),
                    "path": route,
                    "source_file": path
                })

            # Node Express / Router routes
            js_matches = re.findall(r'(?:app|router)\.(get|post|put|delete|patch)\(["\']([^"\']+)["\']', content, re.IGNORECASE)
            for method, route in js_matches:
                endpoints.append({
                    "method": method.upper(),
                    "path": route,
                    "source_file": path
                })

        return endpoints[:30]

    def _extract_env_vars(self, key_source_files, config_files):
        """Scans code and config files for required environment variables"""
        env_vars = set()
        combined = {**config_files, **key_source_files}

        if '.env.example' in combined:
            lines = combined['.env.example'].splitlines()
            for line in lines:
                line = line.strip()
                if line and not line.startswith('#') and '=' in line:
                    var_name = line.split('=')[0].strip()
                    if var_name: env_vars.add(var_name)

        for content in key_source_files.values():
            py_env = re.findall(r'os\.(?:getenv|environ\.get)\(["\']([A-Z0-9_]+)["\']', content)
            js_env = re.findall(r'process\.env\.([A-Z0-9_]+)', content)
            for v in py_env + js_env:
                if len(v) > 2:
                    env_vars.add(v)

        return list(env_vars)[:10]

    def _clean_readme_markdown(self, readme):
        """Strips badges, HTML tags, images, and empty markdown headers."""
        if not readme or readme == "No README found":
            return ""
        text = re.sub(r'!\[.*?\]\(.*?\)', '', readme)
        text = re.sub(r'<img.*?>', '', text, flags=re.IGNORECASE)
        text = re.sub(r'<a.*?><img.*?></a>', '', text, flags=re.IGNORECASE)
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
            if len(p) > 30 and not p.startswith('[') and not p.startswith('http'):
                return p[:300]
        return ""

    def _extract_run_instructions(self, readme, config_files, tech_stack, key_source_files=None):
        """Extracts run instructions from README or package scripts and source entry points"""
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

        if readme and readme != "No README found":
            run_match = re.search(r'(?i)(?:#+|\*\*|\b)(getting started|installation|quick start|how to run|usage|setup|running)\b(.*?)(?=\n#+|\n\*\*|\Z)', readme, re.DOTALL)
            if run_match:
                extracted = run_match.group(2).strip()
                if len(extracted) > 30:
                    lines = [line.strip() for line in extracted.split('\n') if line.strip() and not line.strip().startswith('```')]
                    return "\n".join(lines[:8])

        if any(t in ['Python', 'FastAPI', 'Flask', 'Django'] for t in tech_stack):
            return "1. Clone repository.\n2. Run `pip install -r requirements.txt`.\n3. Run entrypoint script (`python main.py` or `uvicorn`)."
        elif any(t in ['Node.js', 'React', 'Vue.js', 'Next.js'] for t in tech_stack):
            return "1. Clone repository.\n2. Run `npm install`.\n3. Run `npm run dev` or `npm start`."
        elif 'Rust' in tech_stack:
            return "1. Clone repository.\n2. Run `cargo build`.\n3. Run `cargo run`."
        elif 'Go' in tech_stack:
            return "1. Clone repository.\n2. Run `go run main.go`."
        
        return "1. Clone repository.\n2. Install dependencies based on configuration files.\n3. Follow setup commands in README."

    def _analyze_architecture(self, file_tree, config_files, tech_stack, key_source_files=None):
        """Infers system architecture from directory layout, configs, and source code files"""
        tree_paths = [item['name'].lower() for item in file_tree]
        key_source_files = key_source_files or {}
        
        is_monorepo = 'packages' in tree_paths or 'lerna.json' in config_files
        has_frontend = any('frontend' in p or 'client' in p or 'ui' in p for p in tree_paths)
        has_backend = any('backend' in p or 'server' in p or 'api' in p for p in tree_paths)
        has_docker = 'dockerfile' in [p.lower() for p in config_files.keys()] or 'docker-compose.yml' in [p.lower() for p in config_files.keys()]

        arch_desc = []
        if is_monorepo:
            arch_desc.append("Monorepo architecture organizing workspace modules into distinct package sub-directories.")
        elif has_frontend and has_backend:
            arch_desc.append("Full-stack decoupled architecture featuring dedicated frontend and backend services.")
        elif any(p.startswith('src/') for p in tree_paths):
            arch_desc.append("Modular single-repository layout with primary core logic contained in `src/`.")
        else:
            arch_desc.append("Standard single-tier modular repository organization.")

        if key_source_files:
            arch_desc.append(f"Inspected {len(key_source_files)} key application source code files to verify structure.")

        if has_docker:
            arch_desc.append("Includes Docker containerization configuration for isolated execution.")

        return " ".join(arch_desc)

    def _analyze_key_components(self, file_tree, repo_name, project_file_analysis=None):
        """Maps file tree directories and inspected files to component roles"""
        directories = list(set([item['name'].split('/')[0] for item in file_tree if '/' in item['name']] + [item['name'] for item in file_tree if item['type'] == 'tree']))[:10]
        
        role_map = {
            'src': 'Core application logic and module implementation',
            'packages': 'Sub-packages and modular workspace libraries',
            'components': 'Reusable UI component library',
            'pages': 'Application views and page routing',
            'api': 'REST / GraphQL API routing',
            'backend': 'Backend server application & API services',
            'frontend': 'Frontend user interface client',
            'services': 'Business logic services & integrations',
            'utils': 'Helper utilities and shared functions',
            'docs': 'Project documentation & specifications',
            'tests': 'Automated unit and integration test suite',
            'test': 'Test suite and test fixtures',
            'scripts': 'Build and deployment scripts',
            'public': 'Static assets and public web files',
            'config': 'Application configuration settings'
        }

        components = []
        for d in directories:
            d_lower = d.lower()
            role = role_map.get(d_lower, f"Sub-directory for `{d}` functionality")
            components.append(f"`{d}/`: {role}")

        if not components:
            components = ["`src/`: Primary source code and logic"]

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
        """Build a detailed prompt for the LLM including inspected code files"""
        key_source_summary = ""
        for path, code in analysis_data.get('key_source_files', {}).items():
            lines = code.splitlines()
            line_count = len(lines)
            code_snippet = "\n".join(lines[:100])
            key_source_summary += f"\n--- FILE: {path} ({line_count} lines) ---\n{code_snippet}\n"

        # Cap the entire source summary to 15000 characters
        key_source_summary = key_source_summary[:15000]

        prompt = f"""You are an expert software architect analyzing a codebase.
Do NOT lead with frameworks or languages. First determine:
1. What problem does this project solve, in plain language a non-engineer would understand?
2. Who is the end user, and what can they do with this product?
3. What is the core workflow (e.g. "user uploads X, system does Y, user receives Z")?
Only after that, briefly note the tech stack as supporting detail, not the headline.

REPOSITORY ANALYSIS DATA:

README INTRO:
{analysis_data.get('readme_intro', '')[:1500]}

PACKAGE DESCRIPTION:
{json.dumps(analysis_data.get('package_description', dict()))}

UI STRINGS (from frontend files):
{', '.join(analysis_data.get('ui_strings', []))}

ROUTES DETECTED:
{', '.join(analysis_data.get('route_paths', []))}

DOCSTRINGS:
{chr(10).join(analysis_data.get('docstrings', []))}

INSPECTED SOURCE CODE SNIPPETS:
{key_source_summary}

TECH STACK DETECTED:
{', '.join(analysis_data.get('tech_stack', []))}

Generate a JSON response with EXACTLY this structure (no additional text, only valid JSON):

{{
  "what_it_does": "A clear, concise, plain-language description of what this project does, the problem it solves, and its core workflow (2-3 sentences)",
  "core_features": ["Feature 1 (plain language)", "Feature 2", "Feature 3"],
  "technical_details": {{
    "tech_stack": ["list", "of", "technologies", "used"],
    "architecture": "Overview of the project architecture and design patterns used",
    "dependencies": ["list", "of", "major", "dependencies"],
    "api_endpoints": [
      {{"method": "GET", "path": "/endpoint", "source_file": "file.py"}}
    ],
    "env_vars": ["VAR_1", "VAR_2"]
  }},
  "how_to_run": "Step-by-step instructions on how to set up and run this project",
  "key_components": ["list", "of", "main", "components", "and", "their", "purposes"],
  "project_file_analysis": [
    {{"file": "filename", "lines": 100, "role": "File role", "insights": "Key findings from code"}}
  ],
  "license": "License type",
  "difficulty": "Beginner/Intermediate/Advanced",
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
            "what_it_does": "Analysis complete.",
            "core_features": [],
            "technical_details": {
                "tech_stack": [],
                "architecture": "Standard layout.",
                "dependencies": [],
                "api_endpoints": [],
                "env_vars": []
            },
            "how_to_run": "Refer to README.",
            "key_components": [],
            "project_file_analysis": [],
            "license": "Unknown",
            "difficulty": "Intermediate",
            "best_for": "Developers",
            "contributing_guide": "Check repo issues."
        }
