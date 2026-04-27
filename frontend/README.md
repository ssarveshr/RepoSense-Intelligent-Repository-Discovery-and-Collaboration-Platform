# RepoSense Frontend

The RepoSense frontend is a modern, responsive React application built with Vite and Tailwind CSS. It provides an intuitive interface for discovering repositories and generating AI summaries.

## Architecture

The frontend is structured to keep UI components separate from business logic and API communication:

- **Pages (`src/pages/`)**: Main route components.
  - `Home.jsx`: The "Discover" feed with semantic search and category filtering.
  - `GitHubSummarizer.jsx`: Interface for deep repository analysis via URL.
  - `RepositoryDetails.jsx`: Detailed view for specific repository findings.
  - `Profile.jsx`: User-specific data and settings.
- **Components (`src/components/`)**:
  - `icons/`: Centralized SVG icon components for a consistent visual language.
- **Services (`src/services/`)**:
  - `api.js`: Centralized API service for communicating with the backend. Handles all `fetch` logic and endpoint centralization.
- **Styles (`src/styles/`)**: Global CSS and Tailwind configurations.

## User Flow: Repository Summarization

1. **Input**: User enters a GitHub URL in the `GitHubSummarizer` page.
2. **Validation**: The frontend validates the URL format before sending it to the backend.
3. **API Call**: Use `summarizeRepo()` from `api.js` to send a POST request to the backend.
4. **Loading State**: A responsive AI loading state is shown while the LLM processes the repo.
5. **Display**: The returned JSON summary is parsed and displayed in structured sections (Architecture, Tech Stack, Key Components, etc.).

## Setup & Running

### Installation
1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```

### Development
Start the development server:
```bash
npm run dev
```
The application will be accessible at `http://localhost:5173`.

### Build
To create a production build:
```bash
npm run build
```

## State Management
- Local state is managed using React hooks (`useState`, `useEffect`).
- Navigation and routing are handled by `react-router-dom`.
