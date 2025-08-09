import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { DashboardChart } from '@/components/dashboard/dashboard-chart';

// Mock fetch
global.fetch = jest.fn();

// Mock recharts components
jest.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: any) => <div data-testid="responsive-container">{children}</div>,
  PieChart: ({ children }: any) => <div data-testid="pie-chart">{children}</div>,
  Pie: () => <div data-testid="pie" />,
  BarChart: ({ children }: any) => <div data-testid="bar-chart">{children}</div>,
  Bar: () => <div data-testid="bar" />,
  XAxis: () => <div data-testid="x-axis" />,
  YAxis: () => <div data-testid="y-axis" />,
  CartesianGrid: () => <div data-testid="cartesian-grid" />,
  Tooltip: () => <div data-testid="tooltip" />,
  Cell: () => <div data-testid="cell" />,
}));

describe('DashboardChart', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render loading state initially', () => {
    (fetch as jest.Mock).mockImplementation(() => new Promise(() => {})); // Never resolves

    render(
      <DashboardChart
        title="Test Chart"
        chartType="pie"
        dataType="category"
        timeRange="30d"
      />
    );

    expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
  });

  it('should render pie chart with data', async () => {
    const mockData = {
      type: 'category',
      timeRange: '30d',
      data: [
        { label: 'Technology', value: 10, color: '#3B82F6' },
        { label: 'Business', value: 5, color: '#EF4444' },
      ],
      timestamp: '2025-01-01T00:00:00Z',
    };

    (fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockData),
    });

    render(
      <DashboardChart
        title="Categories Chart"
        chartType="pie"
        dataType="category"
        timeRange="30d"
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId('pie-chart')).toBeInTheDocument();
      expect(screen.getByTestId('pie')).toBeInTheDocument();
    });

    expect(fetch).toHaveBeenCalledWith('/api/dashboard/charts?type=category&timeRange=30d');
  });

  it('should render bar chart with data', async () => {
    const mockData = {
      type: 'country',
      timeRange: '7d',
      data: [
        { label: 'United States', value: 15, color: '#3B82F6' },
        { label: 'Canada', value: 8, color: '#3B82F6' },
      ],
      timestamp: '2025-01-01T00:00:00Z',
    };

    (fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockData),
    });

    render(
      <DashboardChart
        title="Countries Chart"
        chartType="bar"
        dataType="country"
        timeRange="7d"
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId('bar-chart')).toBeInTheDocument();
      expect(screen.getByTestId('bar')).toBeInTheDocument();
      expect(screen.getByTestId('x-axis')).toBeInTheDocument();
      expect(screen.getByTestId('y-axis')).toBeInTheDocument();
    });
  });

  it('should render error state when fetch fails', async () => {
    (fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

    render(
      <DashboardChart
        title="Test Chart"
        chartType="pie"
        dataType="category"
        timeRange="30d"
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Failed to load chart data')).toBeInTheDocument();
      expect(screen.getByText('Try Again')).toBeInTheDocument();
    });
  });

  it('should render empty state when no data', async () => {
    const mockData = {
      type: 'category',
      timeRange: '30d',
      data: [],
      timestamp: '2025-01-01T00:00:00Z',
    };

    (fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockData),
    });

    render(
      <DashboardChart
        title="Empty Chart"
        chartType="pie"
        dataType="category"
        timeRange="30d"
        emptyStateMessage="No categories found"
      />
    );

    await waitFor(() => {
      expect(screen.getByText('No categories found')).toBeInTheDocument();
    });
  });

  it('should handle API error responses', async () => {
    (fetch as jest.Mock).mockResolvedValue({
      ok: false,
      statusText: 'Internal Server Error',
    });

    render(
      <DashboardChart
        title="Test Chart"
        chartType="pie"
        dataType="category"
        timeRange="30d"
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Failed to fetch chart data: Internal Server Error')).toBeInTheDocument();
    });
  });
});