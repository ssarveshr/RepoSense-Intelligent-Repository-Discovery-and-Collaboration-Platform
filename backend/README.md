# RepoSense Backend

The RepoSense backend is a FastAPI-powered intelligence engine that handles repository analysis, semantic search, and AI-powered summarization.

## Architecture

The backend follows a **Clean Architecture** pattern, separating concerns into distinct layers:

- **API Layer (`src/main.py`)**: Entry point for FastAPI. Handles request routing, CORS configuration, and endpoint definitions.
- **Services Layer (`src/services/`)**: Contains core business logic.
  - `search_service.py`: Implements hybrid semantic search using ChromaDB and Sentence-Transformers.
  - `summarizer_service.py`: Coordinates with Ollama to generate repository summaries.
  - `crawler_service.py`: Background utility to seed the database with trending repositories.
- **Integrations Layer (`src/integrations/`)**: Manages external service communication.
  - `github.py`: Interfaces with the GitHub API to fetch repository metadata, READMEs, and file trees.
- **Utils Layer (`src/utils/`)**:
  - `repo_cli.py`: A custom CLI tool for local repository management and publishing to the discovery engine.

## Data Flow: Summarization Pipeline

1. **Request**: The API receives a GitHub URL via `/summarize-github`.
2. **Analysis**: The `GitHubAnalyzer` in the integrations layer fetches repository metadata, configuration files, and README content without cloning the repo.
3. **Generation**: The extracted data is sent to the `RepoSummarizer` service.
4. **LLM Processing**: The service builds a structured prompt for **llama3** (via Ollama) to generate a JSON summary.
5. **Response**: The final structured summary (purpose, tech stack, architecture, etc.) is returned to the frontend.

## Setup & Configuration

### Prerequisites
- Python 3.9+
- [Ollama](https://ollama.com/) with `llama3:8b` model installed

### Installation
1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
3. Ensure Ollama is running:
   ```bash
   ollama serve
   ollama run llama3:8b
   ```

## Running the Backend
To start the API server locally:
```bash
# From the backend/ directory
python -m src.main
```
The API will be available at `http://localhost:8000`.

## Storage
- **`storage/repo_db/`**: Persistent vector database for repository embeddings (ChromaDB).
