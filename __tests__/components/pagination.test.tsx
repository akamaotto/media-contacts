import { render, screen } from '@testing-library/react';
import { EnhancedPagination } from '@/components/features/media-contacts/enhanced-pagination';
import { Pagination, PaginationLink } from '@/components/ui/pagination';

describe('Pagination Components', () => {
  describe('EnhancedPagination', () => {
    const defaultProps = {
      currentPage: 1,
      totalPages: 5,
      pageSize: 10,
      totalCount: 50,
      onPageChange: jest.fn(),
      onPageSizeChange: jest.fn(),
    };

    it('renders with theme tokens', () => {
      render(<EnhancedPagination {...defaultProps} />);
      
      const paginationContainer = screen.getByText(/Rows per page/).parentElement?.parentElement?.parentElement;
      expect(paginationContainer).toHaveClass('border-border', 'bg-background');
    });

    it('uses muted-foreground for text elements', () => {
      render(<EnhancedPagination {...defaultProps} />);
      
      const rowsText = screen.getByText(/Rows per page/);
      expect(rowsText).toHaveClass('text-muted-foreground');
      
      const showingText = screen.getByText(/Showing.*of.*contacts/);
      expect(showingText).toHaveClass('text-muted-foreground');
    });

    it('has proper aria labels for navigation', () => {
      render(<EnhancedPagination {...defaultProps} />);
      
      expect(screen.getByLabelText('Go to first page')).toBeInTheDocument();
      expect(screen.getByLabelText('Go to previous page')).toBeInTheDocument();
      expect(screen.getByLabelText('Go to next page')).toBeInTheDocument();
      expect(screen.getByLabelText('Go to last page')).toBeInTheDocument();
    });

    it('disables buttons appropriately', () => {
      render(<EnhancedPagination {...defaultProps} />);
      
      const firstPageBtn = screen.getByLabelText('Go to first page');
      const prevPageBtn = screen.getByLabelText('Go to previous page');
      
      expect(firstPageBtn).toBeDisabled();
      expect(prevPageBtn).toBeDisabled();
    });
  });

  describe('PaginationLink', () => {
    it('sets aria-current for active page', () => {
      render(
        <PaginationLink href="#" isActive>
          1
        </PaginationLink>
      );
      
      const link = screen.getByText('1');
      expect(link).toHaveAttribute('aria-current', 'page');
    });

    it('does not set aria-current for inactive page', () => {
      render(
        <PaginationLink href="#" isActive={false}>
          2
        </PaginationLink>
      );
      
      const link = screen.getByText('2');
      expect(link).not.toHaveAttribute('aria-current');
    });
  });
});
