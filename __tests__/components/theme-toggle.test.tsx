import { render, screen, fireEvent } from '@testing-library/react';
import { ThemeToggle } from '@/components/theme-toggle';
import { useTheme } from 'next-themes';

// Mock next-themes
jest.mock('next-themes', () => ({
  useTheme: jest.fn(),
}));

describe('ThemeToggle', () => {
  const mockSetTheme = jest.fn();
  const mockUseTheme = useTheme as jest.MockedFunction<typeof useTheme>;

  beforeEach(() => {
    mockUseTheme.mockReturnValue({
      theme: 'light',
      setTheme: mockSetTheme,
      systemTheme: 'light',
      themes: ['light', 'dark', 'system'],
      resolvedTheme: 'light',
    });
    mockSetTheme.mockClear();
  });

  it('renders theme toggle button', () => {
    render(<ThemeToggle />);
    
    const button = screen.getByRole('button', { name: /toggle theme/i });
    expect(button).toBeTruthy();
  });

  it('shows sun icon when theme is light', () => {
    mockUseTheme.mockReturnValueOnce({
      theme: 'light',
      setTheme: mockSetTheme,
      systemTheme: 'light',
      themes: ['light', 'dark', 'system'],
      resolvedTheme: 'light',
    });

    render(<ThemeToggle />);
    
    expect(screen.getByTestId('sun-icon')).toBeTruthy();
  });

  it('shows moon icon when theme is dark', () => {
    mockUseTheme.mockReturnValueOnce({
      theme: 'dark',
      setTheme: mockSetTheme,
      systemTheme: 'light',
      themes: ['light', 'dark', 'system'],
      resolvedTheme: 'dark',
    });

    render(<ThemeToggle />);
    
    expect(screen.getByTestId('moon-icon')).toBeTruthy();
  });

  it('opens dropdown menu on click', () => {
    render(<ThemeToggle />);
    
    const button = screen.getByRole('button', { name: /toggle theme/i });
    fireEvent.click(button);
    
    expect(screen.getByText('Light')).toBeTruthy();
    expect(screen.getByText('Dark')).toBeTruthy();
    expect(screen.getByText('System')).toBeTruthy();
  });

  it('calls setTheme with "light" when light option is clicked', () => {
    render(<ThemeToggle />);
    
    const button = screen.getByRole('button', { name: /toggle theme/i });
    fireEvent.click(button);
    
    const lightOption = screen.getByText('Light');
    fireEvent.click(lightOption);
    
    expect(mockSetTheme).toHaveBeenCalledWith('light');
  });

  it('calls setTheme with "dark" when dark option is clicked', () => {
    render(<ThemeToggle />);
    
    const button = screen.getByRole('button', { name: /toggle theme/i });
    fireEvent.click(button);
    
    const darkOption = screen.getByText('Dark');
    fireEvent.click(darkOption);
    
    expect(mockSetTheme).toHaveBeenCalledWith('dark');
  });

  it('calls setTheme with "system" when system option is clicked', () => {
    render(<ThemeToggle />);
    
    const button = screen.getByRole('button', { name: /toggle theme/i });
    fireEvent.click(button);
    
    const systemOption = screen.getByText('System');
    fireEvent.click(systemOption);
    
    expect(mockSetTheme).toHaveBeenCalledWith('system');
  });
});
