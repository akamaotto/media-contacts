// Consolidated users actions and hooks - single source of truth from backend

// Server actions
export {
  getUsersAction,
  upsertUserAction,
  deleteUserAction,
  updateProfileAction,
  getCurrentUserAction,
  getUserByIdAction,
  type UserActionResult,
  type UsersListResult,
} from '../../backend/users/actions';

// Client hooks
export {
  useUsers,
  useCurrentUser,
  useUserById,
  useUsersWithFilters,
  useUserForm,
} from '../../backend/users/hooks';

// Repository types and functions
export {
  getUsersFromDb,
  getUserByIdFromDb,
  getUserByEmailFromDb,
  createUserInDb,
  updateUserInDb,
  deleteUserFromDb,
  verifyUserPassword,
  UserError,
  UserErrorType,
  type UserCreateData,
  type UserUpdateData,
  type UserFilters,
} from '../../backend/users/repository';
