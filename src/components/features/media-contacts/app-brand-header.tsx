import { UserCircle2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

interface AppBrandHeaderProps {
  title: string;
  subtitle: string;
  onAddContact: () => void;
  totalCount: number;
}

const AppBrandHeader = ({ title, subtitle, onAddContact, totalCount }: AppBrandHeaderProps) => {
    return (
        <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
                <UserCircle2 className="h-12 w-12 text-slate-800 dark:text-slate-400" />
                <div>
                    <h1 className="text-2xl font-bold leading-tight text-gray-900 dark:text-white">
                        {title}
                    </h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        {subtitle} {totalCount > 0 && `(${totalCount} contacts)`}
                    </p>
                </div>
            </div>
            <Button onClick={onAddContact} className="gap-2">
                <Plus className="h-4 w-4" />
                Add Contact
            </Button>
        </div>
    );
};

export default AppBrandHeader;