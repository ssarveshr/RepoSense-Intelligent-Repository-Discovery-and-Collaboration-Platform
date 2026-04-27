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
        """Analyze a GitHub repository without cloning"""
        try:
            owner, repo = self.extract_repo_info(github_url)
        except ValueError as e:
            raise e
        
        result = {
            'name': repo,
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
            'file_tree': []
        }
        
        # Step 1: Get repository metadata
        repo_metadata = self._get_repo_metadata(owner, repo)
        result.update(repo_metadata)
        
        # Step 2: Get README
        readme_content = self._get_readme(owner, repo)
        result['readme_content'] = readme_content
        
        # Step 3: Get file tree (top-level)
        file_tree = self._get_file_tree(owner, repo)
        result['file_tree'] = file_tree
        
        # Step 4: Fetch important config files
        config_files = self._fetch_config_files(owner, repo, file_tree)
        
        # Step 5: Extract tech stack from configs
        result['tech_stack'] = self._extract_tech_stack_from_configs(config_files)
        
        # Step 6: Extract dependencies
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
                    'license': data.get('license', {}).get('spdx_id', 'Not specified') if data.get('license') else 'Not specified'
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
        # Try common branch names and README variations
        branches = ['main', 'master', 'develop']
        readme_files = ['README.md', 'README.rst', 'README.txt', 'readme.md']
        
        for branch in branches:
            for readme_file in readme_files:
                try:
                    url = f"{self.raw_github_base}/{owner}/{repo}/{branch}/{readme_file}"
                    response = requests.get(url, timeout=10)
                    
                    if response.status_code == 200:
                        # Limit to 5000 characters to avoid huge files
                        return response.text[:5000]
                except:
                    continue
        
        return "No README found"
    
    def _get_file_tree(self, owner, repo, branch='main'):
        """Get top-level file tree from GitHub API"""
        branches = ['main', 'master', 'develop']
        
        for branch in branches:
            try:
                url = f"{self.github_api_base}/repos/{owner}/{repo}/git/trees/{branch}"
                response = requests.get(url, headers=self.headers, timeout=10)
                
                if response.status_code == 200:
                    data = response.json()
                    tree = data.get('tree', [])
                    # Return only top-level items, limit to 50
                    return [{'name': item['path'], 'type': item['type']} for item in tree[:50]]
                elif response.status_code == 404:
                    continue
            except:
                continue
        
        return []
    
    def _fetch_config_files(self, owner, repo, file_tree, branch='main'):
        """Fetch important configuration files"""
        config_files = {}
        
        # Important files to fetch (prioritized)
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
            '.gitignore'
        ]
        
        # Get list of files in the tree
        tree_files = [item['name'] for item in file_tree if item['type'] == 'blob']
        
        # Only fetch files that exist in the tree
        files_to_fetch = [f for f in important_files if f in tree_files]
        
        for filename in files_to_fetch:
            try:
                url = f"{self.raw_github_base}/{owner}/{repo}/{branch}/{filename}"
                response = requests.get(url, timeout=10)
                
                if response.status_code == 200:
                    # Limit file size to 5KB
                    config_files[filename] = response.text[:5000]
            except:
                continue
        
        return config_files
    
    def _extract_tech_stack_from_configs(self, config_files):
        """Extract tech stack from configuration files"""
        import json
        tech_stack = []
        
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
            elif filename == 'requirements.txt' or filename == 'Pipfile':
                tech_stack.append('Python')
                if 'django' in content.lower():
                    tech_stack.append('Django')
                if 'flask' in content.lower():
                    tech_stack.append('Flask')
                if 'fastapi' in content.lower():
                    tech_stack.append('FastAPI')
                if 'sqlalchemy' in content.lower():
                    tech_stack.append('SQLAlchemy')
            elif filename == 'pyproject.toml':
                tech_stack.append('Python')
                if 'django' in content.lower():
                    tech_stack.append('Django')
                if 'flask' in content.lower():
                    tech_stack.append('Flask')
            elif filename == 'pom.xml':
                tech_stack.append('Java')
                tech_stack.append('Maven')
            elif filename == 'build.gradle':
                tech_stack.append('Java')
                tech_stack.append('Gradle')
            elif filename == 'Cargo.toml':
                tech_stack.append('Rust')
            elif filename == 'go.mod':
                tech_stack.append('Go')
            elif filename == 'Gemfile':
                tech_stack.append('Ruby')
            elif filename == 'composer.json':
                tech_stack.append('PHP')
            elif filename == 'Dockerfile':
                tech_stack.append('Docker')
        
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
                    # Convert dict to list and limit to 15 items
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
