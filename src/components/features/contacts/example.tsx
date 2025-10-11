/**
 * Results Display Components Example
 * Comprehensive example demonstrating the usage of all contact display components
 */

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  ResultsTable, 
  useContactManagement, 
  useTableColumns,
  DEFAULT_TABLE_COLUMNS,
  ConfidenceBadge,
  ContactCard,
  BulkActionsCompact,
  ConfidenceLegend
} from './index';
import { Contact, ContactViewMode, BulkActionType, ExportFormat } from './types';

// Sample data generator
const generateSampleContacts = (count: number): Contact[] => {
  const contacts: Contact[] = [];
  const firstNames = ['John', 'Jane', 'Michael', 'Sarah', 'David', 'Emily', 'Robert', 'Lisa', 'James', 'Mary'];
  const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez'];
  const companies = ['Acme Corp', 'Tech Solutions', 'Global Industries', 'Innovate LLC', 'Digital Dynamics', 'Creative Agency', 'Consulting Firm', 'Enterprise Co', 'StartUp Inc', 'Business Group'];
  const titles = ['CEO', 'CTO', 'Marketing Manager', 'Sales Director', 'Product Manager', 'Software Engineer', 'Designer', 'Analyst', 'Consultant', 'Developer'];
  const domains = ['example.com', 'company.org', 'business.net', 'corporate.io', 'startup.co'];
  
  for (let i = 0; i < count; i++) {
    const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
    const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
    const company = companies[Math.floor(Math.random() * companies.length)];
    const title = titles[Math.floor(Math.random() * titles.length)];
    const domain = domains[Math.floor(Math.random() * domains.length)];
    
    contacts.push({
      id: `contact-${i + 1}`,
      name: `${firstName} ${lastName}`,
      title,
      bio: `Experienced ${title.toLowerCase()} with a proven track record in the ${company === 'Acme Corp' ? 'technology' : 'business'} industry. Passionate about innovation and driving results.`,
      email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@${domain}`,
      confidenceScore: Math.random() * 0.7 + 0.3, // 0.3 to 1.0
      qualityScore: Math.random() * 0.8 + 0.2, // 0.2 to 1.0
      verificationStatus: Math.random() > 0.7 ? 'CONFIRMED' : 'PENDING',
      relevanceScore: Math.random() * 0.6 + 0.4, // 0.4 to 1.0
      sourceUrl: `https://www.${domain}/profile/${i + 1}`,
      extractionMethod: 'AI_BASED',
      isDuplicate: Math.random() > 0.9,
      imported: Math.random() > 0.7,
      favorite: Math.random() > 0.8,
      tags: Math.random() > 0.5 ? ['important', 'follow-up'] : [],
      notes: Math.random() > 0.7 ? 'Contacted via LinkedIn. Interested in our services.' : undefined,
      extractionId: `extraction-${Math.random().toString(36).substring(2, 9)}`,
      searchId: `search-${Math.random().toString(36).substring(2, 9)}`,
      processingTimeMs: Math.floor(Math.random() * 1000) + 100,
      createdAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000), // Within last 30 days
      contactInfo: {
        company,
        phone: `+1${Math.floor(Math.random() * 900) + 100}-${Math.floor(Math.random() * 900) + 100}-${Math.floor(Math.random() * 9000) + 1000}`,
        linkedin: `https://linkedin.com/in/${firstName.toLowerCase()}${lastName.toLowerCase()}`,
        twitter: `https://twitter.com/${firstName.toLowerCase()}${lastName.charAt(0).toLowerCase()}`,
        website: `https://www.${domain}`,
        location: `${['New York', 'Los Angeles', 'Chicago', 'Houston', 'Phoenix'][Math.floor(Math.random() * 5)]}, USA`,
        languages: ['English', Math.random() > 0.5 ? 'Spanish' : 'French'],
        beats: ['Technology', 'Business', 'Innovation'],
        outlets: ['Tech News', 'Business Weekly', 'Industry Report'],
      },
      socialProfiles: [
        {
          platform: 'linkedin',
          handle: `${firstName.toLowerCase()}${lastName.toLowerCase()}`,
          url: `https://linkedin.com/in/${firstName.toLowerCase()}${lastName.toLowerCase()}`,
          verified: Math.random() > 0.5,
          followers: Math.floor(Math.random() * 10000) + 100,
          description: `${title} at ${company}`,
        },
        {
          platform: 'twitter',
          handle: `@${firstName.toLowerCase()}${lastName.charAt(0).toLowerCase()}`,
          url: `https://twitter.com/${firstName.toLowerCase()}${lastName.charAt(0).toLowerCase()}`,
          verified: Math.random() > 0.8,
          followers: Math.floor(Math.random() * 5000) + 50,
          description: `Professional thoughts and insights`,
        },
      ],
      metadata: {
        processingSteps: [
          {
            operation: 'CONTENT_FETCHING',
            startTime: new Date(),
            duration: Math.floor(Math.random() * 500) + 100,
            status: 'completed',
            details: { source: `https://www.${domain}` },
          },
          {
            operation: 'AI_EXTRACTION',
            startTime: new Date(),
            duration: Math.floor(Math.random() * 1000) + 200,
            status: 'completed',
            tokensUsed: Math.floor(Math.random() * 500) + 100,
            modelUsed: 'gpt-4',
          },
        ],
        confidenceFactors: {
          nameConfidence: Math.random() * 0.3 + 0.7,
          emailConfidence: Math.random() * 0.4 + 0.6,
          titleConfidence: Math.random() * 0.5 + 0.5,
          bioConfidence: Math.random() * 0.6 + 0.4,
          socialConfidence: Math.random() * 0.4 + 0.6,
          overallConfidence: Math.random() * 0.3 + 0.7,
        },
        qualityFactors: {
          sourceCredibility: Math.random() * 0.5 + 0.5,
          contentFreshness: Math.random() * 0.6 + 0.4,
          contactCompleteness: Math.random() * 0.4 + 0.6,
          informationConsistency: Math.random() * 0.5 + 0.5,
          overallQuality: Math.random() * 0.3 + 0.7,
        },
      },
    });
  }
  
  return contacts;
};

