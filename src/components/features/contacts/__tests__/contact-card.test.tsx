/**
 * ContactCard Component Tests
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ContactCard, ContactCardSkeleton } from '../contact-card';
import { Contact } from '../types';

// Mock contact data
const mockContact: Contact = {
  id: 'contact-1',
  name: 'John Doe',
  title: 'Software Engineer',
  bio: 'Experienced software engineer with a passion for creating great products.',
  email: 'john.doe@example.com',
  confidenceScore: 0.85,
  qualityScore: 0.9,
  verificationStatus: 'CONFIRMED',
  relevanceScore: 0.8,
  sourceUrl: 'https://example.com/john-doe',
  extractionMethod: 'AI_BASED',
  imported: false,
  favorite: false,
  tags: ['developer', 'javascript'],
  notes: 'Met at tech conference',
  createdAt: new Date('2023-01-01'),
  contactInfo: {
    company: 'Tech Corp',
    phone: '+1-555-123-4567',
    linkedin: 'https://linkedin.com/in/johndoe',
    twitter: 'https://twitter.com/johndoe',
    website: 'https://johndoe.dev',
    location: 'San Francisco, CA',
    languages: ['English', 'Spanish'],
  },
  socialProfiles: [
    {
      platform: 'linkedin',
      handle: 'johndoe',
      url: 'https://linkedin.com/in/johndoe',
      verified: true,
      followers: 1000,
      description: 'Software Engineer at Tech Corp',
    },
  ],
};

describe('ContactCard', () => {
  it('renders contact information correctly', () => {
    render(
      <ContactCard
        contact={mockContact}
        onSelect={jest.fn()}
        onPreview={jest.fn()}
      />
    );

    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('Software Engineer')).toBeInTheDocument();
    expect(screen.getByText('Tech Corp')).toBeInTheDocument();
    expect(screen.getByText('john.doe@example.com')).toBeInTheDocument();
  });

  it('renders confidence badge', () => {
    render(
      <ContactCard
        contact={mockContact}
        onSelect={jest.fn()}
        onPreview={jest.fn()}
      />
    );

    expect(screen.getByText('High (85%)')).toBeInTheDocument();
  });

  it('renders verification status', () => {
    render(
      <ContactCard
        contact={mockContact}
        onSelect={jest.fn()}
        onPreview={jest.fn()}
      />
    );

    expect(screen.getByText('Verified')).toBeInTheDocument();
  });

  it('renders tags', () => {
    render(
      <ContactCard
        contact={mockContact}
        onSelect={jest.fn()}
        onPreview={jest.fn()}
      />
    );

    expect(screen.getByText('developer')).toBeInTheDocument();
    expect(screen.getByText('javascript')).toBeInTheDocument();
  });

  it('renders social media links', () => {
    render(
      <ContactCard
        contact={mockContact}
        onSelect={jest.fn()}
        onPreview={jest.fn()}
      />
    );

    expect(screen.getByText('LinkedIn Profile')).toBeInTheDocument();
    expect(screen.getByText('Twitter Profile')).toBeInTheDocument();
  });

  it('handles selection change', async () => {
    const onSelect = jest.fn();
    render(
      <ContactCard
        contact={mockContact}
        onSelect={onSelect}
        onPreview={jest.fn()}
      />
    );

    const checkbox = screen.getByRole('checkbox');
    await userEvent.click(checkbox);

    expect(onSelect).toHaveBeenCalledWith(true);
  });

  it('handles preview click', async () => {
    const onPreview = jest.fn();
    render(
      <ContactCard
        contact={mockContact}
        onSelect={jest.fn()}
        onPreview={onPreview}
      />
    );

    const previewButton = screen.getByText('Preview');
    await userEvent.click(previewButton);

    expect(onPreview).toHaveBeenCalled();
  });

  it('handles favorite toggle', async () => {
    render(
      <ContactCard
        contact={mockContact}
        onSelect={jest.fn()}
        onPreview={jest.fn()}
      />
    );

    const favoriteButton = screen.getByRole('button', { name: /favorite/i });
    await userEvent.click(favoriteButton);

    // Check if the star is filled after clicking
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /favorite/i })).toHaveClass('text-yellow-500');
    });
  });

  it('renders in compact mode', () => {
    render(
      <ContactCard
        contact={mockContact}
        onSelect={jest.fn()}
        onPreview={jest.fn()}
        compact={true}
      />
    );

    // Compact mode should not show detailed information
    expect(screen.queryByText('Bio')).not.toBeInTheDocument();
    expect(screen.queryByText('Tags')).not.toBeInTheDocument();
  });

  it('hides actions when showActions is false', () => {
    render(
      <ContactCard
        contact={mockContact}
        onSelect={jest.fn()}
        onPreview={jest.fn()}
        showActions={false}
      />
    );

    expect(screen.queryByText('Preview')).not.toBeInTheDocument();
    expect(screen.queryByText('Import contact')).not.toBeInTheDocument();
  });

  it('applies selected styling when selected', () => {
    render(
      <ContactCard
        contact={mockContact}
        selected={true}
        onSelect={jest.fn()}
        onPreview={jest.fn()}
      />
    );

    const card = screen.getByRole('article').closest('div');
    expect(card).toHaveClass('ring-2');
  });

  it('handles image error gracefully', async () => {
    const contactWithAvatar = {
      ...mockContact,
      contactInfo: {
        ...mockContact.contactInfo,
        avatar: 'https://example.com/avatar.jpg',
      },
    };

    render(
      <ContactCard
        contact={contactWithAvatar}
        onSelect={jest.fn()}
        onPreview={jest.fn()}
      />
    );

    const avatar = screen.getByRole('img');
    fireEvent.error(avatar);

    // Should fallback to initials
    expect(screen.getByText('JD')).toBeInTheDocument();
  });

  it('renders imported state', () => {
    const importedContact = { ...mockContact, imported: true };
    render(
      <ContactCard
        contact={importedContact}
        onSelect={jest.fn()}
        onPreview={jest.fn()}
      />
    );

    expect(screen.getByText('Imported')).toBeInTheDocument();
  });

  it('renders favorite state', () => {
    const favoriteContact = { ...mockContact, favorite: true };
    render(
      <ContactCard
        contact={favoriteContact}
        onSelect={jest.fn()}
        onPreview={jest.fn()}
      />
    );

    const favoriteButton = screen.getByRole('button', { name: /favorite/i });
    expect(favoriteButton).toHaveClass('text-yellow-500');
  });

  it('opens external links in new tab', () => {
    render(
      <ContactCard
        contact={mockContact}
        onSelect={jest.fn()}
        onPreview={jest.fn()}
      />
    );

    const emailLink = screen.getByText('john.doe@example.com');
    expect(emailLink).toHaveAttribute('href', 'mailto:john.doe@example.com');

    const linkedinLink = screen.getByText('LinkedIn Profile');
    expect(linkedinLink).toHaveAttribute('target', '_blank');
    expect(linkedinLink).toHaveAttribute('rel', 'noopener noreferrer');
  });
});

describe('ContactCardSkeleton', () => {
  it('renders skeleton elements', () => {
    render(<ContactCardSkeleton />);

    expect(screen.getAllByRole('generic')).toHaveLength(
      expect.any(Number) // Multiple skeleton elements
    );
  });

  it('renders compact skeleton', () => {
    render(<ContactCardSkeleton compact={true} />);

    expect(screen.getByRole('generic')).toBeInTheDocument();
  });
});