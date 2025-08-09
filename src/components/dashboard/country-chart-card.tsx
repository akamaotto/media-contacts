'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DashboardChart } from './dashboard-chart';
import { TimeRange } from './dashboard-chart';
import { BarChart3 } from 'lucide-react';

interface CountryChartCardProps {
  timeRange: TimeRange;
}

export function CountryChartCard({ timeRange }: CountryChartCardProps) {
  return (
    <Card>
      <CardHeader className="pb-2 px-6 pt-2">
        <CardTitle className="text-base font-semibold">
          Contacts by Country
        </CardTitle>
      </CardHeader>
      <CardContent className="px-2 pb-2 pt-0">
        <DashboardChart
          title=""
          subtitle=""
          chartType="bar"
          dataType="country"
          timeRange={timeRange}
          onTimeRangeChange={() => {}} // No time range change needed here
          showTimeRangeSelector={false}
          hideRefreshButton={true}
          height={180}
          emptyStateMessage="No contacts found for the selected time period"
          className="border-0 shadow-none"
        />
      </CardContent>
    </Card>
  );
}
