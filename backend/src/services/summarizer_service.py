import requests
import json

class RepoSummarizer:
    def __init__(self, ollama_url="http://localhost:11434"):
        self.ollama_url = ollama_url
        self.model = "llama3:8b"
    
    def generate_summary(self, analysis_data):
        """
        Use Ollama (llama3:8b) to generate a structured summary of the repository
        """
        # Prepare the prompt with all the analysis data
        prompt = self._build_prompt(analysis_data)
        
        # Call Ollama API
        try:
            response = requests.post(
                f"{self.ollama_url}/api/generate",
                json={
                    "model": self.model,
                    "prompt": prompt,
                    "stream": False,
                    "format": "json"  # Request JSON response
                }
            )
            
            if response.status_code == 200:
                result = response.json()
                response_text = result.get('response', '')
                
                # Parse the JSON response
                try:
                    summary = json.loads(response_text)
                    return summary
                except json.JSONDecodeError:
                    # If JSON parsing fails, try to extract JSON from the response
                    return self._extract_json(response_text)
            else:
                raise Exception(f"Ollama API error: {response.status_code} - {response.text}")
                
        except requests.exceptions.ConnectionError:
            print("[WARN] Could not connect to Ollama. Using fallback mock summary.")
            return self._generate_mock_summary(analysis_data)
        except Exception as e:
            raise Exception(f"Error generating summary: {str(e)}")
            
    def _generate_mock_summary(self, analysis_data):
        """Generate a realistic, detailed summary based on analysis data when Ollama is unavailable"""
        tech_stack = analysis_data.get('tech_stack', [])
        repo_name = analysis_data.get('name', 'This repository')
        description = analysis_data.get('description', '')
        readme = analysis_data.get('readme_content', '')
        file_tree = analysis_data.get('file_tree', [])
        
        # Build purpose from description and README
        if description and description != 'No description provided':
            purpose = f"{repo_name}: {description}"
        else:
            purpose = f"{repo_name} is an open-source repository built with {', '.join(tech_stack[:3]) if tech_stack else 'modern tech stack'}."
        
        # Extract how_to_run from README if present
        how_to_run = "1. Clone the repository.\n2. Install dependencies based on project config.\n3. Run start command specified in README."
        if readme and readme != "No README found":
            import re
            run_match = re.search(r'(?i)(?:#+|\*\*|\b)(getting started|installation|quick start|how to run|usage|setup)\b(.*?)(?=\n#+|\n\*\*|\Z)', readme, re.DOTALL)
            if run_match:
                extracted = run_match.group(2).strip()
                if len(extracted) > 30:
                    how_to_run = extracted[:400]
        
        # Extract key components from file tree directories or fallback
        dir_components = [item['name'] for item in file_tree if item['type'] == 'tree'][:8]
        key_components = dir_components if dir_components else (analysis_data.get('key_components', []) or ["Core Application", "Configuration"])
        
        # Determine tech stack fallback if empty
        if not tech_stack:
            language = analysis_data.get('language')
            if language and language != 'Unknown':
                tech_stack = [language]
            else:
                tech_stack = ["JavaScript/Python"]

        return {
            "purpose": purpose,
            "tech_stack": tech_stack,
            "how_to_run": how_to_run,
            "architecture": f"Structured repository with {len(file_tree)} top-level modules/files using standard modular design.",
            "key_components": key_components,
            "dependencies": analysis_data.get('dependencies', [])[:10] or ["Standard library / core packages"],
            "license": analysis_data.get('license', 'Not specified'),
            "difficulty": "Beginner" if len(file_tree) < 12 else "Intermediate",
            "best_for": f"Developers looking to learn or build with {tech_stack[0] if tech_stack else 'open source'}.",
            "contributing_guide": "Check existing GitHub issues, fork the repository, and submit a Pull Request following project guidelines."
        }
    
    def _build_prompt(self, analysis_data):
        """Build a detailed prompt for the LLM"""
        prompt = f"""You are an expert software architect and technical analyst. Analyze the following repository information and generate a comprehensive structured summary.

REPOSITORY ANALYSIS DATA:

READ ME CONTENT:
{analysis_data.get('readme_content', 'No README found')[:3000]}

LICENSE:
{analysis_data.get('license', 'No license found')[:1000]}

FOLDER STRUCTURE:
{analysis_data.get('folder_structure', 'Not available')[:2000]}

TECH STACK DETECTED:
{', '.join(analysis_data.get('tech_stack', []))}

KEY COMPONENTS:
{chr(10).join(analysis_data.get('key_components', []))}

CONFIGURATION FILES:
{json.dumps({k: v[:500] for k, v in analysis_data.get('config_files', {}).items()}, indent=2)[:2000]}

DEPENDENCIES (first 20):
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
  "best_for": "Who this project is best for (e.g., Learning React, Production usage, Research)",
  "contributing_guide": "Brief summary on how to start contributing"
}}

IMPORTANT RULES:
1. Return ONLY valid JSON, no markdown, no explanation
2. Make the purpose clear and specific
3. Include all detected technologies in tech_stack
4. Provide actionable run instructions
5. List 5-8 key components maximum
6. List 10-15 major dependencies maximum
7. Keep descriptions concise but informative
"""
        return prompt
    
    def _extract_json(self, text):
        """Try to extract JSON from text that might contain additional content"""
        try:
            # Try to find JSON object in the text
            start = text.find('{')
            end = text.rfind('}') + 1
            if start != -1 and end > start:
                json_str = text[start:end]
                return json.loads(json_str)
        except:
            pass
        
        # Return a default structure if parsing fails
        return {
            "purpose": "Analysis could not be completed. Please check the repository structure.",
            "tech_stack": [],
            "how_to_run": "Refer to the README file for setup instructions.",
            "architecture": "Unable to determine architecture.",
            "key_components": [],
            "dependencies": [],
            "license": "Unknown",
            "difficulty": "Unknown",
            "best_for": "Unknown",
            "contributing_guide": "Unknown"
        }
