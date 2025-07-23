// Admin users actions - consolidated from backend/users
// This file now imports from the backend users feature for consistency

export { 
  upsertUserAction as upsertUser,
  deleteUserAction as deleteUser,
  getUsersAction,
} from '@/lib/actions/users';
