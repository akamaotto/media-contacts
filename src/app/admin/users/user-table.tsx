"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/sonner";
import { upsertUser, deleteUser } from "./actions";
import { useActionState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Trash2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type User = {
  id: string;
  name: string | null;
  email: string;
  role: string;
  createdAt: Date;
};

export default function UserTable({ users }: { users: User[] }) {
  const [isOpen, setIsOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [formState, formAction] = useActionState(upsertUser, { success: false });
  const [deleteFormState, deleteFormAction] = useActionState(deleteUser, { success: false });
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);

  // Handle form submission result
  if (formState.success) {
    toast.success(editingUser ? "User updated" : "User created");
    setIsOpen(false);
    setEditingUser(null);
    // Reset form state
    formState.success = false;
  } else if (formState.error) {
    toast.error(formState.error);
  }
  
  // Function to close the delete dialog
  const closeDeleteDialog = () => {
    setDeleteDialogOpen(false);
    setUserToDelete(null);
  };
  
  // Use useEffect to handle state changes
  useEffect(() => {
    if (deleteFormState.success) {
      toast.success("User deleted");
      closeDeleteDialog();
      // Reset form state
      deleteFormState.success = false;
      
      // Force a page reload to refresh the user list
      window.location.reload();
    } else if (deleteFormState.error) {
      toast.error(deleteFormState.error);
    }
  }, [deleteFormState]);

  const handleAddUser = () => {
    setEditingUser(null);
    setIsOpen(true);
  };

  const handleEditUser = (user: User) => {
    setEditingUser(user);
    setIsOpen(true);
  };
  
  const handleDeleteUser = (user: User) => {
    setUserToDelete(user);
    setDeleteDialogOpen(true);
  };

  return (
    <div>
      <div className="flex justify-end mb-4">
        <Button onClick={handleAddUser}>Add User</Button>
      </div>

      <div className="rounded-md border">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50 dark:bg-gray-800">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Email
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Role
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
            {users.map((user) => (
              <tr key={user.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  {user.name || "-"}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  {user.email}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  {user.role}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEditUser(user)}
                    >
                      Edit
                    </Button>
                    {user.email !== "akamaotto@gmail.com" && (
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDeleteUser(user)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingUser ? "Edit User" : "Add New User"}
            </DialogTitle>
          </DialogHeader>
          <form action={formAction} className="space-y-4">
            {editingUser && (
              <input type="hidden" name="id" value={editingUser.id} />
            )}
            <div>
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                name="name"
                defaultValue={editingUser?.name || ""}
                required
              />
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                defaultValue={editingUser?.email || ""}
                required
              />
            </div>
            <div>
              <Label htmlFor="password">
                {editingUser ? "New Password (leave blank to keep current)" : "Password"}
              </Label>
              <Input
                id="password"
                name="password"
                type="password"
                required={!editingUser}
              />
            </div>
            <div>
              <Label htmlFor="role">Role</Label>
              <Select name="role" defaultValue={editingUser?.role || "USER"}>
                <SelectTrigger>
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="USER">User</SelectItem>
                  <SelectItem value="ADMIN">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit">Save</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
      
      <AlertDialog open={deleteDialogOpen} onOpenChange={closeDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete User</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {userToDelete?.name || userToDelete?.email}? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button 
              variant="outline" 
              onClick={closeDeleteDialog}
            >
              Cancel
            </Button>
            <form action={deleteFormAction}>
              <input type="hidden" name="id" value={userToDelete?.id || ""} />
              <input type="hidden" name="email" value={userToDelete?.email || ""} />
              <Button variant="destructive" type="submit">
                Delete
              </Button>
            </form>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
