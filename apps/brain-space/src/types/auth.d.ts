import { Session } from "@auth0/nextjs-auth0";

declare module "@auth0/nextjs-auth0" {
  interface Claims {
    sub: string;
    aud?: string[];
    email?: string;
    email_verified?: boolean;
    name?: string;
    nickname?: string;
    picture?: string;
    updated_at?: string;
    iss?: string;
    iat?: number;
    exp?: number;
    nonce?: string;
    sid?: string;
    azp?: string;
    auth_time?: number;
    s_hash?: string;
    at_hash?: string;
    c_hash?: string;
  }

  interface User extends Claims {
    sub: string; // Auth0 user ID (required)
    email: string; // Email address (required)
    email_verified: boolean; // Whether email is verified
    name?: string; // Full name
    nickname?: string; // Username or nickname
    picture?: string; // Profile picture URL
    updated_at?: string; // Last update timestamp
    org_id?: string; // Organization ID
    locale?: string; // User's locale
    given_name?: string; // First name
    family_name?: string; // Last name
    middle_name?: string; // Middle name
    preferred_username?: string; // Preferred username
    website?: string; // Website URL
    gender?: string; // Gender
    birthdate?: string; // Birth date
    zoneinfo?: string; // Timezone
    phone_number?: string; // Phone number
    phone_verified?: boolean; // Whether phone is verified
    address?: {
      country?: string;
      formatted?: string;
      locality?: string;
      postal_code?: string;
      primary?: boolean;
      region?: string;
      street_address?: string;
    };
    [key: string]: unknown; // Allow for custom claims
  }

  interface Session {
    user: User;
    idToken?: string;
    accessToken?: string;
    refreshToken?: string;
    accessTokenExpiresAt?: number;
    refreshTokenExpiresAt?: number;
    isAuthenticated: boolean;
    error?: Error | undefined;
  }

  interface SessionContext {
    session: Session | null | undefined;
    isLoading: boolean;
    error?: Error | undefined;
  }

  interface WithPageAuthRequiredOptions {
    returnTo?: string;
    onRedirecting?: () => JSX.Element;
    onError?: (error: Error) => JSX.Element;
  }
}
