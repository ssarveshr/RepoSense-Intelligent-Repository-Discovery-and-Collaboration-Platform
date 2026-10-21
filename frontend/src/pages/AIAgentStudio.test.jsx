import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import AIAgentStudio from './AIAgentStudio';

describe('AIAgentStudio', () => {
  it('renders the agent controls without the marketing hero banner', () => {
    render(
      <MemoryRouter initialEntries={['/ai-agent']}>
        <Routes>
          <Route path="/ai-agent" element={<AIAgentStudio />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.queryByText(/Intelligent Repository Code Agent/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/AI Repo Bug Auditor & Code Execution Agent/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Timeout Limit/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Smart Optimization/i)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Live Code Sandbox & Runner/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Audit Chosen Repo Bugs/i })).toBeInTheDocument();
  });
});
