"use server";

// All user-related actions, including for the profile page,
// are now centralized in the 'users' feature module.

import { updateProfileAction as usersUpdateProfileAction } from '@/features/users/lib/actions';

// Next.js requires only async functions to be exported from a "use server" file.
// Re-exporting can trip the checker, so provide a thin async wrapper.
export async function updateProfileAction(prevState: any, formData: FormData) {
  return usersUpdateProfileAction(prevState, formData);
}