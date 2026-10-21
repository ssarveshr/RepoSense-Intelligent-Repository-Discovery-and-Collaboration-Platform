import { useLocation } from 'react-router-dom';
import AICodeAgent from '../components/AICodeAgent';

export default function AIAgentStudio() {
  const location = useLocation();
  const repoUrl = location.state?.repoUrl || "";

  return (
    <div className="max-w-6xl mx-auto animate-fade-in-up">
      <AICodeAgent initialRepoUrl={repoUrl} />
    </div>
  );
}
