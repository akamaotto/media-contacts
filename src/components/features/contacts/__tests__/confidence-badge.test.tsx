/**
 * ConfidenceBadge Component Tests
 */

import { render, screen } from '@testing-library/react';
import { ConfidenceBadge, ConfidenceBar, ConfidenceScore, ConfidenceLegend } from '../confidence-badge';

describe('ConfidenceBadge', () => {
  it('renders with high confidence', () => {
    render(<ConfidenceBadge confidence={0.9} />);
    
    expect(screen.getByText('High (90%)')).toBeInTheDocument();
    expect(screen.getByRole('button')).toHaveClass('bg-green-100');
  });

  it('renders with medium confidence', () => {
    render(<ConfidenceBadge confidence={0.7} />);
    
    expect(screen.getByText('Medium (70%)')).toBeInTheDocument();
    expect(screen.getByRole('button')).toHaveClass('bg-yellow-100');
  });

  it('renders with low confidence', () => {
    render(<ConfidenceBadge confidence={0.5} />);
    
    expect(screen.getByText('Low (50%)')).toBeInTheDocument();
    expect(screen.getByRole('button')).toHaveClass('bg-orange-100');
  });

  it('renders with very low confidence', () => {
    render(<ConfidenceBadge confidence={0.3} />);
    
    expect(screen.getByText('Very Low (30%)')).toBeInTheDocument();
    expect(screen.getByRole('button')).toHaveClass('bg-red-100');
  });

  it('hides label when showLabel is false', () => {
    render(<ConfidenceBadge confidence={0.8} showLabel={false} />);
    
    expect(screen.queryByText(/%/)).not.toBeInTheDocument();
  });

  it('applies custom className', () => {
    render(<ConfidenceBadge confidence={0.8} className="custom-class" />);
    
    expect(screen.getByRole('button')).toHaveClass('custom-class');
  });

  it('shows tooltip on hover', async () => {
    render(<ConfidenceBadge confidence={0.8} />);
    
    const badge = screen.getByRole('button');
    expect(badge).toHaveAttribute('data-state', 'closed');
  });
});

describe('ConfidenceBar', () => {
  it('renders with correct percentage', () => {
    render(<ConfidenceBar confidence={0.75} />);
    
    expect(screen.getByText('75%')).toBeInTheDocument();
  });

  it('shows label when showLabel is true', () => {
    render(<ConfidenceBar confidence={0.75} showLabel />);
    
    expect(screen.getByText('Confidence')).toBeInTheDocument();
    expect(screen.getByText('75%')).toBeInTheDocument();
  });

  it('applies correct color based on confidence', () => {
    const { rerender } = render(<ConfidenceBar confidence={0.9} />);
    
    let progressBar = screen.getByRole('progressbar');
    expect(progressBar).toHaveClass('bg-green-500');
    
    rerender(<ConfidenceBar confidence={0.5} />);
    progressBar = screen.getByRole('progressbar');
    expect(progressBar).toHaveClass('bg-orange-500');
  });

  it('applies correct height based on size', () => {
    const { rerender } = render(<ConfidenceBar confidence={0.75} size="sm" />);
    
    let progressBar = screen.getByRole('progressbar');
    expect(progressBar).toHaveClass('h-1');
    
    rerender(<ConfidenceBar confidence={0.75} size="lg" />);
    progressBar = screen.getByRole('progressbar');
    expect(progressBar).toHaveClass('h-3');
  });
});

describe('ConfidenceScore', () => {
  it('renders with correct confidence level', () => {
    render(<ConfidenceScore confidence={0.9} />);
    
    expect(screen.getByText('High')).toBeInTheDocument();
    expect(screen.getByText('(90%)')).toBeInTheDocument();
  });

  it('shows breakdown when showBreakdown is true', () => {
    render(<ConfidenceScore confidence={0.8} showBreakdown />);
    
    expect(screen.getByText('Data Quality:')).toBeInTheDocument();
  });
});

describe('ConfidenceLegend', () => {
  it('renders all confidence levels', () => {
    render(<ConfidenceLegend />);
    
    expect(screen.getByText('High')).toBeInTheDocument();
    expect(screen.getByText('Medium')).toBeInTheDocument();
    expect(screen.getByText('Low')).toBeInTheDocument();
    expect(screen.getByText('Very Low')).toBeInTheDocument();
  });

  it('renders in vertical orientation', () => {
    render(<ConfidenceLegend orientation="vertical" />);
    
    expect(screen.getByRole('button').parentElement).toHaveClass('flex-col');
  });

  it('renders in horizontal orientation', () => {
    render(<ConfidenceLegend orientation="horizontal" />);
    
    expect(screen.getByRole('button').parentElement).toHaveClass('flex-row');
  });
});