export type UserRole = 'CORPS_COMMANDER' | 'LOGISTICS_OFFICER' | 'EDGE_READ_ONLY';

export interface User {
  username: string;
  role: UserRole;
  rank?: string;
  name?: string;
  sector?: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: {
    username: string;
    role: UserRole;
    name?: string;
    rank?: string;
  };
}
