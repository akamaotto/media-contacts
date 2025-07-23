interface DashboardHeadingProps {
  title: string;
  subtitle: string;
}

export function DashboardHeading({ title, subtitle }: DashboardHeadingProps) {
  return (
    <div className="flex flex-col">
      <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
      <p className="text-muted-foreground">{subtitle}</p>
    </div>
  );
}