export function ContactDisplayExample() {
  const [sampleContacts, setSampleContacts] = useState<Contact[]>([]);
  const [activeTab, setActiveTab] = useState('table');
  const [loading, setLoading] = useState(false);
  
  // Generate sample data on mount
  useEffect(() => {
    setLoading(true);
    setTimeout(() => {
      setSampleContacts(generateSampleContacts(100));
      setLoading(false);
    }, 1000);
  }, []);
  
  // Use custom hooks for state management
  const contactManagement = useContactManagement(sampleContacts, {
    pageSize: 25,
    debounceMs: 300,
  });
  
  const tableColumns = useTableColumns(DEFAULT_TABLE_COLUMNS);
  
  // Event handlers
  const handleContactPreview = (contact: Contact) => {
    console.log('Preview contact:', contact);
  };
  
  const handleImport = (contactIds: string[]) => {
    console.log('Import contacts:', contactIds);
    // Update contacts to mark as imported
    setSampleContacts(prev => 
      prev.map(contact => 
        contactIds.includes(contact.id) 
          ? { ...contact, imported: true }
          : contact
      )
    );
  };
  
  const handleBulkAction = (action: BulkActionType, contactIds?: string[]) => {
    console.log('Bulk action:', action, contactIds);
    
    switch (action) {
      case 'favorite':
        setSampleContacts(prev => 
          prev.map(contact => 
            contactIds?.includes(contact.id) || contactManagement.selectedContacts.includes(contact.id)
              ? { ...contact, favorite: !contact.favorite }
              : contact
          )
        );
        break;
      case 'archive':
        setSampleContacts(prev => 
          prev.map(contact => 
            contactIds?.includes(contact.id) || contactManagement.selectedContacts.includes(contact.id)
              ? { ...contact, archived: true }
              : contact
          )
        );
        break;
      case 'delete':
        setSampleContacts(prev => 
          prev.filter(contact => 
            !(contactIds?.includes(contact.id) || contactManagement.selectedContacts.includes(contact.id))
          )
        );
        break;
      // Add other actions as needed
    }
  };
  
  const handleExport = (format: ExportFormat, options: any) => {
    console.log('Export contacts:', format, options);
    // Implement export logic here
  };
  
  const regenerateData = () => {
    setLoading(true);
    setTimeout(() => {
      setSampleContacts(generateSampleContacts(100));
      setLoading(false);
    }, 1000);
  };
  
  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Contact Display Components</h1>
          <p className="text-muted-foreground">
            Comprehensive example of the contact display system with table, grid, and list views
          </p>
        </div>
        
        <Button onClick={regenerateData} disabled={loading}>
          Regenerate Data
        </Button>
      </div>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="table">Table View</TabsTrigger>
          <TabsTrigger value="grid">Grid View</TabsTrigger>
          <TabsTrigger value="list">List View</TabsTrigger>
          <TabsTrigger value="components">Components</TabsTrigger>
        </TabsList>
        
        <TabsContent value="table" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Results Table</CardTitle>
              <CardDescription>
                Full-featured table with virtualization, sorting, filtering, and bulk actions
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="h-[800px]">
                <ResultsTable
                  contacts={contactManagement.contacts}
                  loading={loading}
                  selectedContacts={contactManagement.selectedContacts}
                  onSelectionChange={contactManagement.selectContacts}
                  onContactPreview={handleContactPreview}
                  onImport={handleImport}
                  columns={tableColumns.columns}
                  onColumnsChange={tableColumns.setColumns}
                  viewMode={contactManagement.viewMode}
                  onViewModeChange={contactManagement.setViewMode}
                  sort={contactManagement.sort}
                  onSortChange={contactManagement.updateSort}
                  filter={contactManagement.filter}
                  onFilterChange={contactManagement.updateFilter}
                  pagination={contactManagement.pagination}
                  onPaginationChange={contactManagement.updatePagination}
                  onBulkAction={handleBulkAction}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="grid" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Grid View</CardTitle>
              <CardDescription>
                Card-based grid layout for visual browsing of contacts
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {contactManagement.contacts.slice(0, 20).map((contact) => (
                  <ContactCard
                    key={contact.id}
                    contact={contact}
                    selected={contactManagement.selectedContacts.includes(contact.id)}
                    onSelect={(selected) => 
                      contactManagement.toggleContactSelection(contact.id)
                    }
                    onPreview={() => handleContactPreview(contact)}
                    showActions={true}
                  />
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="list" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>List View</CardTitle>
              <CardDescription>
                Compact list view for efficient scanning of contacts
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {contactManagement.contacts.slice(0, 20).map((contact) => (
                  <ContactCard
                    key={contact.id}
                    contact={contact}
                    selected={contactManagement.selectedContacts.includes(contact.id)}
                    onSelect={(selected) => 
                      contactManagement.toggleContactSelection(contact.id)
                    }
                    onPreview={() => handleContactPreview(contact)}
                    compact={true}
                    showActions={false}
                  />
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="components" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Confidence Badges</CardTitle>
                <CardDescription>
                  Visual indicators for data quality and reliability
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-4">
                  <span>High:</span>
                  <ConfidenceBadge confidence={0.9} />
                </div>
                <div className="flex items-center gap-4">
                  <span>Medium:</span>
                  <ConfidenceBadge confidence={0.7} />
                </div>
                <div className="flex items-center gap-4">
                  <span>Low:</span>
                  <ConfidenceBadge confidence={0.5} />
                </div>
                <div className="flex items-center gap-4">
                  <span>Very Low:</span>
                  <ConfidenceBadge confidence={0.3} />
                </div>
                
                <div className="mt-4">
                  <h4 className="font-medium mb-2">Legend:</h4>
                  <ConfidenceLegend />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Bulk Actions</CardTitle>
                <CardDescription>
                  Toolbar for bulk selection and operations
                </CardDescription>
              </CardHeader>
              <CardContent>
                <BulkActionsCompact
                  selectedCount={contactManagement.selectedContacts.length}
                  totalCount={contactManagement.totalContacts}
                  onImport={() => handleImport(contactManagement.selectedContacts)}
                  onExport={(format) => handleExport(format, {})}
                  onSelectAll={contactManagement.selectAllContacts}
                  onClearSelection={contactManagement.clearSelection}
                  onBulkAction={handleBulkAction}
                />
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
      
      <Card>
        <CardHeader>
          <CardTitle>Performance Metrics</CardTitle>
          <CardDescription>
            Real-time performance monitoring of the contact display system
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold">
                {contactManagement.totalContacts}
              </div>
              <div className="text-sm text-muted-foreground">Total Contacts</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">
                {contactManagement.contacts.length}
              </div>
              <div className="text-sm text-muted-foreground">Visible Contacts</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">
                {contactManagement.performanceMetrics.renderTime.toFixed(2)}ms
              </div>
              <div className="text-sm text-muted-foreground">Render Time</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">
                {(contactManagement.performanceMetrics.memoryUsage / 1024 / 1024).toFixed(2)}MB
              </div>
              <div className="text-sm text-muted-foreground">Memory Usage</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default ContactDisplayExample;