from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from search_engine import engine
from summarizer import RepoSummarizer
from github_analyzer import GitHubAnalyzer

app = FastAPI(
    title="RepoSense AI API",
    description="Intelligent Repository Discovery & Semantic Search API"
)

# Enable CORS (Cross-Origin Resource Sharing)
# This allows your React frontend (running on port 5173/3000) to talk to this API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def health_check():
    return {
        "status": "online",
        "message": "RepoSense AI Engine is running",
        "capabilities": ["Semantic Search", "Hybrid Ranking", "GitHub Discovery"]
    }

import requests

@app.get("/search")
async def search_repositories(q: str = Query(..., min_length=1)):
    """
    Live GitHub Search + AI Reranking.
    Fetches the best matches from GitHub and then uses Sentence-Transformers
    to sort them by actual semantic meaning.
    """
    try:
        # 1. Fetch from GitHub Search API (Top 30 results)
        github_url = f"https://api.github.com/search/repositories?q={q}&sort=stars&order=desc"
        response = requests.get(github_url, headers={'Accept': 'application/vnd.github.v3+json'})
        
        if response.status_code != 200:
            return {"error": "GitHub API error", "results": []}

        items = response.json().get('items', [])
        
        # 2. Format for our engine
        candidates = []
        for item in items[:30]:
            candidates.append({
                "id": item['id'],
                "name": item['name'],
                "description": item['description'] or "No description provided.",
                "url": item['html_url'],
                "stars": item['stargazers_count'],
                "category": item.get('language', 'Universal')
            })

        # 3. AI Reranking
        # This is where the magic happens: sorting by meaning, not just stars
        results = engine.rank_results(q, candidates, limit=10)
        
        return {
            "query": q,
            "count": len(results),
            "results": results,
            "source": "live_github"
        }
    except Exception as e:
        return {"error": str(e), "results": []}

@app.get("/trending")
async def get_trending_repos():
    """Returns top trending repos globally across all of GitHub."""
    try:
        url = "https://api.github.com/search/repositories?q=stars:>50000&sort=stars&order=desc"
        response = requests.get(url)
        items = response.json().get('items', [])
        
        results = []
        for item in items[:6]:
            results.append({
                "id": item['id'],
                "name": item['name'],
                "description": item['description'],
                "url": item['html_url'],
                "stars": item['stargazers_count'],
                "category": "Trending"
            })
        return results
    except Exception as e:
        return []

@app.get("/categories/{category_name}")
async def get_by_category(category_name: str):
    """Fetches live results based on a category/topic."""
    return await search_repositories(category_name)

# Request model for GitHub summarization
class GitHubSummarizeRequest(BaseModel):
    github_url: str

@app.post("/summarize-github")
async def summarize_github_repo(request: GitHubSummarizeRequest):
    """
    Analyze a GitHub repository URL and generate an AI-powered summary WITHOUT cloning.
    """
    try:
        # Initialize analyzers
        github_analyzer = GitHubAnalyzer()
        summarizer = RepoSummarizer()
        
        # Step 1: Extract data from GitHub APIs
        analysis_data = github_analyzer.analyze_github_repo(request.github_url)
        
        # Step 2: Generate AI summary using Ollama
        summary = summarizer.generate_summary(analysis_data)
        
        # Merge GitHub metadata with AI summary
        summary['name'] = analysis_data.get('name', '')
        summary['description'] = analysis_data.get('description', '')
        summary['stars'] = analysis_data.get('stars', 0)
        summary['language'] = analysis_data.get('language', '')
        
        return {
            "status": "success",
            "summary": summary,
            "raw_analysis": {
                "file_tree": analysis_data.get('file_tree', []),
                "tech_stack": analysis_data.get('tech_stack', []),
                "dependencies": analysis_data.get('dependencies', [])
            }
        }
    except ValueError as e:
        return {"status": "error", "message": str(e)}
    except Exception as e:
        return {"status": "error", "message": str(e)}

if __name__ == "__main__":
    import uvicorn
    print("🔥 RepoSense API is starting on http://localhost:8000")
    uvicorn.run(app, host="0.0.0.0", port=8000)
