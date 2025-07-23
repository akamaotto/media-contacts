import { Upload, Download, Plus, UserPlus } from "lucide-react";
import { type DashboardActionButton } from "./dashboard-action-buttons";
import { type UserTableRef } from "@/app/(dashboard)/admin/users/user-table";

export function getHomePageButtons(onAddContact: () => void): DashboardActionButton[] {
  return [
    {
      label: "Upload CSV",
      onClick: () => {
        // TODO: Implement CSV upload functionality
        console.log("Upload CSV clicked");
      },
      variant: "outline",
      icon: <Upload className="h-4 w-4" />
    },
    {
      label: "Export CSV",
      onClick: () => {
        // TODO: Implement CSV export functionality
        console.log("Export CSV clicked");
      },
      variant: "outline",
      icon: <Download className="h-4 w-4" />
    },
    {
      label: "Add Media Contact",
      onClick: onAddContact,
      variant: "default",
      icon: <Plus className="h-4 w-4" />
    }
  ];
}

export function getUsersPageButtons(userTableRef: React.RefObject<UserTableRef>): DashboardActionButton[] {
  return [
    {
      label: "Add User",
      onClick: () => {
        userTableRef.current?.openAddUserDialog();
      },
      variant: "default",
      icon: <UserPlus className="h-4 w-4" />
    }
  ];
}

export function getDefaultButtons(): DashboardActionButton[] {
  return [];
}
