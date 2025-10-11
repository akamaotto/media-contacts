/**
 * Tests for Experiment Configuration Service
 */

import { 
  experimentConfigService, 
  createExperiment, 
  getExperiment, 
  updateExperiment, 
  validateExperiment,
  getExperimentTemplates,
  createFromTemplate
} from '../experiment-config-service';

describe('ExperimentConfigService', () => {
  describe('createExperiment', () => {
    test('should create a valid experiment', async () => {
      const config = {
        name: 'Test Experiment',
        description: 'A test experiment',
        hypothesis: 'This variant will perform better',
        successMetrics: [
          {
            id: 'conversion_rate',
            name: 'Conversion Rate',
            type: 'conversion' as const,
            description: 'Primary conversion metric',
            isPrimary: true,
            calculationMethod: 'rate' as const,
            eventTriggers: ['conversion', 'page_view']
          }
        ],
        targetingRules: [
          {
            id: 'all_users',
            name: 'All Users',
            type: 'include' as const,
            conditions: []
          }
        ],
        variants: [
          {
            name: 'Control',
            description: 'Control variant',
            isControl: true,
            trafficWeight: 50,
            config: {},
            overrides: {},
            triggers: [],
            customizations: [],
            implementationStatus: 'ready' as const
          },
          {
            name: 'Variant A',
            description: 'Test variant',
            isControl: false,
            trafficWeight: 50,
            config: {},
            overrides: {},
            triggers: [],
            customizations: [],
            implementationStatus: 'ready' as const
          }
        ],
        trafficAllocation: 100,
        duration: { type: 'fixed' as const },
        status: 'draft' as const,
        priority: 'medium' as const,
        tags: [],
        owner: 'test_user',
        createdBy: 'test_user',
        updatedBy: 'test_user',
        metadata: {}
      };

      const experiment = await experimentConfigService.createExperiment(config, 'test_user');

      expect(experiment.id).toBeDefined();
      expect(experiment.name).toBe(config.name);
      expect(experiment.status).toBe('draft');
      expect(experiment.createdAt).toBeInstanceOf(Date);
      expect(experiment.updatedAt).toBeInstanceOf(Date);
    });

    test('should reject invalid experiment configuration', async () => {
      const config = {
        name: '', // Invalid: empty name
        description: 'A test experiment',
        hypothesis: 'This variant will perform better',
        successMetrics: [],
        targetingRules: [],
        variants: [], // Invalid: no variants
        trafficAllocation: 100,
        duration: { type: 'fixed' as const },
        status: 'draft' as const,
        priority: 'medium' as const,
        tags: [],
        owner: 'test_user',
        createdBy: 'test_user',
        updatedBy: 'test_user',
        metadata: {}
      };

      await expect(experimentConfigService.createExperiment(config, 'test_user'))
        .rejects.toThrow('Invalid experiment configuration');
    });
  });

  describe('updateExperiment', () => {
    test('should update experiment configuration', async () => {
      // Create an experiment first
      const config = {
        name: 'Test Experiment',
        description: 'A test experiment',
        hypothesis: 'This variant will perform better',
        successMetrics: [
          {
            id: 'conversion_rate',
            name: 'Conversion Rate',
            type: 'conversion' as const,
            description: 'Primary conversion metric',
            isPrimary: true,
            calculationMethod: 'rate' as const,
            eventTriggers: ['conversion', 'page_view']
          }
        ],
        targetingRules: [
          {
            id: 'all_users',
            name: 'All Users',
            type: 'include' as const,
            conditions: []
          }
        ],
        variants: [
          {
            name: 'Control',
            description: 'Control variant',
            isControl: true,
            trafficWeight: 50,
            config: {},
            overrides: {},
            triggers: [],
            customizations: [],
            implementationStatus: 'ready' as const
          },
          {
            name: 'Variant A',
            description: 'Test variant',
            isControl: false,
            trafficWeight: 50,
            config: {},
            overrides: {},
            triggers: [],
            customizations: [],
            implementationStatus: 'ready' as const
          }
        ],
        trafficAllocation: 100,
        duration: { type: 'fixed' as const },
        status: 'draft' as const,
        priority: 'medium' as const,
        tags: [],
        owner: 'test_user',
        createdBy: 'test_user',
        updatedBy: 'test_user',
        metadata: {}
      };

      const experiment = await experimentConfigService.createExperiment(config, 'test_user');
      
      // Update the experiment
      const updates = {
        name: 'Updated Test Experiment',
        description: 'Updated description',
        priority: 'high' as const
      };

      const updatedExperiment = await experimentConfigService.updateExperiment(
        experiment.id,
        updates,
        'test_user',
        'Updated for testing'
      );

      expect(updatedExperiment.name).toBe(updates.name);
      expect(updatedExperiment.description).toBe(updates.description);
      expect(updatedExperiment.priority).toBe(updates.priority);
      expect(updatedExperiment.updatedAt).not.toEqual(experiment.updatedAt);
    });

    test('should reject updating running experiments', async () => {
      // Create an experiment first
      const config = {
        name: 'Test Experiment',
        description: 'A test experiment',
        hypothesis: 'This variant will perform better',
        successMetrics: [
          {
            id: 'conversion_rate',
            name: 'Conversion Rate',
            type: 'conversion' as const,
            description: 'Primary conversion metric',
            isPrimary: true,
            calculationMethod: 'rate' as const,
            eventTriggers: ['conversion', 'page_view']
          }
        ],
        targetingRules: [
          {
            id: 'all_users',
            name: 'All Users',
            type: 'include' as const,
            conditions: []
          }
        ],
        variants: [
          {
            name: 'Control',
            description: 'Control variant',
            isControl: true,
            trafficWeight: 50,
            config: {},
            overrides: {},
            triggers: [],
            customizations: [],
            implementationStatus: 'ready' as const
          },
          {
            name: 'Variant A',
            description: 'Test variant',
            isControl: false,
            trafficWeight: 50,
            config: {},
            overrides: {},
            triggers: [],
            customizations: [],
            implementationStatus: 'ready' as const
          }
        ],
        trafficAllocation: 100,
        duration: { type: 'fixed' as const },
        status: 'running' as const, // Set to running
        priority: 'medium' as const,
        tags: [],
        owner: 'test_user',
        createdBy: 'test_user',
        updatedBy: 'test_user',
        metadata: {}
      };

      const experiment = await experimentConfigService.createExperiment(config, 'test_user');
      
      // Try to update the experiment
      const updates = {
        name: 'Updated Test Experiment'
      };

      await expect(experimentConfigService.updateExperiment(
        experiment.id,
        updates,
        'test_user'
      )).rejects.toThrow('Cannot update experiment in running status');
    });
  });

  describe('getExperiment', () => {
    test('should retrieve an experiment by ID', async () => {
      // Create an experiment first
      const config = {
        name: 'Test Experiment',
        description: 'A test experiment',
        hypothesis: 'This variant will perform better',
        successMetrics: [
          {
            id: 'conversion_rate',
            name: 'Conversion Rate',
            type: 'conversion' as const,
            description: 'Primary conversion metric',
            isPrimary: true,
            calculationMethod: 'rate' as const,
            eventTriggers: ['conversion', 'page_view']
          }
        ],
        targetingRules: [
          {
            id: 'all_users',
            name: 'All Users',
            type: 'include' as const,
            conditions: []
          }
        ],
        variants: [
          {
            name: 'Control',
            description: 'Control variant',
            isControl: true,
            trafficWeight: 50,
            config: {},
            overrides: {},
            triggers: [],
            customizations: [],
            implementationStatus: 'ready' as const
          },
          {
            name: 'Variant A',
            description: 'Test variant',
            isControl: false,
            trafficWeight: 50,
            config: {},
            overrides: {},
            triggers: [],
            customizations: [],
            implementationStatus: 'ready' as const
          }
        ],
        trafficAllocation: 100,
        duration: { type: 'fixed' as const },
        status: 'draft' as const,
        priority: 'medium' as const,
        tags: [],
        owner: 'test_user',
        createdBy: 'test_user',
        updatedBy: 'test_user',
        metadata: {}
      };

      const createdExperiment = await experimentConfigService.createExperiment(config, 'test_user');
      
      // Retrieve the experiment
      const retrievedExperiment = experimentConfigService.getExperiment(createdExperiment.id);

      expect(retrievedExperiment).toBeDefined();
      expect(retrievedExperiment?.id).toBe(createdExperiment.id);
      expect(retrievedExperiment?.name).toBe(config.name);
    });

    test('should return null for non-existent experiment', () => {
      const experiment = experimentConfigService.getExperiment('non_existent_id');
      expect(experiment).toBeNull();
    });
  });

  describe('validateExperiment', () => {
    test('should validate a correct experiment configuration', () => {
      const config = {
        id: 'test_id',
        name: 'Test Experiment',
        description: 'A test experiment',
        hypothesis: 'This variant will perform better',
        successMetrics: [
          {
            id: 'conversion_rate',
            name: 'Conversion Rate',
            type: 'conversion' as const,
            description: 'Primary conversion metric',
            isPrimary: true,
            calculationMethod: 'rate' as const,
            eventTriggers: ['conversion', 'page_view']
          }
        ],
        targetingRules: [
          {
            id: 'all_users',
            name: 'All Users',
            type: 'include' as const,
            conditions: []
          }
        ],
        variants: [
          {
            name: 'Control',
            description: 'Control variant',
            isControl: true,
            trafficWeight: 50,
            config: {},
            overrides: {},
            triggers: [],
            customizations: [],
            implementationStatus: 'ready' as const
          },
          {
            name: 'Variant A',
            description: 'Test variant',
            isControl: false,
            trafficWeight: 50,
            config: {},
            overrides: {},
            triggers: [],
            customizations: [],
            implementationStatus: 'ready' as const
          }
        ],
        trafficAllocation: 100,
        duration: { type: 'fixed' as const },
        status: 'draft' as const,
        priority: 'medium' as const,
        tags: [],
        owner: 'test_user',
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'test_user',
        updatedBy: 'test_user',
        metadata: {}
      };

      const result = experimentConfigService.validateExperiment(config);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('should identify validation errors', () => {
      const config = {
        id: 'test_id',
        name: '', // Invalid: empty name
        description: 'A test experiment',
        hypothesis: '', // Invalid: empty hypothesis
        successMetrics: [], // Invalid: no metrics
        targetingRules: [],
        variants: [], // Invalid: no variants
        trafficAllocation: 100,
        duration: { type: 'fixed' as const },
        status: 'draft' as const,
        priority: 'medium' as const,
        tags: [],
        owner: 'test_user',
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'test_user',
        updatedBy: 'test_user',
        metadata: {}
      };

      const result = experimentConfigService.validateExperiment(config);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      
      // Check for specific errors
      const nameError = result.errors.find(e => e.field === 'name');
      expect(nameError).toBeDefined();
      expect(nameError?.message).toContain('required');
      
      const hypothesisError = result.errors.find(e => e.field === 'hypothesis');
      expect(hypothesisError).toBeDefined();
      expect(hypothesisError?.message).toContain('required');
      
      const variantsError = result.errors.find(e => e.field === 'variants');
      expect(variantsError).toBeDefined();
      expect(variantsError?.message).toContain('at least 2 variants');
    });

    test('should identify variant validation errors', () => {
      const config = {
        id: 'test_id',
        name: 'Test Experiment',
        description: 'A test experiment',
        hypothesis: 'This variant will perform better',
        successMetrics: [
          {
            id: 'conversion_rate',
            name: 'Conversion Rate',
            type: 'conversion' as const,
            description: 'Primary conversion metric',
            isPrimary: true,
            calculationMethod: 'rate' as const,
            eventTriggers: ['conversion', 'page_view']
          }
        ],
        targetingRules: [],
        variants: [
          {
            name: 'Control',
            description: 'Control variant',
            isControl: true,
            trafficWeight: 50,
            config: {},
            overrides: {},
            triggers: [],
            customizations: [],
            implementationStatus: 'ready' as const
          },
          {
            name: 'Control', // Invalid: duplicate name
            description: 'Another control variant',
            isControl: true, // Invalid: second control
            trafficWeight: 50,
            config: {},
            overrides: {},
            triggers: [],
            customizations: [],
            implementationStatus: 'ready' as const
          }
        ],
        trafficAllocation: 100,
        duration: { type: 'fixed' as const },
        status: 'draft' as const,
        priority: 'medium' as const,
        tags: [],
        owner: 'test_user',
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'test_user',
        updatedBy: 'test_user',
        metadata: {}
      };

      const result = experimentConfigService.validateExperiment(config);

      expect(result.valid).toBe(false);
      
      // Check for specific errors
      const controlCountError = result.errors.find(e => e.field === 'variants');
      expect(controlCountError).toBeDefined();
      expect(controlCountError?.message).toContain('exactly one control variant');
      
      const duplicateNamesError = result.errors.find(e => e.field === 'variants');
      expect(duplicateNamesError?.message).toContain('Duplicate variant names');
    });
  });

  describe('getExperimentTemplates', () => {
    test('should return available templates', () => {
      const templates = experimentConfigService.getExperimentTemplates();
      
      expect(templates).toBeDefined();
      expect(templates.length).toBeGreaterThan(0);
      
      // Check for expected templates
      const buttonTestTemplate = templates.find(t => t.id === 'ui-button-test');
      expect(buttonTestTemplate).toBeDefined();
      expect(buttonTestTemplate?.name).toBe('UI Button Test');
      
      const aiSearchTemplate = templates.find(t => t.id === 'ai-search-algorithm');
      expect(aiSearchTemplate).toBeDefined();
      expect(aiSearchTemplate?.name).toBe('AI Search Algorithm Test');
    });
  });

  describe('createFromTemplate', () => {
    test('should create experiment from template', async () => {
      const customizations = {
        name: 'Custom Button Test',
        description: 'A custom button test',
        hypothesis: 'Red buttons will perform better',
        owner: 'custom_user'
      };

      const experiment = await experimentConfigService.createFromTemplate(
        'ui-button-test',
        customizations,
        'custom_user'
      );

      expect(experiment.id).toBeDefined();
      expect(experiment.name).toBe(customizations.name);
      expect(experiment.description).toBe(customizations.description);
      expect(experiment.hypothesis).toBe(customizations.hypothesis);
      expect(experiment.owner).toBe(customizations.owner);
      expect(experiment.variants).toHaveLength(3); // Template has 3 variants
    });

    test('should reject invalid template ID', async () => {
      const customizations = {
        name: 'Custom Test',
        description: 'A custom test'
      };

      await expect(experimentConfigService.createFromTemplate(
        'invalid_template_id',
        customizations,
        'test_user'
      )).rejects.toThrow('Template with ID invalid_template_id not found');
    });
  });

  describe('generateExecutionPlan', () => {
    test('should generate execution plan for experiment', async () => {
      // Create an experiment first
      const config = {
        name: 'Test Experiment',
        description: 'A test experiment',
        hypothesis: 'This variant will perform better',
        successMetrics: [
          {
            id: 'conversion_rate',
            name: 'Conversion Rate',
            type: 'conversion' as const,
            description: 'Primary conversion metric',
            isPrimary: true,
            calculationMethod: 'rate' as const,
            eventTriggers: ['conversion', 'page_view']
          }
        ],
        targetingRules: [
          {
            id: 'all_users',
            name: 'All Users',
            type: 'include' as const,
            conditions: []
          }
        ],
        variants: [
          {
            name: 'Control',
            description: 'Control variant',
            isControl: true,
            trafficWeight: 50,
            config: {},
            overrides: {},
            triggers: [],
            customizations: [],
            implementationStatus: 'ready' as const
          },
          {
            name: 'Variant A',
            description: 'Test variant',
            isControl: false,
            trafficWeight: 50,
            config: {},
            overrides: {},
            triggers: [],
            customizations: [],
            implementationStatus: 'ready' as const
          }
        ],
        trafficAllocation: 100,
        duration: { type: 'fixed' as const },
        status: 'draft' as const,
        priority: 'medium' as const,
        tags: [],
        owner: 'test_user',
        createdBy: 'test_user',
        updatedBy: 'test_user',
        metadata: {}
      };

      const experiment = await experimentConfigService.createExperiment(config, 'test_user');
      
      // Generate execution plan
      const plan = experimentConfigService.generateExecutionPlan(experiment.id);

      expect(plan.experiment).toBeDefined();
      expect(plan.rolloutPlan).toBeDefined();
      expect(plan.monitoringPlan).toBeDefined();
      expect(plan.successCriteria).toBeDefined();
      expect(plan.rollbackPlan).toBeDefined();
      
      // Check rollout plan
      expect(plan.rolloutPlan.length).toBeGreaterThan(0);
      expect(plan.rolloutPlan[0].trafficPercentage).toBeGreaterThan(0);
      expect(plan.rolloutPlan[0].actions).toContain('Enable feature flag');
      
      // Check monitoring plan
      expect(plan.monitoringPlan.length).toBeGreaterThan(0);
      expect(plan.monitoringPlan[0].metric).toBeDefined();
      expect(plan.monitoringPlan[0].threshold).toBeDefined();
      
      // Check rollback plan
      expect(plan.rollbackPlan.length).toBeGreaterThan(0);
      expect(plan.rollbackPlan[0].trigger).toBeDefined();
      expect(plan.rollbackPlan[0].actions).toContain('Disable feature flag');
    });
  });
});

describe('Utility Functions', () => {
  describe('createExperiment', () => {
    test('should work as a utility function', async () => {
      const config = {
        name: 'Test Experiment',
        description: 'A test experiment',
        hypothesis: 'This variant will perform better',
        successMetrics: [
          {
            id: 'conversion_rate',
            name: 'Conversion Rate',
            type: 'conversion' as const,
            description: 'Primary conversion metric',
            isPrimary: true,
            calculationMethod: 'rate' as const,
            eventTriggers: ['conversion', 'page_view']
          }
        ],
        targetingRules: [
          {
            id: 'all_users',
            name: 'All Users',
            type: 'include' as const,
            conditions: []
          }
        ],
        variants: [
          {
            name: 'Control',
            description: 'Control variant',
            isControl: true,
            trafficWeight: 50,
            config: {},
            overrides: {},
            triggers: [],
            customizations: [],
            implementationStatus: 'ready' as const
          },
          {
            name: 'Variant A',
            description: 'Test variant',
            isControl: false,
            trafficWeight: 50,
            config: {},
            overrides: {},
            triggers: [],
            customizations: [],
            implementationStatus: 'ready' as const
          }
        ],
        trafficAllocation: 100,
        duration: { type: 'fixed' as const },
        status: 'draft' as const,
        priority: 'medium' as const,
        tags: [],
        owner: 'test_user',
        createdBy: 'test_user',
        updatedBy: 'test_user',
        metadata: {}
      };

      const experiment = await createExperiment(config, 'test_user');

      expect(experiment.id).toBeDefined();
      expect(experiment.name).toBe(config.name);
    });
  });

  describe('getExperiment', () => {
    test('should work as a utility function', async () => {
      // Create an experiment first
      const config = {
        name: 'Test Experiment',
        description: 'A test experiment',
        hypothesis: 'This variant will perform better',
        successMetrics: [
          {
            id: 'conversion_rate',
            name: 'Conversion Rate',
            type: 'conversion' as const,
            description: 'Primary conversion metric',
            isPrimary: true,
            calculationMethod: 'rate' as const,
            eventTriggers: ['conversion', 'page_view']
          }
        ],
        targetingRules: [
          {
            id: 'all_users',
            name: 'All Users',
            type: 'include' as const,
            conditions: []
          }
        ],
        variants: [
          {
            name: 'Control',
            description: 'Control variant',
            isControl: true,
            trafficWeight: 50,
            config: {},
            overrides: {},
            triggers: [],
            customizations: [],
            implementationStatus: 'ready' as const
          },
          {
            name: 'Variant A',
            description: 'Test variant',
            isControl: false,
            trafficWeight: 50,
            config: {},
            overrides: {},
            triggers: [],
            customizations: [],
            implementationStatus: 'ready' as const
          }
        ],
        trafficAllocation: 100,
        duration: { type: 'fixed' as const },
        status: 'draft' as const,
        priority: 'medium' as const,
        tags: [],
        owner: 'test_user',
        createdBy: 'test_user',
        updatedBy: 'test_user',
        metadata: {}
      };

      const createdExperiment = await createExperiment(config, 'test_user');
      const retrievedExperiment = getExperiment(createdExperiment.id);

      expect(retrievedExperiment?.id).toBe(createdExperiment.id);
    });
  });

  describe('validateExperiment', () => {
    test('should work as a utility function', () => {
      const config = {
        id: 'test_id',
        name: 'Test Experiment',
        description: 'A test experiment',
        hypothesis: 'This variant will perform better',
        successMetrics: [
          {
            id: 'conversion_rate',
            name: 'Conversion Rate',
            type: 'conversion' as const,
            description: 'Primary conversion metric',
            isPrimary: true,
            calculationMethod: 'rate' as const,
            eventTriggers: ['conversion', 'page_view']
          }
        ],
        targetingRules: [
          {
            id: 'all_users',
            name: 'All Users',
            type: 'include' as const,
            conditions: []
          }
        ],
        variants: [
          {
            name: 'Control',
            description: 'Control variant',
            isControl: true,
            trafficWeight: 50,
            config: {},
            overrides: {},
            triggers: [],
            customizations: [],
            implementationStatus: 'ready' as const
          },
          {
            name: 'Variant A',
            description: 'Test variant',
            isControl: false,
            trafficWeight: 50,
            config: {},
            overrides: {},
            triggers: [],
            customizations: [],
            implementationStatus: 'ready' as const
          }
        ],
        trafficAllocation: 100,
        duration: { type: 'fixed' as const },
        status: 'draft' as const,
        priority: 'medium' as const,
        tags: [],
        owner: 'test_user',
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'test_user',
        updatedBy: 'test_user',
        metadata: {}
      };

      const result = validateExperiment(config);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('getExperimentTemplates', () => {
    test('should work as a utility function', () => {
      const templates = getExperimentTemplates();

      expect(templates).toBeDefined();
      expect(templates.length).toBeGreaterThan(0);
    });
  });

  describe('createFromTemplate', () => {
    test('should work as a utility function', async () => {
      const customizations = {
        name: 'Custom Button Test',
        description: 'A custom button test',
        hypothesis: 'Red buttons will perform better',
        owner: 'custom_user'
      };

      const experiment = await createFromTemplate(
        'ui-button-test',
        customizations,
        'custom_user'
      );

      expect(experiment.id).toBeDefined();
      expect(experiment.name).toBe(customizations.name);
    });
  });
});