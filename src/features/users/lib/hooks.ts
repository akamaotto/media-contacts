
"use client";

import { useState, useEffect, useCallback } from "react";
import { getFilteredUsers, getUserById } from "./queries";
import type { UserFilters } from "./types";

/**
 * Hook to fetch a list of users, intended for admin use.
 * Includes filtering and manual refetching capabilities.
 */
export function useUsers(filters: UserFilters = {}) {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      // This is a client-side fetch calling a server action under the hood,
      // but for simplicity in this refactor, we'll call the query function directly.
      // In a real scenario, you might have an API route or a server action dedicated to this.
      const result = await getFilteredUsers(filters);
      setUsers(result);
    } catch (err: any) {
      console.error("Error fetching users:", err);
      setError(err.message || "Failed to fetch users");
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, [filters]); // Dependency array on stringified filters

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  return { users, loading, error, refetch: fetchUsers };
}

/**
 * Hook to fetch the current user's profile data.
 */
export function useCurrentUser() {
  const [user, setUser] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCurrentUser = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      // This would typically use `useSession` from next-auth/react
      // For now, we simulate a fetch. A proper implementation would
      // call a server action that gets the session user.
      // const result = await getCurrentUserAction();
      // if (result.success) setUser(result.user);
      // else setError(result.error);
      console.warn("useCurrentUser hook needs to be implemented with next-auth session.");
    } catch (err: any) {
      console.error("Error fetching current user:", err);
      setError(err.message || "Failed to fetch user profile");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCurrentUser();
  }, [fetchCurrentUser]);

  return { user, loading, error, refetch: fetchCurrentUser };
}

/**
 * Hook to fetch a single user by their ID.
 */
export function useUserById(id: string | null) {
  const [user, setUser] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUser = useCallback(async () => {
    if (!id) {
      setUser(null);
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const result = await getUserById(id);
      setUser(result as any);
    } catch (err: any) {
      console.error("Error fetching user:", err);
      setError(err.message || "Failed to fetch user");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  return { user, loading, error, refetch: fetchUser };
}
