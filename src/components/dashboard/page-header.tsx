import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface PageHeaderProps {
  title: string;
  description?: string;
  addButtonLabel: string;
  onAddClick: () => void;
  children?: React.ReactNode;
}

export function PageHeader({
  title,
  description,
  addButtonLabel,
  onAddClick,
  children
}: PageHeaderProps) {
  return (
    <div className="flex items-center justify-between space-y-2">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">{title}</h2>
        {description && (
          <p className="text-muted-foreground">{description}</p>
        )}
      </div>
      <div className="flex items-center space-x-2">
        <Button onClick={onAddClick}>
          <Plus className="mr-2 h-4 w-4" />
          {addButtonLabel}
        </Button>
        {children}
      </div>
    </div>
  );
}