import requests
import re
from urllib.parse import urlparse

class GitHubAnalyzer:
    def __init__(self):
        self.github_api_base = "https://api.github.com"
        self.raw_github_base = "https://raw.githubusercontent.com"
        # GitHub API headers (optional token for higher rate limits)
        self.headers = {
            'Accept': 'application/vnd.github.v3+json',
            'User-Agent': 'RepoSense-Analyzer'
        }
    
    def extract_repo_info(self, github_url):
        """Extract owner and repo from GitHub URL"""
        # Handle various GitHub URL formats
        patterns = [
            r'github\.com/([^/]+)/([^/]+?)(?:\.git)?/?$',
            r'github\.com/([^/]+)/([^/]+?)/?$',
        ]
        
        for pattern in patterns:
            match = re.search(pattern, github_url)
            if match:
                return match.group(1), match.group(2).rstrip('/')
        
        raise ValueError("Invalid GitHub repository URL")
    
    def analyze_github_repo(self, github_url):
        """Analyze a GitHub repository without cloning by inspecting actual codebase files"""
        try:
            owner, repo = self.extract_repo_info(github_url)
        except ValueError as e:
            raise e
        
        result = {
            'name': repo,
            'owner': owner,
            'description': '',
            'purpose': '',
            'tech_stack': [],
            'how_to_run': '',
            'architecture': '',
            'key_components': [],
            'dependencies': [],
            'license': '',
            'stars': 0,
            'language': '',
            'readme_content': '',
            'readme_intro': '',
            'package_description': {},
            'ui_strings': [],
            'route_paths': [],
            'docstrings': [],
            'file_tree': [],
            'config_files': {},
            'key_source_files': {}
        }
        
        # Step 1: Get repository metadata
        repo_metadata = self._get_repo_metadata(owner, repo)
        result.update(repo_metadata)
        default_branch = repo_metadata.get('default_branch', 'main')
        
        # Step 2: Get README
        readme_content = self._get_readme(owner, repo, branch=default_branch)
        result['readme_content'] = readme_content
        result['readme_intro'] = self._extract_readme_intro(readme_content)
        
        # Step 3: Get recursive file tree
        file_tree = self._get_file_tree(owner, repo, branch=default_branch)
        result['file_tree'] = file_tree
        
        # Step 4: Fetch important config files
        config_files = self._fetch_config_files(owner, repo, file_tree, branch=default_branch)
        result['config_files'] = config_files
        result['package_description'] = self._extract_package_description(config_files)
        
        # Step 5: Fetch key source code files for deep file analysis
        key_source_files = self._fetch_key_source_files(owner, repo, file_tree, branch=default_branch)
        result['key_source_files'] = key_source_files
        
        # Step 5.5: Extract functional signals
        functional_signals = self._extract_functional_signals(key_source_files)
        result['ui_strings'] = functional_signals['ui_strings']
        result['route_paths'] = functional_signals['route_paths']
        result['docstrings'] = functional_signals['docstrings']
        
        # Step 6: Extract tech stack from configs and source files
        result['tech_stack'] = self._extract_tech_stack_from_configs(config_files, key_source_files)
        
        # Step 7: Extract dependencies
        result['dependencies'] = self._extract_dependencies_from_configs(config_files)
        
        return result
    
    def _get_repo_metadata(self, owner, repo):
        """Get repository metadata from GitHub API"""
        try:
            url = f"{self.github_api_base}/repos/{owner}/{repo}"
            response = requests.get(url, headers=self.headers, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                return {
                    'name': data.get('name', repo),
                    'description': data.get('description', 'No description provided'),
                    'stars': data.get('stargazers_count', 0),
                    'language': data.get('language', 'Unknown'),
                    'license': data.get('license', {}).get('spdx_id', 'Not specified') if data.get('license') else 'Not specified',
                    'default_branch': data.get('default_branch', 'main'),
                    'topics': data.get('topics', [])
                }
            elif response.status_code == 404:
                raise ValueError(f"Repository not found: {owner}/{repo}")
            elif response.status_code == 403:
                raise ValueError("GitHub API rate limit exceeded. Please try again later.")
            else:
                raise ValueError(f"Failed to fetch repository metadata: {response.status_code}")
        except requests.exceptions.Timeout:
            raise ValueError("Request timed out. Please check your internet connection.")
        except requests.exceptions.RequestException as e:
            raise ValueError(f"Network error: {str(e)}")
    
    def _get_readme(self, owner, repo, branch='main'):
        """Get README content from raw GitHub"""
        branches = [branch] + [b for b in ['main', 'master', 'develop'] if b != branch]
        readme_files = ['README.md', 'README.rst', 'README.txt', 'readme.md']
        
        for b in branches:
            for readme_file in readme_files:
                try:
                    url = f"{self.raw_github_base}/{owner}/{repo}/{b}/{readme_file}"
                    response = requests.get(url, timeout=10)
                    
                    if response.status_code == 200:
                        return response.text[:5000]
                except:
                    continue
        
        return "No README found"
    
    def _extract_readme_intro(self, readme_content):
        """Extract the introductory text from README, removing badges and stopping at first major heading."""
        if not readme_content or readme_content == "No README found":
            return ""
        
        # Strip markdown images and badges
        clean_text = re.sub(r'!\[.*?\]\(.*?\)', '', readme_content)
        clean_text = re.sub(r'<img.*?>', '', clean_text, flags=re.IGNORECASE)
        clean_text = re.sub(r'<a.*?><img.*?></a>', '', clean_text, flags=re.IGNORECASE)
        
        lines = clean_text.split('\n')
        intro_paragraphs = []
        started = False
        
        for line in lines:
            line_str = line.strip()
            # Stop if we hit a major heading after we've started collecting, or common usage headings
            if started and (line_str.startswith('## ') or line_str.startswith('### ') or re.search(r'(?i)^(installation|getting started|usage|features)', line_str)):
                break
            
            # Start collecting after the main title
            if line_str.startswith('# '):
                started = True
                continue
            
            if not started and line_str and not line_str.startswith('#') and not line_str.startswith('='):
                started = True
            
            if started and line_str:
                intro_paragraphs.append(line_str)
                
        return " ".join(intro_paragraphs)[:1000]

    def _extract_package_description(self, config_files):
        """Parse package.json for description and keywords."""
        import json
        result = {'description': '', 'keywords': []}
        if 'package.json' in config_files:
            try:
                data = json.loads(config_files['package.json'])
                result['description'] = data.get('description', '')
                result['keywords'] = data.get('keywords', [])
            except:
                pass
        return result

    def _extract_functional_signals(self, key_source_files):
        """Extract functional elements: UI strings, explicit routes, and docstrings."""
        ui_strings = []
        route_paths = []
        docstrings = []
        
        for filepath, content in key_source_files.items():
            path_lower = filepath.lower()
            
            # Extract docstrings from Python / JS
            if path_lower.endswith(('.py', '.js', '.ts', '.jsx', '.tsx')):
                # Try to get top-of-file docstrings or class docstrings
                py_docs = re.findall(r'"""(.*?)"""', content, re.DOTALL)
                for doc in py_docs:
                    clean_doc = doc.strip().replace('\n', ' ')
                    if clean_doc and len(clean_doc) > 10:
                        docstrings.append(f"{filepath}: {clean_doc[:200]}")
                        
                # Extract routes
                routes = re.findall(r'@(?:app|router)\.(?:get|post|put|delete|patch)\(["\']([^"\']+)["\']', content, re.IGNORECASE)
                js_routes = re.findall(r'(?:app|router)\.(?:get|post|put|delete|patch)\(["\']([^"\']+)["\']', content, re.IGNORECASE)
                all_routes = routes + js_routes
                if all_routes:
                    route_paths.extend(all_routes)

            # Extract UI strings from React/Vue/HTML
            if path_lower.endswith(('.jsx', '.tsx', '.html', '.vue')):
                # Look for simple text inside standard tags
                texts = re.findall(r'>([^<]{3,50})<', content)
                for t in texts:
                    t_strip = t.strip()
                    if t_strip and not t_strip.startswith('{') and len(t_strip) > 3:
                        ui_strings.append(t_strip)
                
                # Look for placeholder or title attributes
                attrs = re.findall(r'(?:placeholder|title|label)=["\']([^"\']+)["\']', content, re.IGNORECASE)
                ui_strings.extend(attrs)

        return {
            'ui_strings': list(set(ui_strings))[:30],
            'route_paths': list(set(route_paths))[:30],
            'docstrings': docstrings[:15]
        }

    
    def _get_file_tree(self, owner, repo, branch='main'):
        """Get recursive file tree from GitHub API"""
        branches = [branch] + [b for b in ['main', 'master', 'develop'] if b != branch]
        
        for b in branches:
            try:
                # Try recursive first
                url = f"{self.github_api_base}/repos/{owner}/{repo}/git/trees/{b}?recursive=1"
                response = requests.get(url, headers=self.headers, timeout=10)
                
                if response.status_code == 200:
                    data = response.json()
                    tree = data.get('tree', [])
                    # Return path, type, and size (limit to 500 items to cover deep repos)
                    return [{'name': item['path'], 'type': item['type'], 'size': item.get('size', 0)} for item in tree[:500]]
                
                # Fallback to non-recursive if recursive fails
                url_fallback = f"{self.github_api_base}/repos/{owner}/{repo}/git/trees/{b}"
                resp_fb = requests.get(url_fallback, headers=self.headers, timeout=10)
                if resp_fb.status_code == 200:
                    tree = resp_fb.json().get('tree', [])
                    return [{'name': item['path'], 'type': item['type'], 'size': item.get('size', 0)} for item in tree[:100]]
            except:
                continue
        
        return []
    
    def _fetch_config_files(self, owner, repo, file_tree, branch='main'):
        """Fetch important configuration files"""
        config_files = {}
        
        important_files = [
            'package.json',
            'requirements.txt',
            'pyproject.toml',
            'Pipfile',
            'setup.py',
            'pom.xml',
            'build.gradle',
            'Cargo.toml',
            'go.mod',
            'Gemfile',
            'composer.json',
            'Dockerfile',
            'docker-compose.yml',
            '.env.example',
            'schema.prisma',
            '.gitignore'
        ]
        
        tree_files = [item['name'] for item in file_tree if item['type'] == 'blob']
        files_to_fetch = [f for f in important_files if f in tree_files]
        
        for filename in files_to_fetch:
            try:
                url = f"{self.raw_github_base}/{owner}/{repo}/{branch}/{filename}"
                response = requests.get(url, timeout=10)
                
                if response.status_code == 200:
                    config_files[filename] = response.text[:5000]
            except:
                continue
        
        return config_files

    def _fetch_key_source_files(self, owner, repo, file_tree, branch='main'):
        """Fetch raw content for all application source code files across the repository"""
        key_source_files = {}
        
        # Recognized source file extensions
        valid_extensions = (
            '.py', '.js', '.ts', '.jsx', '.tsx', '.go', '.rs', '.java', '.c', '.cpp',
            '.h', '.hpp', '.cs', '.php', '.rb', '.sql', '.prisma', '.html', '.css',
            '.json', '.yaml', '.yml', '.toml', '.sh', '.ps1', '.bat', '.env.example'
        )
        
        # Ignored path patterns (build outputs, vendor libs, lockfiles, images, binaries)
        ignored_patterns = [
            'node_modules/', 'dist/', 'build/', 'vendor/', '.git/', '__pycache__/',
            '.next/', 'coverage/', 'package-lock.json', 'yarn.lock', 'pnpm-lock.yaml',
            '.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico', '.pdf', '.zip', '.tar'
        ]
        
        tree_blobs = [item for item in file_tree if item.get('type') == 'blob']
        candidate_paths = []
        
        for item in tree_blobs:
            path = item['name']
            path_lower = path.lower()
            
            if any(x in path_lower for x in ignored_patterns):
                continue
                
            if path_lower.endswith(valid_extensions) or '/' not in path:
                candidate_paths.append(path)
                
        def get_priority(p):
            p_low = p.lower()
            if re.search(r'(main|app|server|index)\.(py|js|ts|go|rs|java)$', p_low): return 1
            if 'route' in p_low or 'api' in p_low or 'controller' in p_low: return 2
            if 'model' in p_low or 'schema' in p_low or 'db' in p_low: return 3
            if 'component' in p_low or 'page' in p_low or 'view' in p_low: return 4
            if 'service' in p_low or 'core' in p_low or 'util' in p_low: return 5
            if p_low.endswith(('.json', '.yaml', '.yml', '.toml', '.env.example')): return 6
            return 10
            
        candidate_paths.sort(key=lambda p: (get_priority(p), p))
        
        # Fetch up to 50 source code files from the repository
        selected_paths = candidate_paths[:50]
        
        for filepath in selected_paths:
            try:
                url = f"{self.raw_github_base}/{owner}/{repo}/{branch}/{filepath}"
                response = requests.get(url, timeout=10)
                if response.status_code == 200:
                    # Fetch up to 15KB per file to perform deep code inspection
                    key_source_files[filepath] = response.text[:15000]
            except:
                continue
                
        return key_source_files
    
    def _extract_tech_stack_from_configs(self, config_files, key_source_files=None):
        """Extract tech stack from configuration and source files"""
        import json
        tech_stack = []
        key_source_files = key_source_files or {}
        
        for filename, content in config_files.items():
            if filename == 'package.json':
                try:
                    data = json.loads(content)
                    tech_stack.append('Node.js')
                    
                    deps = {**data.get('dependencies', {}), **data.get('devDependencies', {})}
                    if any('react' in dep.lower() for dep in deps.keys()):
                        tech_stack.append('React')
                    if any('vue' in dep.lower() for dep in deps.keys()):
                        tech_stack.append('Vue.js')
                    if any('angular' in dep.lower() for dep in deps.keys()):
                        tech_stack.append('Angular')
                    if any('next' in dep.lower() for dep in deps.keys()):
                        tech_stack.append('Next.js')
                    if any('typescript' in deps.keys() or '@types/' in str(deps.keys())):
                        tech_stack.append('TypeScript')
                    if any('tailwind' in dep.lower() for dep in deps.keys()):
                        tech_stack.append('Tailwind CSS')
                    if any('express' in dep.lower() for dep in deps.keys()):
                        tech_stack.append('Express.js')
                    if any('django' in dep.lower() for dep in deps.keys()):
                        tech_stack.append('Django')
                except:
                    pass
            elif filename in ['requirements.txt', 'Pipfile', 'pyproject.toml']:
                tech_stack.append('Python')
                if 'django' in content.lower(): tech_stack.append('Django')
                if 'flask' in content.lower(): tech_stack.append('Flask')
                if 'fastapi' in content.lower(): tech_stack.append('FastAPI')
                if 'sqlalchemy' in content.lower(): tech_stack.append('SQLAlchemy')
            elif filename == 'pom.xml':
                tech_stack.append('Java'); tech_stack.append('Maven')
            elif filename == 'build.gradle':
                tech_stack.append('Java'); tech_stack.append('Gradle')
            elif filename == 'Cargo.toml': tech_stack.append('Rust')
            elif filename == 'go.mod': tech_stack.append('Go')
            elif filename == 'Gemfile': tech_stack.append('Ruby')
            elif filename == 'composer.json': tech_stack.append('PHP')
            elif filename in ['Dockerfile', 'docker-compose.yml']: tech_stack.append('Docker')
        
        # Scan source files for additional framework hints
        source_text = " ".join(key_source_files.values()).lower()
        if 'fastapi' in source_text and 'FastAPI' not in tech_stack: tech_stack.append('FastAPI')
        if 'flask' in source_text and 'Flask' not in tech_stack: tech_stack.append('Flask')
        if 'express' in source_text and 'Express.js' not in tech_stack: tech_stack.append('Express.js')
        if ('react' in source_text or 'useState' in source_text) and 'React' not in tech_stack: tech_stack.append('React')
        if 'prisma' in source_text and 'Prisma' not in tech_stack: tech_stack.append('Prisma ORM')
        if 'tailwindcss' in source_text and 'Tailwind CSS' not in tech_stack: tech_stack.append('Tailwind CSS')

        return list(set(tech_stack))
    
    def _extract_dependencies_from_configs(self, config_files):
        """Extract dependencies from configuration files"""
        import json
        dependencies = []
        
        for filename, content in config_files.items():
            if filename == 'package.json':
                try:
                    data = json.loads(content)
                    deps = data.get('dependencies', {})
                    dep_list = [f"{name}: {version}" for name, version in deps.items()]
                    dependencies.extend(dep_list[:15])
                except:
                    pass
            elif filename == 'requirements.txt':
                lines = content.split('\n')
                for line in lines[:15]:
                    line = line.strip()
                    if line and not line.startswith('#'):
                        dependencies.append(line)
        
        return dependencies

