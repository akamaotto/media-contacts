/// <reference types="@testing-library/jest-dom" />
import { render, screen, fireEvent } from '@testing-library/react';
import { DashboardHeader } from '../components/dashboard/dashboard-header';
import { Session } from 'next-auth';

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter() {
    return {
      push: jest.fn(),
    };
  },
}));

describe('DashboardHeader', () => {
  const mockSession: Session = {
    user: {
      id: '1',
      name: 'Test User',
      email: 'test@example.com',
      role: 'admin',
    } as any,
    expires: '2025-12-31T23:59:59.999Z',
  };

  it('renders the welcome message with user name', () => {
    render(<DashboardHeader session={mockSession} />);
    
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Welcome back, Test User')).toBeInTheDocument();
  });

  it('renders the welcome message with email when name is not available', () => {
    const sessionWithoutName: Session = {
      ...mockSession,
      user: {
        ...mockSession.user,
        name: null,
      } as any,
    };
    
    render(<DashboardHeader session={sessionWithoutName} />);
    
    expect(screen.getByText('Welcome back, test@example.com')).toBeInTheDocument();
  });

  it('renders the Add Contact button', () => {
    render(<DashboardHeader session={mockSession} />);
    
    const button = screen.getByRole('button', { name: /Add Contact/i });
    expect(button).toBeInTheDocument();
    expect(button).toBeEnabled();
  });

  it('disables the button when clicked', () => {
    render(<DashboardHeader session={mockSession} />);
    
    const button = screen.getByRole('button', { name: /Add Contact/i });
    fireEvent.click(button);
    
    expect(button).toBeDisabled();
  });
});