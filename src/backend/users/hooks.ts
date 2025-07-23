"use client";

import { useState, useEffect, useCallback } from "react";
import { getUsersAction, getCurrentUserAction, getUserByIdAction } from "./actions";
import type { UserFilters } from "./repository";

// Hook result types
interface UseUsersResult {
  users: any[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

interface UseCurrentUserResult {
  user: any | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

interface UseUserByIdResult {
  user: any | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Hook to fetch all users (admin only)
 */
export function useUsers(filters: UserFilters = {}): UseUsersResult {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const result = await getUsersAction(filters);
      
      if (result.success && result.users) {
        setUsers(result.users);
      } else {
        setError(result.error || "Failed to fetch users");
        setUsers([]);
      }
    } catch (err) {
      console.error("Error fetching users:", err);
      setError("Failed to fetch users");
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  return {
    users,
    loading,
    error,
    refetch: fetchUsers,
  };
}

/**
 * Hook to fetch current user's profile
 */
export function useCurrentUser(): UseCurrentUserResult {
  const [user, setUser] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCurrentUser = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const result = await getCurrentUserAction();
      
      if (result.success && result.user) {
        setUser(result.user);
      } else {
        setError(result.error || "Failed to fetch user profile");
        setUser(null);
      }
    } catch (err) {
      console.error("Error fetching current user:", err);
      setError("Failed to fetch user profile");
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCurrentUser();
  }, [fetchCurrentUser]);

  return {
    user,
    loading,
    error,
    refetch: fetchCurrentUser,
  };
}

/**
 * Hook to fetch a specific user by ID (admin only)
 */
export function useUserById(id: string | null): UseUserByIdResult {
  const [user, setUser] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUser = useCallback(async () => {
    if (!id) {
      setUser(null);
      setLoading(false);
      setError(null);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const result = await getUserByIdAction(id);
      
      if (result.success && result.user) {
        setUser(result.user);
      } else {
        setError(result.error || "Failed to fetch user");
        setUser(null);
      }
    } catch (err) {
      console.error("Error fetching user:", err);
      setError("Failed to fetch user");
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  return {
    user,
    loading,
    error,
    refetch: fetchUser,
  };
}

/**
 * Hook for managing users list with search and filtering
 */
export function useUsersWithFilters() {
  const [filters, setFilters] = useState<UserFilters>({});
  const { users, loading, error, refetch } = useUsers(filters);

  const updateFilters = useCallback((newFilters: Partial<UserFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  }, []);

  const clearFilters = useCallback(() => {
    setFilters({});
  }, []);

  const searchUsers = useCallback((search: string) => {
    updateFilters({ search: search || undefined });
  }, [updateFilters]);

  const filterByRole = useCallback((role: "USER" | "ADMIN" | undefined) => {
    updateFilters({ role });
  }, [updateFilters]);

  return {
    users,
    loading,
    error,
    filters,
    refetch,
    updateFilters,
    clearFilters,
    searchUsers,
    filterByRole,
  };
}

/**
 * Hook for form state management (can be used with user forms)
 */
export function useUserForm(initialData: any = {}) {
  const [formData, setFormData] = useState(initialData);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const updateField = useCallback((field: string, value: any) => {
    setFormData((prev: any) => ({ ...prev, [field]: value }));
    // Clear error for this field when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  }, [errors]);

  const setFieldError = useCallback((field: string, error: string) => {
    setErrors(prev => ({ ...prev, [field]: error }));
  }, []);

  const clearErrors = useCallback(() => {
    setErrors({});
  }, []);

  const resetForm = useCallback(() => {
    setFormData(initialData);
    setErrors({});
    setIsSubmitting(false);
  }, [initialData]);

  return {
    formData,
    errors,
    isSubmitting,
    setIsSubmitting,
    updateField,
    setFieldError,
    clearErrors,
    resetForm,
  };
}
