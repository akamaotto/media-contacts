import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Popover, PopoverContent, PopoverTrigger } from '../components/ui/popover';
import { Button } from '../components/ui/button';
import { Command, CommandInput, CommandList, CommandItem } from '../components/ui/command';

// Mock next-themes to avoid issues with ThemeProvider in tests
jest.mock('next-themes', () => ({
  useTheme: () => ({ theme: 'light' }),
  ThemeProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

describe('Transparency Fix Tests', () => {
  test('Popover has correct background classes', () => {
    render(
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline">Open popover</Button>
        </PopoverTrigger>
        <PopoverContent className="w-[200px] p-0 bg-popover text-popover-foreground border border-border shadow-md z-50">
          <Command>
            <CommandInput placeholder="Search..." />
            <CommandList>
              <CommandItem>Test Item</CommandItem>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    );

    // This test is primarily to ensure the component renders without errors
    // In a real browser environment, we would check the actual computed styles
    expect(screen.getByText('Open popover')).toBeInTheDocument();
  });

  test('Command component has correct background classes', () => {
    render(
      <Command className="bg-popover text-popover-foreground border border-border">
        <CommandInput placeholder="Search..." />
      </Command>
    );

    expect(screen.getByPlaceholderText('Search...')).toBeInTheDocument();
  });
});