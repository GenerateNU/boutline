export interface FencerProfile {
  firstName: string;
  lastName: string;
  club: string;
}

export function fencerProfileBody({ firstName, lastName, club }: FencerProfile) {
  const trimmedClub = club.trim();
  // Lists read `team`; event results read `primaryClub`.
  return {
    firstName: firstName.trim(),
    lastName: lastName.trim(),
    team: trimmedClub,
    primaryClub: trimmedClub,
  };
}
