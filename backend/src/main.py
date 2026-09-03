from contextlib import asynccontextmanager
import asyncio

from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from src.api.deps.rate_limit import limiter
from src.api.routes.collaboration import router as collaboration_router
from src.api.routes.github import router as github_router
from src.api.routes.meetings import router as meetings_router
from src.api.routes.profile import router as profile_router
from src.config.settings import settings
from src.db import init_db, async_session_factory
from src.services.meeting_service import MeetingService
from src.services.search_service import engine
from src.services.summarizer_service import RepoSummarizer
from src.services.agent_service import agent_service
from src.integrations.github import GitHubAnalyzer


async def _empty_meeting_cleanup_loop() -> None:
    while True:
        await asyncio.sleep(15)
        try:
            async with async_session_factory() as session:
                service = MeetingService(session)
                await service.cleanup_empty_meetings()
                await session.commit()
        except asyncio.CancelledError:
            raise
        except Exception:
            # Best-effort background cleanup; do not crash the API process.
            pass


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    cleanup_task = asyncio.create_task(_empty_meeting_cleanup_loop())
    try:
        yield
    finally:
        cleanup_task.cancel()
        try:
            await cleanup_task
        except asyncio.CancelledError:
            pass


app = FastAPI(
    title="RepoSense AI API",
    description="Intelligent Repository Discovery & Semantic Search API",
    lifespan=lifespan,
)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Enable CORS (Cross-Origin Resource Sharing)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(meetings_router)
app.include_router(collaboration_router)
app.include_router(profile_router)
app.include_router(github_router)

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

# --- AI Agent Endpoints ---

class CodeRunRequest(BaseModel):
    code: str
    language: str = "python"

class CodeModifyRequest(BaseModel):
    code: str
    prompt: str = ""
    action: str = "refactor"
    language: str = "python"

class CodeExplainRequest(BaseModel):
    code: str
    language: str = "python"

class RepoScanRequest(BaseModel):
    github_url: str

@app.post("/api/agent/run")
async def run_agent_code(request: CodeRunRequest):
    """
    Executes Python or JavaScript code snippets safely and returns terminal output, duration, and exit status.
    """
    return agent_service.run_code(request.code, request.language)

@app.post("/api/agent/modify")
async def modify_agent_code(request: CodeModifyRequest):
    """
    AI Agent endpoint for code modifications, refactorings, bug fixes, optimization, and diff patch generation.
    """
    return agent_service.modify_code(request.code, request.prompt, request.action, request.language)

@app.post("/api/agent/explain")
async def explain_agent_code(request: CodeExplainRequest):
    """
    AI Agent endpoint for explaining code architecture, complexity analysis, and recommendations.
    """
    return agent_service.explain_code(request.code, request.language)

@app.post("/api/agent/scan-repo")
async def scan_repository_bugs(request: RepoScanRequest):
    """
    AI Agent endpoint to audit any chosen repository for bugs, security vulnerabilities, and generate fix patches.
    """
    return agent_service.scan_repo_bugs(request.github_url)

if __name__ == "__main__":
    import uvicorn
    print("RepoSense API is starting on http://localhost:8000")
    uvicorn.run("src.main:app", host="0.0.0.0", port=8000, reload=True)


