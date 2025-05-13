export interface User {
  id: string;
  keycloakUserId: string;
  username: string;
  email: string;
  createdTime: string | null;
  updatedTime: string | null;
  deletedTime: string | null;
}
