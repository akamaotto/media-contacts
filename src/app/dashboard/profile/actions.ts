// Profile actions - server actions only, no client imports

export { 
  updateProfileAction as updateProfile,
} from './server-actions';

// Re-export the state type from the features module (not from a 'use server' file)
export type { UserActionResult as UpdateProfileActionState } from '@/features/users/lib/types';
