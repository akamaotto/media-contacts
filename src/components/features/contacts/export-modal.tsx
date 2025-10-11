/**
 * ExportModal Component
 * Export configuration and download interface
 */

import React, { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  IconDownload, 
  IconFileText, 
  IconFileSpreadsheet, 
  IconAddressBook,
  IconDatabase,
  IconSettings,
  IconCheck,
  IconX,
  IconInfo,
  IconAlertCircle
} from '@tabler/icons-react';
import { cn } from '@/lib/utils';
import { ExportModalProps, ExportFormat, ExportOptions } from './types';

const exportFormatConfig = {
  csv: {
    icon: IconFileSpreadsheet,
    label: 'CSV',
    description: 'Comma-separated values, compatible with spreadsheet applications',
    mimeType: 'text/csv',
    fileExtension: '.csv',
  },
  json: {
    icon: IconDatabase,
    label: 'JSON',
    description: 'JavaScript Object Notation, for developers and APIs',
    mimeType: 'application/json',
    fileExtension: '.json',
  },
  vcard: {
    icon: IconAddressBook,
    label: 'vCard',
    description: 'Virtual contact file, compatible with address book applications',
    mimeType: 'text/vcard',
    fileExtension: '.vcf',
  },
  xlsx: {
    icon: IconFileSpreadsheet,
    label: 'Excel',
    description: 'Microsoft Excel format, with advanced formatting',
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    fileExtension: '.xlsx',
  },
};

const defaultFields = [
  { id: 'name', label: 'Name', required: true, checked: true },
  { id: 'title', label: 'Title', required: false, checked: true },
  { id: 'company', label: 'Company', required: false, checked: true },
  { id: 'email', label: 'Email', required: false, checked: true },
  { id: 'phone', label: 'Phone', required: false, checked: true },
  { id: 'location', label: 'Location', required: false, checked: false },
  { id: 'bio', label: 'Bio', required: false, checked: false },
  { id: 'confidenceScore', label: 'Confidence Score', required: false, checked: false },
  { id: 'verificationStatus', label: 'Verification Status', required: false, checked: false },
  { id: 'tags', label: 'Tags', required: false, checked: false },
  { id: 'notes', label: 'Notes', required: false, checked: false },
  { id: 'createdAt', label: 'Created Date', required: false, checked: false },
];

const metadataFields = [
  { id: 'sourceUrl', label: 'Source URL', required: false, checked: false },
  { id: 'extractionMethod', label: 'Extraction Method', required: false, checked: false },
  { id: 'relevanceScore', label: 'Relevance Score', required: false, checked: false },
  { id: 'qualityScore', label: 'Quality Score', required: false, checked: false },
  { id: 'isDuplicate', label: 'Is Duplicate', required: false, checked: false },
  { id: 'socialProfiles', label: 'Social Profiles', required: false, checked: false },
  { id: 'metadata', label: 'Full Metadata', required: false, checked: false },
];

