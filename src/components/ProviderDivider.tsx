import { useQuery } from '@tanstack/react-query';
import { getAuthProviders } from '../api/client';

export function ProviderDivider() {
  const { data } = useQuery({
    queryKey: ['auth-providers'],
    queryFn: getAuthProviders,
    staleTime: 5 * 60 * 1000,
    retry: 0,
  });

  if (!data?.google) return null;

  return (
    <div className="divider">
      <span>o con tu correo</span>
    </div>
  );
}
