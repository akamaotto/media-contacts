'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DashboardChart } from './dashboard-chart';
import { TimeRange } from './dashboard-chart';

interface CategoryChartCardProps {
  timeRange: TimeRange;
}

export function CategoryChartCard({ timeRange }: CategoryChartCardProps) {
  return (
    <Card>
      <CardHeader className="pb-2 px-4 pt-2">
        <CardTitle className="text-base font-semibold">
          Contacts by Category
        </CardTitle>
      </CardHeader>
      <CardContent className="px-2 pb-2 pt-0">
        <DashboardChart
          title=""
          subtitle=""
          chartType="bar"
          dataType="category"
          timeRange={timeRange}
          onTimeRangeChange={() => {}} // No time range change needed here
          showTimeRangeSelector={false}
          hideRefreshButton={true}
          height={180}
          emptyStateMessage="No category assignments found"
          className="border-0 shadow-none"
        />
      </CardContent>
    </Card>
  );
}
