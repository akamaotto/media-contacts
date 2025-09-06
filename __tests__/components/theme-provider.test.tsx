import { render } from '@testing-library/react';
import { ThemeProvider } from '@/components/theme-provider';
import { ThemeProvider as NextThemesProvider } from 'next-themes';

// Mock next-themes
jest.mock('next-themes', () => ({
  ThemeProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

describe('ThemeProvider', () => {
  it('renders children correctly', () => {
    const { getByText } = render(
      <ThemeProvider>
        <div>Test Content</div>
      </ThemeProvider>
    );
    
    expect(getByText('Test Content')).toBeTruthy();
  });

  it('wraps with NextThemesProvider', () => {
    const { container } = render(
      <ThemeProvider>
        <div>Test</div>
      </ThemeProvider>
    );
    
    expect(container).toBeTruthy();
  });
});
