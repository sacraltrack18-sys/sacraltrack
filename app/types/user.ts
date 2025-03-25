export interface User {
  id: string;
  email: string;
  phone?: string;
  email_verified: boolean;
  phone_verified: boolean;
  // ... other user fields
} 