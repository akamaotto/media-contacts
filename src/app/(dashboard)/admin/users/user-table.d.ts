declare module './user-table' {
  type User = {
    id: string;
    name: string | null;
    email: string;
    role: string;
    createdAt: Date;
  };

  export default function UserTable({ users }: { users: User[] }): JSX.Element;
}
