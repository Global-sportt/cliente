import { ApiError, request } from './client';

export type MembershipStatus = 'invited' | 'active' | 'suspended' | 'removed';
export type EstablishmentStatus = 'pending' | 'active' | 'suspended';
export type SpaceStatus = 'active' | 'inactive' | 'maintenance';

/** Membership of the authenticated user, scoped to one establishment. */
export interface MyEstablishment {
  id: string;
  name: string;
  slug: string;
  status: MembershipStatus;
  groups: string[];
}

export interface EstablishmentDetail {
  id: string;
  name: string;
  slug: string;
  timezone: string;
  currency: string;
  status: EstablishmentStatus;
  createdAt: string;
}

export interface OperatingHour {
  dayOfWeek: number;
  opensAtMinutes: number;
  closesAtMinutes: number;
}

/** Response of the tenant space endpoints. */
export interface SpaceSummary {
  id: string;
  name: string;
  slug: string;
  sport: string | null;
  slotMinutes: number;
  bufferMinutes: number;
  /** Fixed hourly rate in minor units, serialized as a decimal string. */
  basePriceMinor: string | null;
  status: SpaceStatus;
  createdAt: string;
  updatedAt: string;
  operatingHours: OperatingHour[];
}

export interface SpaceInput {
  name: string;
  sport: string;
  slotMinutes: number;
  bufferMinutes: number;
  basePriceMinor?: number;
  status: SpaceStatus;
}

export type SpacePatch = Partial<SpaceInput>;

export interface AvailabilitySlot {
  startsAt: string;
  endsAt: string;
  /** Minor units serialized as a decimal string by the API. */
  priceMinor: string;
  currency: string;
  available: boolean;
}

export interface SpaceAvailability {
  date: string;
  timezone: string;
  currency: string;
  spaceId: string;
  slots: AvailabilitySlot[];
}

export const establishmentKeys = {
  mine: ['me', 'establishments'] as const,
  detail: (establishmentId: string) =>
    ['establishment', establishmentId] as const,
  spaces: (establishmentId: string) => ['spaces', establishmentId] as const,
  availability: (establishmentId: string, spaceId: string, date: string) =>
    ['availability', establishmentId, spaceId, date] as const,
};

export function fetchMyEstablishments(): Promise<MyEstablishment[]> {
  return request<MyEstablishment[]>('/me/establishments');
}

export function fetchEstablishment(
  establishmentId: string,
): Promise<EstablishmentDetail> {
  return request<EstablishmentDetail>(
    `/establishments/${encodeURIComponent(establishmentId)}`,
  );
}

export function fetchSpaces(establishmentId: string): Promise<SpaceSummary[]> {
  return request<SpaceSummary[]>(
    `/establishments/${encodeURIComponent(establishmentId)}/spaces`,
  );
}

export function createSpace(
  establishmentId: string,
  input: SpaceInput,
): Promise<SpaceSummary> {
  return request<SpaceSummary>(
    `/establishments/${encodeURIComponent(establishmentId)}/spaces`,
    {
      method: 'POST',
      body: JSON.stringify(input),
    },
  );
}

export function updateSpace(
  establishmentId: string,
  spaceId: string,
  input: SpacePatch,
): Promise<SpaceSummary> {
  return request<SpaceSummary>(
    `/establishments/${encodeURIComponent(establishmentId)}/spaces/${encodeURIComponent(spaceId)}`,
    {
      method: 'PATCH',
      body: JSON.stringify(input),
    },
  );
}

export function fetchSpaceAvailability(
  establishmentId: string,
  spaceId: string,
  date: string,
): Promise<SpaceAvailability> {
  const query = new URLSearchParams({ date });
  return request<SpaceAvailability>(
    `/establishments/${encodeURIComponent(establishmentId)}/spaces/${encodeURIComponent(spaceId)}/availability?${query.toString()}`,
  );
}

/**
 * Panel copy for the two authorization failures a venue operator can hit.
 * Anything else keeps the server message through `Alert`.
 */
export function accessErrorMessage(error: unknown): string | null {
  if (!(error instanceof ApiError)) return null;
  if (error.status === 401) {
    return 'Tu sesión expiró. Vuelve a iniciar sesión para continuar.';
  }
  if (error.status === 403) {
    return error.code === 'TENANT_FORBIDDEN'
      ? 'No tienes una membresía activa en esta sede.'
      : 'Tu membresía no tiene permiso para esta acción. Pide a un dueño que revise tu acceso.';
  }
  return null;
}
