export interface Shelter {
  id: string;
  name: string;
  kind: 'shelter' | 'cover';
  address: string;
  lat: number;
  lng: number;
  capacity?: number;
}

export interface ShelterDataset {
  source: string;
  fetchedAt: string;
  features: Shelter[];
  /** true when this is the bundled placeholder, not real data */
  sample?: boolean;
}
