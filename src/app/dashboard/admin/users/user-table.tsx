"use client";

import React, { useState, useEffect, useImperativeHandle, forwardRef } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { upsertUser, deleteUser } from "./actions";
import { useActionState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Trash2, MoreHorizontal, Edit, Eye } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { UserDetailSheet } from "./user-detail-sheet";

type User = {
  id: string;
  name: string | null;
  email: string;
  role: string;
  createdAt: Date;
  updatedAt: Date;
};

interface UserTableProps {
  users: User[];
}

export interface UserTableRef {
  openAddUserDialog: () => void;
}

const UserTable = forwardRef<UserTableRef, UserTableProps>(({ users }, ref) => {
  const [isOpen, setIsOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [viewingUser, setViewingUser] = useState<User | null>(null);
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

  // Expose handleAddUser to parent component via ref
  useImperativeHandle(ref, () => ({
    openAddUserDialog: handleAddUser
  }));

  const handleEditUser = (user: User) => {
    setEditingUser(user);
    setIsOpen(true);
  };
  
  const handleViewUser = (user: User) => {
    setViewingUser(user);
  };
  
  const handleDeleteUser = (user: User) => {
    setUserToDelete(user);
    setDeleteDialogOpen(true);
  };

  return (
    <div>
      {/* Table with consistent styling matching Media Contacts table */}
      <div className="rounded-md border overflow-hidden">
        <div className="overflow-auto">
          <Table className="relative w-full">
            <TableHeader className="sticky top-0 z-10 bg-white border-b">
              <TableRow>
                <TableHead className="bg-white font-medium">
                  Name
                </TableHead>
                <TableHead className="bg-white font-medium">
                  Email
                </TableHead>
                <TableHead className="bg-white font-medium">
                  Role
                </TableHead>
                <TableHead className="bg-white font-medium text-right">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                    No users found
                  </TableCell>
                </TableRow>
              ) : (
                users.map((user) => (
                  <TableRow 
                    key={user.id} 
                    className="hover:bg-gray-100 cursor-pointer transition-colors"
                    onClick={() => handleViewUser(user)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleViewUser(user);
                      }
                    }}
                    tabIndex={0}
                    role="button"
                    aria-label={`View details for user ${user.name || user.email}`}
                  >
                    <TableCell className="font-medium">
                      {user.name || "-"}
                    </TableCell>
                    <TableCell>
                      {user.email}
                    </TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        user.role === 'ADMIN' 
                          ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                          : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'
                      }`}>
                        {user.role}
                      </span>
                    </TableCell>
                    <TableCell 
                      className="text-right"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">Open menu</span>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleViewUser(user)}>
                            <Eye className="mr-2 h-4 w-4" />
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleEditUser(user)}>
                            <Edit className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                          {user.email !== "akamaotto@gmail.com" && (
                            <DropdownMenuItem 
                              onClick={() => handleDeleteUser(user)}
                              className="text-red-600"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
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
      
      {/* User Detail Sheet */}
      <UserDetailSheet
        isOpen={!!viewingUser}
        onOpenChange={(open) => !open && setViewingUser(null)}
        user={viewingUser}
        onEdit={handleEditUser}
      />
    </div>
  );
});

UserTable.displayName = 'UserTable';

export default UserTable;