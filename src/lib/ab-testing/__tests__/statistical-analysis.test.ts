/**
 * Tests for Statistical Analysis Utilities
 */

import { 
  statisticalAnalyzer, 
  twoProportionZTest, 
  chiSquareTest, 
  multipleComparisons,
  calculateRequiredSampleSize,
  sequentialAnalysis
} from '../statistical-analysis';

describe('StatisticalAnalyzer', () => {
  describe('twoProportionZTest', () => {
    test('should calculate statistical significance correctly', () => {
      const control = {
        participants: 1000,
        conversions: 100,
        conversionRate: 0.1
      };

      const variant = {
        participants: 1000,
        conversions: 120,
        conversionRate: 0.12
      };

      const result = statisticalAnalyzer.twoProportionZTest(control, variant);

      expect(result.pValue).toBeGreaterThan(0);
      expect(result.pValue).toBeLessThan(1);
      expect(result.confidence).toBe(0.95);
      expect(result.significant).toBe(result.pValue < 0.05);
      expect(result.effectSize.absolute).toBe(0.02);
      expect(result.effectSize.relative).toBeCloseTo(20, 1);
      expect(result.confidenceInterval.lower).toBeLessThan(0.02);
      expect(result.confidenceInterval.upper).toBeGreaterThan(0.02);
    });

    test('should handle edge cases', () => {
      const control = {
        participants: 100,
        conversions: 0,
        conversionRate: 0
      };

      const variant = {
        participants: 100,
        conversions: 5,
        conversionRate: 0.05
      };

      const result = statisticalAnalyzer.twoProportionZTest(control, variant);

      expect(result.pValue).toBeGreaterThan(0);
      expect(result.effectSize.absolute).toBe(0.05);
      expect(result.effectSize.relative).toBe(Infinity); // Division by zero
    });

    test('should return not significant for identical variants', () => {
      const control = {
        participants: 1000,
        conversions: 100,
        conversionRate: 0.1
      };

      const variant = {
        participants: 1000,
        conversions: 100,
        conversionRate: 0.1
      };

      const result = statisticalAnalyzer.twoProportionZTest(control, variant);

      expect(result.pValue).toBeCloseTo(1, 1);
      expect(result.significant).toBe(false);
      expect(result.effectSize.absolute).toBe(0);
      expect(result.effectSize.relative).toBe(0);
    });
  });

  describe('chiSquareTest', () => {
    test('should calculate chi-square test correctly', () => {
      const observed = [
        [50, 50], // Control: 50 conversions, 50 non-conversions
        [60, 40]  // Variant: 60 conversions, 40 non-conversions
      ];

      const result = statisticalAnalyzer.chiSquareTest(observed);

      expect(result.pValue).toBeGreaterThan(0);
      expect(result.pValue).toBeLessThan(1);
      expect(result.significant).toBe(result.pValue < 0.05);
      expect(result.effectSize.absolute).toBeGreaterThan(0);
    });

    test('should handle 2x2 contingency table', () => {
      const observed = [
        [100, 900], // Control: 100 conversions, 900 non-conversions
        [120, 880]  // Variant: 120 conversions, 880 non-conversions
      ];

      const result = statisticalAnalyzer.chiSquareTest(observed);

      expect(result.pValue).toBeGreaterThan(0);
      expect(result.pValue).toBeLessThan(1);
    });
  });

  describe('multipleComparisons', () => {
    test('should apply Bonferroni correction correctly', () => {
      const variants = {
        'control': {
          participants: 1000,
          conversions: 100,
          conversionRate: 0.1
        },
        'variant_a': {
          participants: 1000,
          conversions: 120,
          conversionRate: 0.12
        },
        'variant_b': {
          participants: 1000,
          conversions: 130,
          conversionRate: 0.13
        }
      };

      const result = statisticalAnalyzer.multipleComparisons(variants, 'control', 'bonferroni');

      expect(result.comparisons).toHaveLength(2);
      expect(result.adjustedPValues).toBeDefined();
      expect(result.significantAfterCorrection).toBeDefined();
      
      // Bonferroni correction should increase p-values
      Object.values(result.adjustedPValues).forEach(adjustedPValue => {
        const originalPValue = result.comparisons.find(c => 
          result.adjustedPValues[`${c.variantA}_vs_${c.variantB}`] === adjustedPValue
        )?.result.pValue || 0;
        expect(adjustedPValue).toBeGreaterThanOrEqual(originalPValue);
      });
    });

    test('should identify winner correctly', () => {
      const variants = {
        'control': {
          participants: 1000,
          conversions: 100,
          conversionRate: 0.1
        },
        'variant_a': {
          participants: 1000,
          conversions: 120,
          conversionRate: 0.12
        },
        'variant_b': {
          participants: 1000,
          conversions: 110,
          conversionRate: 0.11
        }
      };

      const result = statisticalAnalyzer.multipleComparisons(variants, 'control', 'bonferroni');

      expect(result.winner).toBeDefined();
      expect(result.winner?.variantId).toBe('variant_a');
      expect(result.winner?.lift).toBeCloseTo(20, 1);
    });
  });

  describe('calculateRequiredSampleSize', () => {
    test('should calculate sample size correctly', () => {
      const baselineRate = 0.1;
      const minimumDetectableEffect = 0.05;
      const power = 0.8;
      const significanceLevel = 0.05;

      const sampleSize = statisticalAnalyzer.calculateRequiredSampleSize(
        baselineRate,
        minimumDetectableEffect,
        power,
        significanceLevel
      );

      expect(sampleSize).toBeGreaterThan(0);
      expect(sampleSize).toBe(Math.ceil(sampleSize)); // Should be an integer
    });

    test('should require larger sample size for smaller effects', () => {
      const baselineRate = 0.1;
      const smallEffect = 0.02;
      const largeEffect = 0.1;

      const smallSampleSize = statisticalAnalyzer.calculateRequiredSampleSize(baselineRate, smallEffect);
      const largeSampleSize = statisticalAnalyzer.calculateRequiredSampleSize(baselineRate, largeEffect);

      expect(smallSampleSize).toBeGreaterThan(largeSampleSize);
    });
  });

  describe('sequentialAnalysis', () => {
    test('should identify early stopping opportunities', () => {
      const data = [
        {
          day: 1,
          control: {
            participants: 100,
            conversions: 10,
            conversionRate: 0.1
          },
          variant: {
            participants: 100,
            conversions: 15,
            conversionRate: 0.15
          }
        },
        {
          day: 2,
          control: {
            participants: 200,
            conversions: 20,
            conversionRate: 0.1
          },
          variant: {
            participants: 200,
            conversions: 30,
            conversionRate: 0.15
          }
        },
        {
          day: 3,
          control: {
            participants: 300,
            conversions: 30,
            conversionRate: 0.1
          },
          variant: {
            participants: 300,
            conversions: 60,
            conversionRate: 0.2
          }
        }
      ];

      const result = statisticalAnalyzer.sequentialAnalysis(data);

      expect(result.canStop).toBeDefined();
      expect(result.winner).toBeDefined();
      expect(result.confidence).toBeGreaterThanOrEqual(0);
      expect(result.boundaries).toBeDefined();
      expect(result.boundaries.upper).toHaveLength(data.length);
      expect(result.boundaries.lower).toHaveLength(data.length);
    });

    test('should not stop early for insignificant results', () => {
      const data = [
        {
          day: 1,
          control: {
            participants: 100,
            conversions: 10,
            conversionRate: 0.1
          },
          variant: {
            participants: 100,
            conversions: 11,
            conversionRate: 0.11
          }
        },
        {
          day: 2,
          control: {
            participants: 200,
            conversions: 20,
            conversionRate: 0.1
          },
          variant: {
            participants: 200,
            conversions: 22,
            conversionRate: 0.11
          }
        }
      ];

      const result = statisticalAnalyzer.sequentialAnalysis(data);

      expect(result.canStop).toBe(false);
      expect(result.winner).toBeNull();
    });
  });
});

