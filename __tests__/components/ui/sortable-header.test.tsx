import React from 'react';
import { render } from '@testing-library/react';
import { SortableHeader } from '@/components/ui/sortable-header';

describe('SortableHeader', () => {
  it('should render children correctly', () => {
    const { getByText } = render(
      <table>
        <thead>
          <tr>
            <SortableHeader columnKey="name" onSort={jest.fn()}>
              Name
            </SortableHeader>
          </tr>
        </thead>
      </table>
    );

    expect(getByText('Name')).toBeTruthy();
  });

  it('should show sort indicators based on current sort state', () => {
    const { container } = render(
      <table>
        <thead>
          <tr>
            <SortableHeader columnKey="name" onSort={jest.fn()}>
              Name
            </SortableHeader>
          </tr>
        </thead>
      </table>
    );

    // Should show default sort icon when not sorted
    expect(container.querySelector('[data-testid="arrow-up-down"]')).toBeTruthy();
  });
});