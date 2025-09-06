import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { SortableHeader } from './sortable-header';

describe('SortableHeader', () => {
  const mockOnSort = jest.fn();

  beforeEach(() => {
    mockOnSort.mockClear();
  });

  it('should render children correctly', () => {
    render(
      <table>
        <thead>
          <tr>
            <SortableHeader columnKey="name" onSort={mockOnSort}>
              Name
            </SortableHeader>
          </tr>
        </thead>
      </table>
    );

    expect(screen.getByText('Name')).toBeInTheDocument();
  });

  it('should show sort indicators based on current sort state', () => {
    const { rerender } = render(
      <table>
        <thead>
          <tr>
            <SortableHeader columnKey="name" onSort={mockOnSort}>
              Name
            </SortableHeader>
          </tr>
        </thead>
      </table>
    );

    // Should show default sort icon when not sorted
    expect(screen.getByTestId('arrow-up-down')).toBeInTheDocument();

    // Re-render with ascending sort
    rerender(
      <table>
        <thead>
          <tr>
            <SortableHeader 
              columnKey="name" 
              currentSort={{ key: 'name', dir: 'asc' }} 
              onSort={mockOnSort}
            >
              Name
            </SortableHeader>
          </tr>
        </thead>
      </table>
    );

    // Should show ascending icon when sorted ascending
    expect(screen.getByTestId('chevron-up')).toBeInTheDocument();

    // Re-render with descending sort
    rerender(
      <table>
        <thead>
          <tr>
            <SortableHeader 
              columnKey="name" 
              currentSort={{ key: 'name', dir: 'desc' }} 
              onSort={mockOnSort}
            >
              Name
            </SortableHeader>
          </tr>
        </thead>
      </table>
    );

    // Should show descending icon when sorted descending
    expect(screen.getByTestId('chevron-down')).toBeInTheDocument();
  });

  it('should call onSort when clicked', () => {
    render(
      <table>
        <thead>
          <tr>
            <SortableHeader columnKey="name" onSort={mockOnSort}>
              Name
            </SortableHeader>
          </tr>
        </thead>
      </table>
    );

    fireEvent.click(screen.getByText('Name'));
    expect(mockOnSort).toHaveBeenCalledWith('name', 'asc');
  });

  it('should toggle sort direction when clicking already sorted column', () => {
    render(
      <table>
        <thead>
          <tr>
            <SortableHeader 
              columnKey="name" 
              currentSort={{ key: 'name', dir: 'asc' }} 
              onSort={mockOnSort}
            >
              Name
            </SortableHeader>
          </tr>
        </thead>
      </table>
    );

    fireEvent.click(screen.getByText('Name'));
    expect(mockOnSort).toHaveBeenCalledWith('name', 'desc');
  });

  it('should handle keyboard events', () => {
    render(
      <table>
        <thead>
          <tr>
            <SortableHeader columnKey="name" onSort={mockOnSort}>
              Name
            </SortableHeader>
          </tr>
        </thead>
      </table>
    );

    const header = screen.getByText('Name');
    fireEvent.keyDown(header, { key: 'Enter' });
    expect(mockOnSort).toHaveBeenCalledWith('name', 'asc');

    mockOnSort.mockClear();

    fireEvent.keyDown(header, { key: ' ' }); // Space key
    expect(mockOnSort).toHaveBeenCalledWith('name', 'asc');
  });

  it('should set correct aria-sort attribute', () => {
    const { rerender } = render(
      <table>
        <thead>
          <tr>
            <SortableHeader columnKey="name" onSort={mockOnSort}>
              Name
            </SortableHeader>
          </tr>
        </thead>
      </table>
    );

    const header = screen.getByText('Name');
    expect(header).toHaveAttribute('aria-sort', 'none');

    rerender(
      <table>
        <thead>
          <tr>
            <SortableHeader 
              columnKey="name" 
              currentSort={{ key: 'name', dir: 'asc' }} 
              onSort={mockOnSort}
            >
              Name
            </SortableHeader>
          </tr>
        </thead>
      </table>
    );

    expect(header).toHaveAttribute('aria-sort', 'ascending');

    rerender(
      <table>
        <thead>
          <tr>
            <SortableHeader 
              columnKey="name" 
              currentSort={{ key: 'name', dir: 'desc' }} 
              onSort={mockOnSort}
            >
              Name
            </SortableHeader>
          </tr>
        </thead>
      </table>
    );

    expect(header).toHaveAttribute('aria-sort', 'descending');
  });
});