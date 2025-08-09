'use client';

import * as React from 'react';
import {X} from 'lucide-react';
import {Badge} from '@/components/ui/badge';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {cn} from '@/lib/utils';

/**
 * TagInput Props - Comprehensive type definition for the TagInput component
 * Following Rust-inspired explicit type handling
 */
export interface TagInputProps
    extends React.InputHTMLAttributes<HTMLInputElement> {
    /** Current list of tags */
    tags: string[];
    /** Callback when tags are changed */
    onTagsChange: (tags: string[]) => void;
    /** Placeholder text for the input */
    placeholder?: string;
    /** Optional validation rules */
    validation?: {
        /** Maximum allowed tags */
        maxTags?: number;
        /** Minimum length for each tag */
        minLength?: number;
        /** Maximum length for each tag */
        maxLength?: number;
        /** Regex pattern each tag must match */
        pattern?: RegExp;
    };
    /** Custom classes to apply to the container */
    wrapperClassName?: string;
    /** Whether to disable the input */
    disabled?: boolean;
    /** Custom classes for the input field */
    inputClassName?: string;
    /** Optional error message */
    error?: string;
}

/**
 * TagInput Component - A reusable input for handling tag entries
 * Supports comma-separated values and provides comprehensive validation
 */
export function TagInput({
    tags,
    onTagsChange,
    placeholder = 'Add tag...',
    validation = {},
    wrapperClassName,
    disabled = false,
    inputClassName,
    error,
    ...props
}: TagInputProps) {
    // Local state for the input value
    const [inputValue, setInputValue] = React.useState('');
    // Reference to the input element for focus management
    const inputRef = React.useRef<HTMLInputElement>(null);

    // Destructure validation options with defaults for Rust-like explicit handling
    const {maxTags = 10, minLength = 2, maxLength = 50, pattern} = validation;

    /**
     * Validates a tag value without adding it
     * Returns an error message or null if validation passes
     */
    const validateTag = (value: string): string | null => {
        // Don't add empty tags
        if (!value.trim()) {
            return null;
        }

        // Check if we've reached the maximum number of tags
        if (tags.length >= maxTags) {
            return `Cannot add more than ${maxTags} items`;
        }

        // Validate length
        if (value.trim().length < minLength) {
            return `Item must be at least ${minLength} characters`;
        }

        if (value.trim().length > maxLength) {
            return `Item cannot exceed ${maxLength} characters`;
        }

        // Validate pattern if specified
        if (pattern && !pattern.test(value.trim())) {
            return 'Item contains invalid characters';
        }

        // Check for duplicates
        if (tags.includes(value.trim())) {
            return 'This item already exists';
        }

        return null;
    };

    /**
     * Handles adding a new tag with comprehensive validation
     * Returns an error message or null if validation passes
     */
    const validateAndAddTag = (value: string): string | null => {
        const error = validateTag(value);
        if (error) {
            return error;
        }

        // All validation passed, add the tag
        onTagsChange([...tags, value.trim()]);
        return null;
    };

    /**
     * Handles input change events
     */
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setInputValue(e.target.value);
    };

    /**
     * Handles key down events
     * - Enter: adds the current tag
     * - Backspace: removes the last tag if input is empty
     * - Comma: adds tag and prevents comma from being added
     */
    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        // Handle comma key (add tag)
        if (e.key === ',') {
            e.preventDefault();
            const error = validateAndAddTag(inputValue);
            if (!error) {
                setInputValue('');
            }
            return;
        }

        // Handle enter key (add tag)
        if (e.key === 'Enter') {
            e.preventDefault();
            const error = validateAndAddTag(inputValue);
            if (!error) {
                setInputValue('');
            }
            return;
        }

        // Handle backspace key (remove last tag)
        if (e.key === 'Backspace' && !inputValue && tags.length > 0) {
            e.preventDefault();
            const newTags = [...tags];
            newTags.pop();
            onTagsChange(newTags);
            return;
        }
    };

    /**
     * Handles blur events (adds the current tag)
     */
    const handleBlur = () => {
        if (inputValue.trim()) {
            const error = validateAndAddTag(inputValue);
            if (!error) {
                setInputValue('');
            }
        }
    };

    /**
     * Handles removing a tag by index
     */
    const removeTag = (index: number) => {
        const newTags = [...tags];
        newTags.splice(index, 1);
        onTagsChange(newTags);
    };

    /**
     * Adds a tag when the Add button is clicked
     */
    const handleAddClick = () => {
        if (inputValue.trim()) {
            // Handle comma-separated values
            const values = inputValue
                .split(',')
                .map((v) => v.trim())
                .filter(Boolean);

            // Validate and collect valid tags
            const validTags: string[] = [];
            let hasError = false;

            for (const value of values) {
                const error = validateTag(value);

                if (error) {
                    hasError = true;
                    break; // Stop on first error
                } else {
                    validTags.push(value);
                }
            }

            // Only add tags if no validation errors occurred
            if (!hasError && validTags.length > 0) {
                onTagsChange([...tags, ...validTags]);
                setInputValue('');
            }
        }
    };

    return (
        <div className={cn('space-y-2', wrapperClassName)}>
            <div className='flex items-center gap-2'>
                <div className='relative flex-grow'>
                    <Input
                        ref={inputRef}
                        type='text'
                        value={inputValue}
                        onChange={handleInputChange}
                        onKeyDown={handleKeyDown}
                        onBlur={handleBlur}
                        placeholder={placeholder}
                        disabled={disabled}
                        className={cn('pr-10', inputClassName)}
                        aria-invalid={!!error}
                        {...props}
                    />
                    <Button
                        type='button'
                        variant='ghost'
                        size='sm'
                        className='absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent'
                        onClick={handleAddClick}
                        disabled={disabled}
                        aria-label='Add tag'
                    >
                        <span className='text-xl font-semibold'>+</span>
                    </Button>
                </div>
            </div>

            {/* Error message display */}
            {error && <p className='text-sm text-destructive'>{error}</p>}

            {/* Display tags */}
            {tags.length > 0 && (
                <div className='flex flex-wrap gap-2 mt-2'>
                    {tags.map((tag, index) => (
                        <Badge
                            key={index}
                            variant='secondary'
                            className='flex items-center gap-1'
                        >
                            {tag}
                            <Button
                                variant='ghost'
                                size='sm'
                                className='h-4 w-4 p-0 hover:bg-transparent'
                                onClick={() => removeTag(index)}
                                disabled={disabled}
                                aria-label={`Remove ${tag}`}
                            >
                                <X className='h-3 w-3' />
                            </Button>
                        </Badge>
                    ))}
                </div>
            )}
        </div>
    );
}
