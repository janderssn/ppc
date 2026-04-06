export interface Waypoint {
  id: string;
  name: string;
  description?: string;
  radius: number; // meters
  score: number;
  lat: number;
  lng: number;
}

export const INITIAL_WAYPOINTS: Waypoint[] = [];

export interface CompetitionTemplate {
  label: string;
  zipUrl: string;
}

export const TEMPLATES: Record<string, CompetitionTemplate> = {
  sala: {
    label: 'Sala PPC',
    zipUrl: '/templates/SALA_PPC_2026.zip',
  },
  lanzarote: {
    label: 'Lanzarote PPC',
    zipUrl: '/templates/Lanzarote_PPC_2027.zip',
  },
};
