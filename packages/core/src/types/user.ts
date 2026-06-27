export interface HomePort {
  regionId: string;
  portId: string;
}

export interface UserProfile {
  uid: string;

  displayName: string;
  photoUrl?: string;

  boat?: string;
  homePort?: HomePort;
  website?: string;
}
