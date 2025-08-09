'use client';

import { DashboardChart } from './dashboard-chart';
import { TimeRange } from './dashboard-chart';

interface KeyChartsGridProps {
  timeRange: TimeRange;
}

export function KeyChartsGrid({ timeRange }: KeyChartsGridProps) {
  return (
    <div className="space-y-4">
      {/* Contacts by Country Chart */}
      <DashboardChart
        title="Contacts by Country"
        subtitle="Distribution of media contacts across countries"
        chartType="bar"
        dataType="country"
        timeRange={timeRange}
        onTimeRangeChange={() => {}} // No time range change needed here
        showTimeRangeSelector={false}
        height={200}
        emptyStateMessage="No contacts found for the selected time period"
      />
      
      {/* Contacts by Category Chart */}
      <DashboardChart
        title="Contacts by Category"
        subtitle="Distribution across content categories"
        chartType="pie"
        dataType="category"
        timeRange={timeRange}
        onTimeRangeChange={() => {}} // No time range change needed here
        showTimeRangeSelector={false}
        height={200}
        emptyStateMessage="No category assignments found"
      />
    </div>
  );
}
