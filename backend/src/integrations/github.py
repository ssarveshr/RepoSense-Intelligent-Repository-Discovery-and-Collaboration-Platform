import requests
import re
from urllib.parse import urlparse

class GitHubAnalyzer:
    def __init__(self, github_token: str | None = None):
        self.github_api_base = "https://api.github.com"
        self.raw_github_base = "https://raw.githubusercontent.com"
        # GitHub API headers (optional token for higher rate limits)
        self.headers = {
            'Accept': 'application/vnd.github.v3+json',
            'User-Agent': 'RepoSense-Analyzer'
        }
        if github_token:
            self.headers['Authorization'] = f'Bearer {github_token}'
    
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
        
        # Step 3: Get recursive file tree
        file_tree = self._get_file_tree(owner, repo, branch=default_branch)
        result['file_tree'] = file_tree
        
        # Step 4: Fetch important config files
        config_files = self._fetch_config_files(owner, repo, file_tree, branch=default_branch)
        result['config_files'] = config_files
        
        # Step 5: Fetch key source code files for deep file analysis
        key_source_files = self._fetch_key_source_files(owner, repo, file_tree, branch=default_branch)
        result['key_source_files'] = key_source_files
        
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
        
        # Fetch up to 50 source code files from the repository
        selected_paths = candidate_paths[:50]
        
        for filepath in selected_paths:
            try:
                url = f"{self.raw_github_base}/{owner}/{repo}/{branch}/{filepath}"
                response = requests.get(url, timeout=10)
                if response.status_code == 200:
                    # Fetch up to 8KB per file to perform deep code inspection
                    key_source_files[filepath] = response.text[:8000]
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

    def _permission_label(self, permissions: dict | None) -> str:
        if not permissions:
            return "Collaborator"
        if permissions.get("admin"):
            return "Admin"
        if permissions.get("maintain"):
            return "Maintainer"
        if permissions.get("push"):
            return "Write"
        if permissions.get("triage"):
            return "Triage"
        if permissions.get("pull"):
            return "Read"
        return "Collaborator"

    def _fetch_user_public_email(self, login: str) -> str | None:
        """Best-effort public email lookup; GitHub rarely exposes private emails."""
        try:
            url = f"{self.github_api_base}/users/{login}"
            response = requests.get(url, headers=self.headers, timeout=10)
            if response.status_code != 200:
                return None
            data = response.json()
            email = data.get("email")
            if email and isinstance(email, str) and "@" in email:
                return email.strip()
        except requests.exceptions.RequestException:
            return None
        return None

    def list_collaborators(self, github_url: str) -> list[dict]:
        """List repository collaborators with optional public email when available."""
        owner, repo = self.extract_repo_info(github_url)
        url = f"{self.github_api_base}/repos/{owner}/{repo}/collaborators"
        params = {"per_page": 100, "affiliation": "direct"}

        collaborators: list[dict] = []
        page = 1

        while True:
            response = requests.get(
                url,
                headers={**self.headers, "Accept": "application/vnd.github.v3+json"},
                params={**params, "page": page},
                timeout=15,
            )

            if response.status_code == 401:
                raise ValueError(
                    "GitHub authentication failed. Verify GITHUB_TOKEN on the server."
                )
            if response.status_code == 404:
                raise ValueError(
                    f"Repository not found or inaccessible: {owner}/{repo}. "
                    "It may be private, deleted, or your token may lack access."
                )
            if response.status_code == 403:
                remaining = response.headers.get("X-RateLimit-Remaining")
                if remaining == "0":
                    reset = response.headers.get("X-RateLimit-Reset")
                    raise ValueError(
                        "GitHub API rate limit exceeded. Configure GITHUB_TOKEN on the server or retry later."
                        + (f" Resets at epoch {reset}." if reset else "")
                    )
                raise ValueError(
                    "GitHub API access denied. The token may lack permission for this repository, "
                    "or collaborator listing requires authentication for this repo."
                )
            if response.status_code != 200:
                raise ValueError(f"Failed to fetch collaborators: HTTP {response.status_code}")

            batch = response.json()
            if not batch:
                break

            for item in batch:
                login = item.get("login") or ""
                if not login:
                    continue
                permissions = item.get("permissions") or {}
                email = self._fetch_user_public_email(login)
                collaborators.append(
                    {
                        "github_login": login,
                        "name": item.get("name") or login,
                        "avatar_url": item.get("avatar_url"),
                        "role": self._permission_label(permissions),
                        "email": email,
                        "email_source": "github" if email else None,
                    }
                )

            if len(batch) < 100:
                break
            page += 1

        return collaborators

