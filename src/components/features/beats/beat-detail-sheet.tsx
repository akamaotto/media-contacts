'use client';

import { useState, useEffect } from 'react';
import { Loader2, Edit, Trash2, Calendar, Tag, Users } from 'lucide-react';
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
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

// Local types for this component
type Category = { 
  id: string; 
  name: string; 
  color?: string | null; 
  description?: string | null 
};

type Beat = {
  id: string;
  name: string;
  description?: string | null;
  categories?: Category[];
  contactCount?: number;
  updatedAt?: string;
};

interface BeatDetailSheetProps {
  beatId: string | null;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit?: (beat: Beat) => void;
  onDelete?: (beat: Beat) => void;
}

export function BeatDetailSheet({ 
  beatId, 
  isOpen, 
  onOpenChange, 
  onEdit, 
  onDelete 
}: BeatDetailSheetProps) {
  const [beat, setBeat] = useState<Beat | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch beat details when sheet opens or beatId changes
  useEffect(() => {
    const fetchBeat = async () => {
      if (!beatId || !isOpen) {
        setBeat(null);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        
        const res = await fetch(`/api/beats/${beatId}`);
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error || 'Failed to load beat details');
        }
        
        const response = await res.json();
        const beatData = response.data || response;
        setBeat(beatData);
      } catch (err) {
        console.error('Error fetching beat details:', err);
        setError(err instanceof Error ? err.message : 'Failed to load beat details');
        toast.error('Failed to load beat details');
      } finally {
        setLoading(false);
      }
    };

    fetchBeat();
  }, [beatId, isOpen]);

  const handleEdit = () => {
    if (beat && onEdit) {
      onEdit(beat);
      onOpenChange(false);
    }
  };

  const handleDelete = () => {
    if (beat && onDelete) {
      onDelete(beat);
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
            <span>Beat Details</span>
          </SheetTitle>
          <SheetDescription>
            View detailed information about this beat
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6 px-1">
          {loading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin mr-2" />
              <span>Loading beat details...</span>
            </div>
          )}

          {error && (
            <div className="text-center py-12">
              <p className="text-red-600 mb-4">{error}</p>
              <Button 
                onClick={() => setBeat(null)} 
                variant="outline"
                size="sm"
              >
                Try Again
              </Button>
            </div>
          )}

          {beat && !loading && !error && (
            <>
              {/* Beat Name and Description */}
              <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
                <div>
                  <h3 className="text-xl font-semibold text-gray-900">{beat.name}</h3>
                  {beat.description ? (
                    <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
                      {beat.description}
                    </p>
                  ) : (
                    <p className="text-sm text-muted-foreground mt-2 italic">
                      No description provided
                    </p>
                  )}
                </div>
              </div>

              {/* Categories Section */}
              <div className="space-y-4 p-4 border rounded-lg">
                <div className="flex items-center space-x-2">
                  <Tag className="h-4 w-4 text-blue-600" />
                  <h4 className="font-semibold text-gray-900">Categories</h4>
                  <Badge variant="secondary" className="text-xs">
                    {beat.categories?.length || 0}
                  </Badge>
                </div>
                
                {beat.categories && beat.categories.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {beat.categories.map((category) => (
                      <Tooltip key={category.id}>
                        <TooltipTrigger>
                          <Badge
                            variant="outline"
                            className="text-xs px-3 py-1 hover:bg-gray-50 transition-colors"
                            style={category.color ? { 
                              borderColor: category.color, 
                              color: category.color 
                            } : {}}
                          >
                            {category.color && (
                              <div 
                                className="w-2 h-2 rounded-full mr-2"
                                style={{ backgroundColor: category.color }}
                              />
                            )}
                            {category.name}
                          </Badge>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>{category.description || category.name}</p>
                        </TooltipContent>
                      </Tooltip>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6 text-muted-foreground">
                    <Tag className="h-8 w-8 mx-auto mb-2 opacity-40" />
                    <p className="text-sm">No categories assigned to this beat</p>
                  </div>
                )}
              </div>

              {/* Statistics */}
              <div className="space-y-4 p-4 border rounded-lg">
                <h4 className="font-semibold text-gray-900">Statistics</h4>
                <div className="grid grid-cols-2 gap-6">
                  <div className="flex items-center space-x-3 p-3 bg-blue-50 rounded-lg">
                    <Users className="h-5 w-5 text-blue-600" />
                    <div>
                      <p className="text-lg font-semibold text-blue-900">{beat.contactCount || 0}</p>
                      <p className="text-sm text-blue-600">Contacts</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3 p-3 bg-green-50 rounded-lg">
                    <Calendar className="h-5 w-5 text-green-600" />
                    <div>
                      <p className="text-sm font-medium text-green-900">
                        {formatDate(beat.updatedAt)}
                      </p>
                      <p className="text-sm text-green-600">Last Updated</p>
                    </div>
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
                    Edit Beat
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