describe('Utility Functions', () => {
  describe('twoProportionZTest', () => {
    test('should work as a utility function', () => {
      const control = {
        participants: 1000,
        conversions: 100,
        conversionRate: 0.1
      };

      const variant = {
        participants: 1000,
        conversions: 120,
        conversionRate: 0.12
      };

      const result = twoProportionZTest(control, variant);

      expect(result.pValue).toBeGreaterThan(0);
      expect(result.significant).toBe(result.pValue < 0.05);
    });
  });

  describe('chiSquareTest', () => {
    test('should work as a utility function', () => {
      const observed = [
        [50, 50],
        [60, 40]
      ];

      const result = chiSquareTest(observed);

      expect(result.pValue).toBeGreaterThan(0);
      expect(result.significant).toBe(result.pValue < 0.05);
    });
  });

  describe('multipleComparisons', () => {
    test('should work as a utility function', () => {
      const variants = {
        'control': {
          participants: 1000,
          conversions: 100,
          conversionRate: 0.1
        },
        'variant_a': {
          participants: 1000,
          conversions: 120,
          conversionRate: 0.12
        }
      };

      const result = multipleComparisons(variants, 'control');

      expect(result.comparisons).toHaveLength(1);
      expect(result.adjustedPValues).toBeDefined();
    });
  });

  describe('calculateRequiredSampleSize', () => {
    test('should work as a utility function', () => {
      const sampleSize = calculateRequiredSampleSize(0.1, 0.05);

      expect(sampleSize).toBeGreaterThan(0);
      expect(Number.isInteger(sampleSize)).toBe(true);
    });
  });

  describe('sequentialAnalysis', () => {
    test('should work as a utility function', () => {
      const data = [
        {
          day: 1,
          control: {
            participants: 100,
            conversions: 10,
            conversionRate: 0.1
          },
          variant: {
            participants: 100,
            conversions: 15,
            conversionRate: 0.15
          }
        }
      ];

      const result = sequentialAnalysis(data);

      expect(result.canStop).toBeDefined();
      expect(result.boundaries).toBeDefined();
    });
  });
});