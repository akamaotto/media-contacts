import { DashboardHeading } from "./dashboard-heading";
import { DashboardActionButtons, type DashboardActionButton } from "./dashboard-action-buttons";

interface DashboardLayoutTitleProps {
  title: string;
  subtitle: string;
  buttons: DashboardActionButton[];
}

export function DashboardLayoutTitle({ title, subtitle, buttons }: DashboardLayoutTitleProps) {
  return (
    <div className="flex items-center justify-between px-4 py-2">
      <DashboardHeading title={title} subtitle={subtitle} />
      <DashboardActionButtons buttons={buttons} />
    </div>
  );
}
