import { Link } from 'react-router-dom';

const focusRing =
  'focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-gray-950';

const features = [
  {
    title: 'Discover Open-Source Projects',
    body: 'Search GitHub repositories by meaning, not just keywords, and browse a trending feed from the RepoSense index.',
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M21 21l-5.2-5.2M10.5 18a7.5 7.5 0 100-15 7.5 7.5 0 000 15z" />
      </svg>
    ),
  },
  {
    title: 'AI-Powered Code Summarization',
    body: 'Paste a GitHub URL to generate an AI summary of a repository’s purpose, structure, and important files—without cloning it locally.',
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />
      </svg>
    ),
  },
  {
    title: 'Developer Profiles',
    body: 'Maintain a GitHub-inspired profile with your display name, username, bio, skills, and connected GitHub account.',
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM4 20a8 8 0 0116 0" />
      </svg>
    ),
  },
  {
    title: 'Collaborative Meetings',
    body: 'Create and join LiveKit meetings, share join codes, and invite GitHub collaborators for technical discussions.',
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M15 10l4.5-2.5v9L15 14M5 7h10a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2V9a2 2 0 012-2z" />
      </svg>
    ),
  },
  {
    title: 'AI Developer Assistant',
    body: 'Use the AI Code Agent to explain snippets, request code changes, and audit a GitHub repository for issues.',
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M8 9l3 3-3 3m5 0h3M5 5h14a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2z" />
      </svg>
    ),
  },
  {
    title: 'GitHub Integration',
    body: 'Connect GitHub with OAuth to list repositories and collaborators used in summarizer, agent, and meeting workflows.',
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M13.828 10.172a4 4 0 010 5.656l-1.414 1.414a4 4 0 01-5.656-5.656l1.06-1.06M10.172 13.828a4 4 0 010-5.656l1.414-1.414a4 4 0 015.656 5.656l-1.06 1.06" />
      </svg>
    ),
  },
];

const steps = [
  {
    n: '01',
    title: 'Discover',
    body: 'Find projects and codebases relevant to your interests with semantic search and a trending feed.',
  },
  {
    n: '02',
    title: 'Understand',
    body: 'Use AI summaries and the code agent to explore structure, purpose, and implementation details.',
  },
  {
    n: '03',
    title: 'Collaborate',
    body: 'Connect with teammates in LiveKit meetings and share repository context from your GitHub account.',
  },
];

function PrimaryCta({ children, className = '' }) {
  return (
    <Link
      to="/sign-up"
      className={`cursor-pointer inline-flex items-center justify-center px-6 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold hover:from-blue-700 hover:to-indigo-700 transition-colors duration-200 motion-reduce:transition-none ${focusRing} ${className}`}
    >
      {children}
    </Link>
  );
}

export default function PublicLanding() {
  return (
    <div className="space-y-24 pb-8 animate-fade-in-up">
      <section className="text-center pt-6 sm:pt-10 space-y-8">
        <p className="text-xs sm:text-sm font-semibold tracking-[0.18em] text-blue-600 dark:text-blue-400">
          AI-POWERED DEVELOPER DISCOVERY
        </p>
        <h1 className="text-3xl sm:text-5xl md:text-[3.25rem] font-bold tracking-tight max-w-4xl mx-auto leading-tight">
          Understand{' '}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-indigo-500">Code</span>
          . Discover{' '}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-indigo-500">Projects</span>
          . Build Better.
        </h1>
        <p className="text-base sm:text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto leading-relaxed">
          RepoSense helps developers explore open-source repositories, understand unfamiliar codebases with
          AI-powered summaries, and collaborate with teammates through integrated developer tools.
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <PrimaryCta>Get Started</PrimaryCta>
          <Link
            to="/sign-in"
            className={`cursor-pointer inline-flex items-center justify-center px-6 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 font-semibold text-gray-800 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors duration-200 motion-reduce:transition-none ${focusRing}`}
          >
            Sign In
          </Link>
        </div>
      </section>

      <section aria-labelledby="landing-features-heading" className="space-y-8">
        <div className="text-center max-w-2xl mx-auto space-y-2">
          <h2 id="landing-features-heading" className="text-2xl sm:text-3xl font-bold tracking-tight">
            Built for how developers actually work
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Every capability below is available in the signed-in product today.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {features.map((feature) => (
            <article
              key={feature.title}
              className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 space-y-3 hover:border-blue-200 dark:hover:border-blue-900/60 transition-colors duration-200 motion-reduce:transition-none"
            >
              <div className="w-11 h-11 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-300 flex items-center justify-center">
                {feature.icon}
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{feature.title}</h3>
              <p className="text-sm leading-relaxed text-gray-600 dark:text-gray-400">{feature.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section aria-labelledby="landing-steps-heading" className="space-y-8">
        <h2 id="landing-steps-heading" className="text-2xl sm:text-3xl font-bold tracking-tight text-center">
          How it works
        </h2>
        <ol className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 relative">
          {steps.map((step, index) => (
            <li key={step.n} className="relative rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 space-y-3">
              {index < steps.length - 1 ? (
                <span
                  className="hidden md:block absolute top-10 left-full w-8 h-px bg-gray-200 dark:bg-gray-800"
                  aria-hidden="true"
                />
              ) : null}
              <p className="text-sm font-semibold tracking-widest text-blue-600 dark:text-blue-400">{step.n}</p>
              <h3 className="text-xl font-semibold">{step.title}</h3>
              <p className="text-sm leading-relaxed text-gray-600 dark:text-gray-400">{step.body}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="rounded-3xl border border-blue-100 dark:border-blue-900/40 bg-gradient-to-br from-blue-50 via-white to-indigo-50 dark:from-blue-950/30 dark:via-gray-950 dark:to-indigo-950/20 px-6 py-12 sm:px-12 text-center space-y-5">
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Ready to explore code differently?</h2>
        <p className="text-gray-600 dark:text-gray-400 max-w-xl mx-auto">
          Join RepoSense to discover projects, understand codebases, and make your development workflow more productive.
        </p>
        <PrimaryCta>Get Started</PrimaryCta>
      </section>
    </div>
  );
}
