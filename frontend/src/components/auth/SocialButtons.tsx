import { API_URL } from '@/lib/api';

const providers = [
  {
    id: 'google',
    label: 'Google',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden>
        <path fill="#EA4335" d="M12 10.2v3.9h5.5c-.2 1.3-1.6 3.8-5.5 3.8-3.3 0-6-2.7-6-6.1s2.7-6.1 6-6.1c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.7 3.3 14.6 2.4 12 2.4 6.8 2.4 2.6 6.6 2.6 11.8S6.8 21.2 12 21.2c5.4 0 9-3.8 9-9.1 0-.6-.1-1.1-.2-1.9H12z" />
      </svg>
    ),
  },
  {
    id: 'github',
    label: 'GitHub',
    icon: (
      <svg width="20" height="20" viewBox="0 0 16 16" fill="currentColor" aria-hidden>
        <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
      </svg>
    ),
  },
  {
    id: 'linkedin',
    label: 'LinkedIn',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden>
        <rect x="2" y="2" width="20" height="20" rx="3" fill="#0A66C2" />
        <rect x="5.5" y="10" width="3" height="8.5" fill="#fff" />
        <circle cx="7" cy="6.8" r="1.8" fill="#fff" />
        <path fill="#fff" d="M11 10h2.9v1.2c.5-.8 1.5-1.4 2.9-1.4 2.6 0 3.2 1.7 3.2 4v4.7h-3v-4.2c0-1-.1-2.1-1.4-2.1s-1.6 1-1.6 2.1v4.2H11z" />
      </svg>
    ),
  },
];

export function SocialButtons() {
  return (
    <div>
      <div className="my-6 flex items-center gap-3 text-xs uppercase tracking-wider text-muted">
        <span className="h-px flex-1 bg-current opacity-30" />
        or continue with
        <span className="h-px flex-1 bg-current opacity-30" />
      </div>
      <div className="grid grid-cols-3 gap-3">
        {providers.map((p) => (
          // Full-page navigation: the backend redirects to the provider's consent screen
          <a key={p.id} href={`${API_URL}/auth/${p.id}`} aria-label={`Continue with ${p.label}`} className="social-btn flex items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium">
            {p.icon}
            <span className="hidden sm:inline">{p.label}</span>
          </a>
        ))}
      </div>
    </div>
  );
}
