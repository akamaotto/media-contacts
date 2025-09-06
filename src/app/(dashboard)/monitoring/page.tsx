import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Monitoring',
  description: 'System monitoring and diagnostics',
};

export default function MonitoringPage() {
  return (
    <div className="container mx-auto py-6">
      <h1 className="text-xl font-semibold">Monitoring</h1>
      <p className="text-sm text-muted-foreground mt-2">
        AI monitoring features have been removed from this application.
      </p>
    </div>
  );
}
