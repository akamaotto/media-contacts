# Navigation Structure Guide

## 📁 File Structure Explained

### Main Pages (What Users See)

| Route | File Location | Sidebar Label | Purpose |
|-------|---------------|---------------|---------|
| `/` | `/src/app/page.tsx` | **Home** | Media Contacts Table (main page) |
| `/profile` | `/src/app/(dashboard)/profile/page.tsx` | User Dropdown → Profile | User profile settings |
| `/admin/users` | `/src/app/(dashboard)/admin/users/page.tsx` | **Users** | User management (admin only) |
| `/login` | `/src/app/(auth)/login/page.tsx` | - | Login page |
| `/register` | `/src/app/(auth)/register/page.tsx` | - | Registration page |

### Layout Components

| Component | Purpose |
|-----------|---------|
| `/src/components/layout/dashboard-layout.tsx` | Main layout wrapper (sidebar + content) |
| `/src/components/layout/media-contacts-sidebar.tsx` | Sidebar navigation |
| `/src/components/layout/nav-main.tsx` | Main navigation items (Home, Users) |
| `/src/components/layout/nav-user.tsx` | User dropdown menu |

## 🎯 Key Points

1. **Home Page** (`/`) = Media Contacts Table
   - This is your main application page
   - Shows the media contacts data table
   - Accessible via "Home" in sidebar

2. **Users Page** (`/admin/users`) = User Management
   - Admin-only page for managing users
   - Accessible via "Users" in sidebar

3. **Dashboard Layout** = The wrapper around all authenticated pages
   - Provides sidebar, breadcrumbs, and layout structure
   - NOT a separate page, just a layout component

## 🔧 Recent Changes

- ✅ Removed unused `/src/app/dashboard/page.tsx` (was leftover from template)
- ✅ Fixed breadcrumb to show "Home" instead of "Dashboard" for consistency
- ✅ Removed title cards from all pages for better space utilization

## 🎨 Navigation Flow

```
Login → Home (Media Contacts Table)
         ├── Sidebar: Home → stays on same page
         ├── Sidebar: Users → /admin/users (admin only)
         └── User Menu: Profile → /profile
```

This structure is now clean, consistent, and contributor-friendly!