export function ExportModal({
  isOpen,
  onClose,
  onExport,
  loading = false,
  selectedCount,
  totalCount,
}: ExportModalProps) {
  const [format, setFormat] = useState<ExportFormat>('csv');
  const [selectedOnly, setSelectedOnly] = useState(true);
  const [includeMetadata, setIncludeMetadata] = useState(false);
  const [activeTab, setActiveTab] = useState('format');
  const [exportProgress, setExportProgress] = useState(0);
  const [exportStatus, setExportStatus] = useState<'idle' | 'preparing' | 'processing' | 'completed' | 'error'>('idle');
  const [exportError, setExportError] = useState<string | null>(null);
  
  // Field selection state
  const [selectedFields, setSelectedFields] = useState<Record<string, boolean>>(
    defaultFields.reduce((acc, field) => ({ ...acc, [field.id]: field.checked }), {})
  );
  
  const [selectedMetadataFields, setSelectedMetadataFields] = useState<Record<string, boolean>>(
    metadataFields.reduce((acc, field) => ({ ...acc, [field.id]: field.checked }), {})
  );

  const formatConfig = exportFormatConfig[format];
  const exportCount = selectedOnly ? selectedCount : totalCount;

  const handleExport = async () => {
    if (exportCount === 0) return;
    
    try {
      setExportStatus('preparing');
      setExportProgress(0);
      setExportError(null);
      
      // Prepare export options
      const fields = [
        ...defaultFields.filter(field => selectedFields[field.id]).map(field => field.id),
        ...(includeMetadata 
          ? metadataFields.filter(field => selectedMetadataFields[field.id]).map(field => field.id)
          : []
        )
      ];
      
      const exportOptions: ExportOptions = {
        format,
        includeMetadata,
        selectedOnly,
        fields: fields.length > 0 ? fields : undefined,
      };
      
      // Simulate progress
      setExportStatus('processing');
      const progressInterval = setInterval(() => {
        setExportProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 200);
      
      // Call export function
      await onExport(format, exportOptions);
      
      // Complete
      clearInterval(progressInterval);
      setExportProgress(100);
      setExportStatus('completed');
      
      // Close modal after a delay
      setTimeout(() => {
        onClose();
        resetState();
      }, 1500);
    } catch (error) {
      setExportStatus('error');
      setExportError(error instanceof Error ? error.message : 'An unknown error occurred');
    }
  };

  const resetState = () => {
    setFormat('csv');
    setSelectedOnly(true);
    setIncludeMetadata(false);
    setActiveTab('format');
    setExportProgress(0);
    setExportStatus('idle');
    setExportError(null);
  };

  const handleClose = () => {
    if (exportStatus === 'processing') return; // Don't close while processing
    onClose();
    if (exportStatus === 'completed') {
      resetState();
    }
  };

  const handleFieldToggle = (fieldId: string, checked: boolean) => {
    setSelectedFields(prev => ({ ...prev, [fieldId]: checked }));
  };

  const handleMetadataFieldToggle = (fieldId: string, checked: boolean) => {
    setSelectedMetadataFields(prev => ({ ...prev, [fieldId]: checked }));
  };

  const selectedFieldCount = Object.values(selectedFields).filter(Boolean).length;
  const selectedMetadataFieldCount = Object.values(selectedMetadataFields).filter(Boolean).length;
  const totalSelectedFields = selectedFieldCount + (includeMetadata ? selectedMetadataFieldCount : 0);

  const Icon = formatConfig.icon;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <IconDownload className="h-5 w-5" />
            Export Contacts
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Export Summary */}
          <div className="p-4 bg-muted/50 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">
                  {selectedOnly ? 'Export Selected' : 'Export All'}
                </p>
                <p className="text-sm text-muted-foreground">
                  {exportCount} contacts will be exported
                </p>
              </div>
              
              <Badge variant="outline" className="gap-1">
                <Icon className="h-3 w-3" />
                {formatConfig.label}
              </Badge>
            </div>
          </div>
          
          {/* Progress Indicator */}
          {exportStatus !== 'idle' && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>
                  {exportStatus === 'preparing' && 'Preparing export...'}
                  {exportStatus === 'processing' && 'Processing contacts...'}
                  {exportStatus === 'completed' && 'Export completed!'}
                  {exportStatus === 'error' && 'Export failed'}
                </span>
                <span>{exportProgress}%</span>
              </div>
              
              <Progress 
                value={exportProgress} 
                className={cn(
                  "h-2",
                  exportStatus === 'error' && "bg-destructive/20",
                  exportStatus === 'completed' && "bg-green-500"
                )}
              />
              
              {exportError && (
                <div className="flex items-center gap-2 text-sm text-destructive">
                  <IconAlertCircle className="h-4 w-4" />
                  {exportError}
                </div>
              )}
            </div>
          )}
          
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="format">Format</TabsTrigger>
              <TabsTrigger value="fields">Fields</TabsTrigger>
              <TabsTrigger value="options">Options</TabsTrigger>
            </TabsList>
            
            <TabsContent value="format" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.entries(exportFormatConfig).map(([key, config]) => {
                  const FormatIcon = config.icon;
                  return (
                    <div
                      key={key}
                      className={cn(
                        "p-4 border rounded-lg cursor-pointer transition-colors",
                        format === key 
                          ? "border-primary bg-primary/5" 
                          : "border-border hover:border-primary/50"
                      )}
                      onClick={() => setFormat(key as ExportFormat)}
                    >
                      <div className="flex items-start gap-3">
                        <FormatIcon className="h-5 w-5 mt-0.5 text-primary" />
                        <div className="flex-1">
                          <h3 className="font-medium">{config.label}</h3>
                          <p className="text-sm text-muted-foreground mt-1">
                            {config.description}
                          </p>
                        </div>
                        
                        {format === key && (
                          <IconCheck className="h-5 w-5 text-primary" />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </TabsContent>
            
            <TabsContent value="fields" className="space-y-4">
              <div className="space-y-4">
                <div>
                  <h3 className="font-medium mb-3">Contact Fields</h3>
                  <div className="space-y-2">
                    {defaultFields.map((field) => (
                      <div key={field.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`field-${field.id}`}
                          checked={selectedFields[field.id]}
                          onCheckedChange={(checked) => 
                            handleFieldToggle(field.id, !!checked)
                          }
                          disabled={field.required}
                        />
                        <Label 
                          htmlFor={`field-${field.id}`}
                          className="flex-1 cursor-pointer"
                        >
                          {field.label}
                        </Label>
                        {field.required && (
                          <Badge variant="outline" className="text-xs">
                            Required
                          </Badge>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
                
                <Separator />
                
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-medium">Metadata Fields</h3>
                    <Checkbox
                      id="include-metadata"
                      checked={includeMetadata}
                      onCheckedChange={(checked) => setIncludeMetadata(!!checked)}
                    />
                    <Label htmlFor="include-metadata" className="cursor-pointer">
                      Include Metadata
                    </Label>
                  </div>
                  
                  <div className={cn(
                    "space-y-2 transition-opacity",
                    includeMetadata ? "opacity-100" : "opacity-50 pointer-events-none"
                  )}>
                    {metadataFields.map((field) => (
                      <div key={field.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`metadata-field-${field.id}`}
                          checked={selectedMetadataFields[field.id]}
                          onCheckedChange={(checked) => 
                            handleMetadataFieldToggle(field.id, !!checked)
                          }
                          disabled={!includeMetadata}
                        />
                        <Label 
                          htmlFor={`metadata-field-${field.id}`}
                          className="flex-1 cursor-pointer"
                        >
                          {field.label}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
                
                <div className="text-sm text-muted-foreground">
                  {totalSelectedFields} fields selected for export
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="options" className="space-y-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label htmlFor="selected-only">Export selected contacts only</Label>
                    <p className="text-sm text-muted-foreground">
                      {selectedCount} contacts selected
                    </p>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="selected-only"
                      checked={selectedOnly}
                      onCheckedChange={(checked) => setSelectedOnly(!!checked)}
                      disabled={selectedCount === 0}
                    />
                  </div>
                </div>
                
                <Separator />
                
                <div className="p-4 bg-muted/30 rounded-lg">
                  <div className="flex items-start gap-2">
                    <IconInfo className="h-4 w-4 mt-0.5 text-muted-foreground" />
                    <div className="text-sm text-muted-foreground">
                      <p className="font-medium text-foreground mb-1">Export Information</p>
                      <ul className="space-y-1">
                        <li>• Format: {formatConfig.label}</li>
                        <li>• File extension: {formatConfig.fileExtension}</li>
                        <li>• Contacts to export: {exportCount}</li>
                        <li>• Fields included: {totalSelectedFields}</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
        
        <DialogFooter>
          <div className="flex items-center justify-between w-full">
            <div className="text-sm text-muted-foreground">
              {exportCount} contacts • {formatConfig.label}
            </div>
            
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={handleClose}
                disabled={exportStatus === 'processing'}
              >
                Cancel
              </Button>
              
              <Button
                onClick={handleExport}
                disabled={exportCount === 0 || exportStatus === 'processing' || exportStatus === 'completed'}
                loading={exportStatus === 'processing'}
              >
                <IconDownload className="h-4 w-4 mr-1" />
                {exportStatus === 'processing' 
                  ? 'Exporting...' 
                  : exportStatus === 'completed'
                  ? 'Exported'
                  : 'Export'
                }
              </Button>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default ExportModal;