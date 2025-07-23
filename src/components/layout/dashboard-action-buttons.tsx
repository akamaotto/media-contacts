import { Button } from "@/components/ui/button";

export interface DashboardActionButton {
  label: string;
  onClick: () => void;
  variant?: "default" | "outline" | "secondary" | "ghost" | "link" | "destructive";
  icon?: React.ReactNode;
}

interface DashboardActionButtonsProps {
  buttons: DashboardActionButton[];
}

export function DashboardActionButtons({ buttons }: DashboardActionButtonsProps) {
  if (buttons.length === 0) {
    return null;
  }

  return (
    <div className="flex items-center gap-2">
      {buttons.map((button, index) => (
        <Button
          key={index}
          variant={button.variant || "default"}
          onClick={button.onClick}
          className="flex items-center gap-2"
        >
          {button.icon && button.icon}
          {button.label}
        </Button>
      ))}
    </div>
  );
}
