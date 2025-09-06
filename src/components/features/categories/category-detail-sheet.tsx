'use client';

import { useState, useEffect } from 'react';
import { Loader2, Edit, Trash2, Calendar, Tag, Building, Users } from 'lucide-react';
import { toast } from 'sonner';

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

// Local types for this component
type Beat = { 
  id: string; 
  name: string; 
  description?: string | null;
  contactCount?: number;
};

type Category = {
  id: string;
  name: string;
  description?: string | null;
  color?: string | null;
  beatCount?: number;
  outletCount?: number;
  beats?: Beat[];
  updatedAt?: string;
};

interface CategoryDetailSheetProps {
  categoryId: string | null;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit?: (category: Category) => void;
  onDelete?: (category: Category) => void;
}

export function CategoryDetailSheet({ 
  categoryId, 
  isOpen, 
  onOpenChange, 
  onEdit, 
  onDelete 
}: CategoryDetailSheetProps) {
  const [category, setCategory] = useState<Category | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch category details when sheet opens or categoryId changes
  useEffect(() => {
    const fetchCategory = async () => {
      if (!categoryId || !isOpen) {
        setCategory(null);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        
        const res = await fetch(`/api/categories/${categoryId}`);
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error || 'Failed to load category details');
        }
        
        const response = await res.json();
        const categoryData = response.data || response;
        setCategory(categoryData);
      } catch (err) {
        console.error('Error fetching category details:', err);
        setError(err instanceof Error ? err.message : 'Failed to load category details');
        toast.error('Failed to load category details');
      } finally {
        setLoading(false);
      }
    };

    fetchCategory();
  }, [categoryId, isOpen]);

  const handleEdit = () => {
    if (category && onEdit) {
      onEdit(category);
      onOpenChange(false);
    }
  };

  const handleDelete = () => {
    if (category && onDelete) {
      onDelete(category);
      onOpenChange(false);
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Unknown';
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return 'Invalid date';
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader className="pb-6">
          <SheetTitle className="flex items-center space-x-2">
            <Tag className="h-5 w-5" />
            <span>Category Details</span>
          </SheetTitle>
          <SheetDescription>
            View detailed information about this category
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6 px-1">
          {loading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin mr-2" />
              <span>Loading category details...</span>
            </div>
          )}

          {error && (
            <div className="text-center py-12">
              <p className="text-red-600 mb-4">{error}</p>
              <Button 
                onClick={() => setCategory(null)} 
                variant="outline"
                size="sm"
              >
                Try Again
              </Button>
            </div>
          )}

          {category && !loading && !error && (
            <>
              {/* Category Name and Description */}
              <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  {category.color && (
                    <div 
                      className="w-4 h-4 rounded-full border-2 border-white shadow-sm"
                      style={{ backgroundColor: category.color }}
                    />
                  )}
                  <h3 className="text-xl font-semibold text-gray-900">{category.name}</h3>
                </div>
                {category.description ? (
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {category.description}
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground italic">
                    No description provided
                  </p>
                )}
              </div>

              {/* Associated Beats */}
              <div className="space-y-4 p-4 border rounded-lg">
                <div className="flex items-center space-x-2">
                  <Tag className="h-4 w-4 text-blue-600" />
                  <h4 className="font-semibold text-gray-900">Associated Beats</h4>
                  <Badge variant="secondary" className="text-xs">
                    {category.beats?.length || 0}
                  </Badge>
                </div>
                
                {category.beats && category.beats.length > 0 ? (
                  <div className="space-y-2">
                    {category.beats.map((beat) => (
                      <div key={beat.id} className="flex items-center justify-between p-2 bg-blue-50 rounded-lg">
                        <div>
                          <p className="font-medium text-blue-900">{beat.name}</p>
                          {beat.description && (
                            <p className="text-xs text-blue-600 mt-1">
                              {beat.description.length > 60 
                                ? `${beat.description.substring(0, 60)}...` 
                                : beat.description
                              }
                            </p>
                          )}
                        </div>
                        <Badge variant="outline" className="text-xs bg-white">
                          <Users className="h-3 w-3 mr-1" />
                          {beat.contactCount || 0}
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6 text-muted-foreground">
                    <Tag className="h-8 w-8 mx-auto mb-2 opacity-40" />
                    <p className="text-sm">No beats associated with this category</p>
                  </div>
                )}
              </div>

              {/* Statistics */}
              <div className="space-y-4 p-4 border rounded-lg">
                <h4 className="font-semibold text-gray-900">Statistics</h4>
                <div className="grid grid-cols-2 gap-6">
                  <div className="flex items-center space-x-3 p-3 bg-blue-50 rounded-lg">
                    <Tag className="h-5 w-5 text-blue-600" />
                    <div>
                      <p className="text-lg font-semibold text-blue-900">{category.beatCount || 0}</p>
                      <p className="text-sm text-blue-600">Beats</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3 p-3 bg-purple-50 rounded-lg">
                    <Building className="h-5 w-5 text-purple-600" />
                    <div>
                      <p className="text-lg font-semibold text-purple-900">{category.outletCount || 0}</p>
                      <p className="text-sm text-purple-600">Outlets</p>
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-3 p-3 bg-green-50 rounded-lg">
                  <Calendar className="h-5 w-5 text-green-600" />
                  <div>
                    <p className="text-sm font-medium text-green-900">
                      {formatDate(category.updatedAt)}
                    </p>
                    <p className="text-sm text-green-600">Last Updated</p>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex space-x-3 pt-6 border-t">
                {onEdit && (
                  <Button 
                    onClick={handleEdit}
                    className="flex-1"
                    variant="default"
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Edit Category
                  </Button>
                )}
                {onDelete && (
                  <Button 
                    onClick={handleDelete}
                    variant="outline"
                    className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </Button>
                )}
              </div>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}