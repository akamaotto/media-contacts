import { UserCircle2 } from "lucide-react";

const AppBrandHeader = () => {
    return (
        <div className="flex items-center space-x-4">
            <UserCircle2 className="h-12 w-12 text-slate-800 dark:text-slate-400" />
            <div>
                <h1 className="text-2xl font-bold leading-tight text-gray-900 dark:text-white">
                    Media Contacts Manager
                </h1>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                    Manage your journalist and media relationships
                </p>
            </div>
        </div>
    );
};

export default AppBrandHeader;