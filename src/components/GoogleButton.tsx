import { useQuery } from '@tanstack/react-query';
import { getAuthProviders, startGoogleOAuth } from '../api/client';

export function GoogleButton({ label }: { label?: string }) {
  const { data } = useQuery({
    queryKey: ['auth-providers'],
    queryFn: getAuthProviders,
    staleTime: 5 * 60 * 1000,
    retry: 0,
  });

  if (!data?.google) return null;

  return (
    <button
      type="button"
      className="button button-google"
      onClick={startGoogleOAuth}
    >
      <svg viewBox="0 0 24 24" aria-hidden="true" width="18" height="18">
        <path
          fill="#4285F4"
          d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47a5.53 5.53 0 0 1-2.4 3.63v3h3.88c2.27-2.09 3.54-5.17 3.54-8.87Z"
        />
        <path
          fill="#34A853"
          d="M12 24c3.24 0 5.95-1.08 7.94-2.91l-3.88-3c-1.08.72-2.45 1.15-4.06 1.15-3.12 0-5.77-2.11-6.71-4.95H1.28v3.09A12 12 0 0 0 12 24Z"
        />
        <path
          fill="#FBBC05"
          d="M5.29 14.29a7.2 7.2 0 0 1 0-4.58V6.62H1.28a12 12 0 0 0 0 10.76l4.01-3.09Z"
        />
        <path
          fill="#EA4335"
          d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.44-3.44A11.97 11.97 0 0 0 12 0 12 12 0 0 0 1.28 6.62l4.01 3.09C6.23 6.86 8.88 4.75 12 4.75Z"
        />
      </svg>
      {label ?? 'Continuar con Google'}
    </button>
  );
}
