// Admin users actions - consolidated from backend/users
// This file now imports from the backend users feature for consistency

export { 
  upsertUserAction as upsertUser,
  deleteUserAction as deleteUser,
  getFilteredUsers as getUsersAction,
} from '@/lib/actions/users';
