"use client";

import * as React from "react";
import { useState, useEffect, useMemo, useCallback } from "react";
import { Check, ChevronsUpDown, Loader2, X, ChevronRight, ChevronDown, Folder, FolderOpen, Tag } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { CategorySelectorProps, CategoryHierarchy, accessibilityLabels } from "./types";

export function CategorySelector({
  value,
  onChange,
  categories,
  maxDepth = 3,
  disabled = false,
  error,
}: CategorySelectorProps) {
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<string[]>([]);

  // Mock categories data to avoid API dependency issues
  const [categoriesData, setCategoriesData] = useState<CategoryHierarchy[]>([]);

  // Initialize with mock data on mount
  useEffect(() => {
    if (categories.length > 0) {
      setCategoriesData(categories);
      return;
    }

    // Use mock data
    const mockCategories: CategoryHierarchy[] = [
      {
        id: "news",
        name: "News & Current Affairs",
        description: "Breaking news and current events",
        children: [
          {
            id: "politics",
            name: "Politics",
            description: "Political news and analysis",
            children: [
              { id: "domestic-politics", name: "Domestic Politics", description: "Local and national politics" },
              { id: "international-relations", name: "International Relations", description: "Diplomacy and foreign policy" }
            ]
          },
          {
            id: "business",
            name: "Business",
            description: "Business and economic news",
            children: [
              { id: "finance", name: "Finance", description: "Financial markets and investments" },
              { id: "technology", name: "Technology", description: "Tech industry news" }
            ]
          },
          {
            id: "economy",
            name: "Economy",
            description: "Economic news and analysis"
          }
        ]
      },
      {
        id: "lifestyle",
        name: "Lifestyle",
        description: "Lifestyle and entertainment",
        children: [
          {
            id: "entertainment",
            name: "Entertainment",
            description: "Movies, music, and culture",
            children: [
              { id: "movies", name: "Movies", description: "Film industry news" },
              { id: "music", name: "Music", description: "Music industry news" }
            ]
          },
          {
            id: "sports",
            name: "Sports",
            description: "Sports news and events",
            children: [
              { id: "football", name: "Football", description: "Football news and events" },
              { id: "basketball", name: "Basketball", description: "Basketball news and events" }
            ]
          }
        ]
      },
      {
        id: "science",
        name: "Science & Technology",
        description: "Science and technology news",
        children: [
          { id: "ai", name: "Artificial Intelligence", description: "AI and machine learning" },
          { id: "space", name: "Space", description: "Space exploration and astronomy" },
          { id: "health", name: "Health", description: "Medical and health news" }
        ]
      }
    ];

    setCategoriesData(mockCategories);
  }, [categories]);

  // Build category hierarchy from flat list
  const buildCategoryHierarchy = useCallback((flatCategories: any[]): CategoryHierarchy[] => {
    const categoryMap = new Map<string, CategoryHierarchy>();
    const rootCategories: CategoryHierarchy[] = [];

    // Create all category nodes
    flatCategories.forEach(cat => {
      categoryMap.set(cat.id, {
        id: cat.id,
        name: cat.name,
        description: cat.description,
        parentId: cat.parentId,
        children: [],
        count: cat.count
      });
    });

    // Build hierarchy
    flatCategories.forEach(cat => {
      const category = categoryMap.get(cat.id);
      if (!category) return;

      if (cat.parentId && categoryMap.has(cat.parentId)) {
        const parent = categoryMap.get(cat.parentId);
        if (parent) {
          parent.children = parent.children || [];
          parent.children.push(category);
        }
      } else {
        rootCategories.push(category);
      }
    });

    return rootCategories;
  }, []);

  // Flatten categories with their paths for search
  const flattenCategories = useCallback((
    categories: CategoryHierarchy[],
    prefix = "",
    depth = 0
  ): Array<{ category: CategoryHierarchy; path: string; depth: number }> => {
    if (depth > maxDepth) return [];

    const result: Array<{ category: CategoryHierarchy; path: string; depth: number }> = [];

    categories.forEach(category => {
      const currentPath = prefix ? `${prefix} > ${category.name}` : category.name;
      result.push({ category, path: currentPath, depth });

      if (category.children && category.children.length > 0) {
        result.push(...flattenCategories(category.children, currentPath, depth + 1));
      }
    });

    return result;
  }, [maxDepth]);

  // Filter categories based on search term
  const filteredCategories = useMemo(() => {
    if (!searchTerm) return categoriesData;

    const flattened = flattenCategories(categoriesData);
    const searchTermLower = searchTerm.toLowerCase();

    // Find categories that match the search
    const matchingCategories = flattened.filter(({ path, category }) =>
      path.toLowerCase().includes(searchTermLower) ||
      category.name.toLowerCase().includes(searchTermLower) ||
      category.description?.toLowerCase().includes(searchTermLower)
    );

    // Build a tree structure for matching categories
    const result: CategoryHierarchy[] = [];
    const categoryMap = new Map<string, CategoryHierarchy>();

    matchingCategories.forEach(({ category, depth }) => {
      categoryMap.set(category.id, { ...category });
    });

    matchingCategories.forEach(({ category, path }) => {
      const node = categoryMap.get(category.id);
      if (!node) return;

      if (!category.parentId || categoryMap.has(category.parentId)) {
        result.push(node);
      }
    });

    return result;
  }, [categoriesData, searchTerm, flattenCategories]);

  // Toggle category expansion
  const toggleCategoryExpansion = useCallback((categoryId: string) => {
    setExpandedCategories(prev =>
      prev.includes(categoryId)
        ? prev.filter(id => id !== categoryId)
        : [...prev, categoryId]
    );
  }, []);

  // Check if a category or any of its children are selected
  const isCategorySelected = useCallback((category: CategoryHierarchy): boolean => {
    if (value.includes(category.name)) return true;

    if (category.children) {
      return category.children.some(child => isCategorySelected(child));
    }

    return false;
  }, [value]);

  // Count selected items in a category and its children
  const countSelectedInCategory = useCallback((category: CategoryHierarchy): number => {
    let count = value.includes(category.name) ? 1 : 0;

    if (category.children) {
      count += category.children.reduce((sum, child) => sum + countSelectedInCategory(child), 0);
    }

    return count;
  }, [value]);

  // Handle category selection with cascade behavior
  const handleCategorySelect = useCallback((category: CategoryHierarchy, selected: boolean) => {
    const newSelection = [...value];

    if (selected) {
      // Add category if not already selected
      if (!newSelection.includes(category.name)) {
        newSelection.push(category.name);
      }
    } else {
      // Remove category and all its children
      const removeCategoryAndChildren = (cat: CategoryHierarchy) => {
        const index = newSelection.indexOf(cat.name);
        if (index > -1) {
          newSelection.splice(index, 1);
        }

        if (cat.children) {
          cat.children.forEach(removeCategoryAndChildren);
        }
      };
      removeCategoryAndChildren(category);
    }

    onChange(newSelection);
  }, [value, onChange]);

  // Remove category from selection
  const handleRemove = useCallback((categoryName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();

    const updatedCategories = value.filter(c => c !== categoryName);
    onChange(updatedCategories);
  }, [value, onChange]);

  // Render category tree
  const renderCategoryTree = useCallback((
    categories: CategoryHierarchy[],
    depth = 0
  ) => {
    return categories.map((category) => {
      const isExpanded = expandedCategories.includes(category.id);
      const isSelected = isCategorySelected(category);
      const selectedCount = countSelectedInCategory(category);
      const hasChildren = category.children && category.children.length > 0;
      const canExpand = hasChildren && depth < maxDepth;

      return (
        <div key={category.id} className="select-none">
          <CommandItem
            value={category.name}
            onSelect={() => handleCategorySelect(category, !isSelected)}
            className={cn(
              "flex items-center px-2 py-2 hover:bg-gray-100 dark:hover:bg-accent cursor-pointer transition-colors",
              depth > 0 && "ml-4"
            )}
          >
            <div className="flex items-center flex-1 min-w-0">
              {canExpand && (
                <button
                  type="button"
                  className="mr-1 p-0.5 hover:bg-muted rounded"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleCategoryExpansion(category.id);
                  }}
                >
                  {isExpanded ? (
                    <ChevronDown className="h-3 w-3" />
                  ) : (
                    <ChevronRight className="h-3 w-3" />
                  )}
                </button>
              )}

              {!canExpand && depth > 0 && <div className="w-4" />}

              <Checkbox
                checked={isSelected}
                className="mr-2"
                onCheckedChange={() => handleCategorySelect(category, !isSelected)}
              />

              <div className="flex items-center flex-1 min-w-0">
                {hasChildren ? (
                  isExpanded ? (
                    <FolderOpen className="mr-2 h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Folder className="mr-2 h-4 w-4 text-muted-foreground" />
                  )
                ) : (
                  <Tag className="mr-2 h-3 w-3 text-muted-foreground" />
                )}

                <span className="truncate">{category.name}</span>
                {category.description && (
                  <span className="ml-2 text-xs text-muted-foreground truncate">
                    ({category.description})
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2 ml-auto">
                {selectedCount > 0 && (
                  <Badge variant="secondary" className="text-xs">
                    {selectedCount}
                  </Badge>
                )}
                {category.count !== undefined && (
                  <span className="text-xs text-muted-foreground">
                    {category.count}
                  </span>
                )}
              </div>
            </div>
          </CommandItem>

          {hasChildren && isExpanded && (
            <div className="ml-2">
              {renderCategoryTree(category.children || [], depth + 1)}
            </div>
          )}
        </div>
      );
    });
  }, [
    expandedCategories,
    isCategorySelected,
    countSelectedInCategory,
    maxDepth,
    handleCategorySelect,
    toggleCategoryExpansion
  ]);

  // Get selected category details for display
  const selectedCategories = useMemo(() => {
    const flattened = flattenCategories(categoriesData);
    return flattened
      .filter(({ category }) => value.includes(category.name))
      .map(({ category, path }) => ({ category, path }));
  }, [categoriesData, value, flattenCategories]);

  const handleClearAll = useCallback(() => {
    onChange([]);
  }, [onChange]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setOpen(false);
    }
  }, []);

  return (
    <div className="space-y-3" onKeyDown={handleKeyDown}>
      {/* Selected categories display */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium">
            Categories {value.length > 0 && `(${value.length})`}
          </label>
          {value.length > 0 && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleClearAll}
              disabled={disabled}
              className="h-6 px-2 text-xs"
            >
              Clear All
            </Button>
          )}
        </div>

        <div className="flex flex-wrap gap-1.5 min-h-[32px] p-2 border rounded-md bg-background">
          {selectedCategories.length > 0 ? (
            selectedCategories.map(({ category, path }) => (
              <Badge
                key={category.id}
                variant="secondary"
                className="text-xs py-1 px-2 flex items-center gap-1 max-w-full"
              >
                <span className="truncate">{category.name}</span>
                {!disabled && (
                  <button
                    type="button"
                    className="ml-1 h-3 w-3 rounded-full inline-flex items-center justify-center hover:bg-muted"
                    onClick={(e) => handleRemove(category.name, e)}
                    aria-label={`Remove ${category.name}`}
                  >
                    <X className="h-2.5 w-2.5" />
                  </button>
                )}
              </Badge>
            ))
          ) : (
            <span className="text-muted-foreground text-sm">
              No categories selected
            </span>
          )}
        </div>
      </div>

      {/* Category selector */}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            aria-label={accessibilityLabels.categorySelector.trigger}
            className="w-full justify-between h-10"
            disabled={disabled}
          >
            <div className="flex items-center gap-2">
              <Folder className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">Select categories...</span>
            </div>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>

        <PopoverContent
          className="w-full p-0 bg-popover text-popover-foreground border border-border shadow-md z-50"
          align="start"
          side="bottom"
          style={{ width: "var(--radix-popover-trigger-width)" }}
        >
          <Command shouldFilter={false}>
            <CommandInput
              placeholder="Search categories..."
              value={searchTerm}
              onValueChange={setSearchTerm}
              className="border-0 focus:ring-0"
            />

            <CommandList>
              {loading ? (
                <div className="py-8 text-center">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                  <p className="text-sm text-muted-foreground mt-2">Loading categories...</p>
                </div>
              ) : (
                <>
                  <CommandEmpty>
                    <div className="py-4 text-center">
                      <Folder className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                      <p className="text-sm">No categories found for "{searchTerm}"</p>
                    </div>
                  </CommandEmpty>

                  <ScrollArea className="h-80">
                    {filteredCategories.length > 0 ? (
                      <CommandGroup>
                        {renderCategoryTree(filteredCategories)}
                      </CommandGroup>
                    ) : (
                      <div className="py-4 text-center text-muted-foreground">
                        No categories available
                      </div>
                    )}
                  </ScrollArea>
                </>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {error && (
        <p className="text-sm text-destructive mt-1" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}