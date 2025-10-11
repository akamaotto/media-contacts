/**
 * Statistical Analysis Utilities for A/B Testing
 * Provides statistical significance calculation, confidence intervals, and hypothesis testing
 */

export interface StatisticalTestResult {
  pValue: number;
  confidence: number;
  significant: boolean;
  confidenceInterval: {
    lower: number;
    upper: number;
    margin: number;
  };
  effectSize: {
    absolute: number;
    relative: number;
    cohensD: number;
    practicalSignificance: 'significant' | 'negligible';
  };
  power: number;
  sampleSize: {
    required: number;
    actual: number;
    adequacy: 'adequate' | 'inadequate';
  };
  recommendation: 'accept' | 'reject' | 'continue' | 'inconclusive';
}

export interface VariantData {
  participants: number;
  conversions: number;
  conversionRate: number;
  averageValue?: number;
  variance?: number;
}

export interface MultipleComparisonResult {
  comparisons: Array<{
    variantA: string;
    variantB: string;
    result: StatisticalTestResult;
  }>;
  adjustedPValues: Record<string, number>;
  significantAfterCorrection: Record<string, boolean>;
  winner: {
    variantId: string;
    variantName: string;
    confidence: number;
    risk: 'low' | 'medium' | 'high';
  } | null;
}

export class StatisticalAnalyzer {
  private readonly SIGNIFICANCE_LEVEL = 0.05; // 5% significance level
  private readonly POWER_LEVEL = 0.8; // 80% power
  private readonly MINIMUM_DETECTABLE_EFFECT = 0.05; // 5% minimum detectable effect

  /**
   * Perform a two-proportion z-test between control and variant
   */
  twoProportionZTest(
    control: VariantData,
    variant: VariantData,
    confidenceLevel: number = 0.95
  ): StatisticalTestResult {
    const p1 = control.conversionRate;
    const p2 = variant.conversionRate;
    const n1 = control.participants;
    const n2 = variant.participants;

    // Pooled proportion
    const pooledP = (control.conversions + variant.conversions) / (n1 + n2);
    
    // Standard error
    const standardError = Math.sqrt(pooledP * (1 - pooledP) * (1/n1 + 1/n2));
    
    // Z-score
    const zScore = (p2 - p1) / standardError;
    
    // P-value (two-tailed test)
    const pValue = 2 * (1 - this.normalCDF(Math.abs(zScore)));
    
    // Confidence interval for difference
    const alpha = 1 - confidenceLevel;
    const zCritical = this.normalQuantile(1 - alpha/2);
    const margin = zCritical * standardError;
    const difference = p2 - p1;
    
    const confidenceInterval = {
      lower: difference - margin,
      upper: difference + margin,
      margin
    };
    
    // Effect size
    const absoluteEffect = difference;
    const relativeEffect = p1 > 0 ? (difference / p1) : 0;
    const cohensD = difference / Math.sqrt(pooledP * (1 - pooledP));
    
    // Practical significance (5% relative lift threshold)
    const practicalSignificance = Math.abs(relativeEffect) >= 0.05 ? 'significant' : 'negligible';
    
    // Statistical power
    const power = this.calculatePower(p1, p2, n1, n2);
    
    // Sample size adequacy
    const requiredSampleSize = this.calculateRequiredSampleSize(p1, this.MINIMUM_DETECTABLE_EFFECT);
    const actualSampleSize = Math.min(n1, n2);
    const adequacy = actualSampleSize >= requiredSampleSize ? 'adequate' : 'inadequate';
    
    // Recommendation
    let recommendation: StatisticalTestResult['recommendation'];
    if (pValue < this.SIGNIFICANCE_LEVEL && power >= this.POWER_LEVEL) {
      recommendation = relativeEffect > 0 ? 'accept' : 'reject';
    } else if (pValue >= this.SIGNIFICANCE_LEVEL && power >= this.POWER_LEVEL) {
      recommendation = 'reject';
    } else if (power < this.POWER_LEVEL) {
      recommendation = adequacy === 'adequate' ? 'continue' : 'inconclusive';
    } else {
      recommendation = 'inconclusive';
    }
    
    return {
      pValue,
      confidence: confidenceLevel,
      significant: pValue < this.SIGNIFICANCE_LEVEL,
      confidenceInterval,
      effectSize: {
        absolute: absoluteEffect,
        relative: relativeEffect,
        cohensD,
        practicalSignificance
      },
      power,
      sampleSize: {
        required: requiredSampleSize,
        actual: actualSampleSize,
        adequacy
      },
      recommendation
    };
  }

  /**
   * Perform chi-square test for categorical data
   */
  chiSquareTest(observed: number[][], expected?: number[][]): StatisticalTestResult {
    const rows = observed.length;
    const cols = observed[0].length;
    
    // Calculate expected values if not provided
    if (!expected) {
      expected = this.calculateExpectedValues(observed);
    }
    
    // Calculate chi-square statistic
    let chiSquare = 0;
    let totalObserved = 0;
    let totalExpected = 0;
    
    for (let i = 0; i < rows; i++) {
      for (let j = 0; j < cols; j++) {
        totalObserved += observed[i][j];
        totalExpected += expected[i][j];
        
        if (expected[i][j] > 0) {
          chiSquare += Math.pow(observed[i][j] - expected[i][j], 2) / expected[i][j];
        }
      }
    }
    
    // Degrees of freedom
    const degreesOfFreedom = (rows - 1) * (cols - 1);
    
    // P-value (simplified - would use chi-square distribution in production)
    const pValue = 1 - this.chiSquareCDF(chiSquare, degreesOfFreedom);
    
    // Confidence interval (simplified for chi-square)
    const margin = Math.sqrt(chiSquare / totalObserved);
    const confidenceInterval = {
      lower: -margin,
      upper: margin,
      margin
    };
    
    // Effect size (Cramér's V)
    const cramersV = Math.sqrt(chiSquare / (totalObserved * Math.min(rows - 1, cols - 1)));
    
    // Power (simplified)
    const power = Math.min(0.95, chiSquare / degreesOfFreedom);
    
    // Sample size adequacy
    const requiredSampleSize = 100; // Simplified
    const actualSampleSize = totalObserved;
    const adequacy = actualSampleSize >= requiredSampleSize ? 'adequate' : 'inadequate';
    
    // Recommendation
    let recommendation: StatisticalTestResult['recommendation'];
    if (pValue < this.SIGNIFICANCE_LEVEL && power >= this.POWER_LEVEL) {
      recommendation = 'accept';
    } else if (pValue >= this.SIGNIFICANCE_LEVEL) {
      recommendation = 'reject';
    } else {
      recommendation = 'inconclusive';
    }
    
    return {
      pValue,
      confidence: 0.95,
      significant: pValue < this.SIGNIFICANCE_LEVEL,
      confidenceInterval,
      effectSize: {
        absolute: cramersV,
        relative: cramersV * 100,
        cohensD: cramersV * 2,
        practicalSignificance: cramersV > 0.1 ? 'significant' : 'negligible'
      },
      power,
      sampleSize: {
        required: requiredSampleSize,
        actual: actualSampleSize,
        adequacy
      },
      recommendation
    };
  }

  /**
   * Perform multiple comparisons with correction
   */
  multipleComparisons(
    variants: Record<string, VariantData>,
    controlId: string,
    correctionMethod: 'bonferroni' | 'holm' | 'fdr' = 'bonferroni'
  ): MultipleComparisonResult {
    const control = variants[controlId];
    const comparisons: MultipleComparisonResult['comparisons'] = [];
    
    // Perform pairwise comparisons
    Object.entries(variants).forEach(([variantId, variant]) => {
      if (variantId !== controlId) {
        const result = this.twoProportionZTest(control, variant);
        comparisons.push({
          variantA: controlId,
          variantB: variantId,
          result
        });
      }
    });
    
    // Apply multiple testing correction
    const adjustedPValues: Record<string, number> = {};
    const significantAfterCorrection: Record<string, boolean> = {};
    
    if (correctionMethod === 'bonferroni') {
      // Bonferroni correction
      const numTests = comparisons.length;
      comparisons.forEach(comp => {
        const key = `${comp.variantA}_vs_${comp.variantB}`;
        adjustedPValues[key] = Math.min(comp.result.pValue * numTests, 1);
        significantAfterCorrection[key] = adjustedPValues[key] < this.SIGNIFICANCE_LEVEL;
      });
    } else if (correctionMethod === 'holm') {
      // Holm-Bonferroni correction
      const sortedComparisons = [...comparisons].sort((a, b) => a.result.pValue - b.result.pValue);
      const numTests = comparisons.length;
      
      sortedComparisons.forEach((comp, index) => {
        const key = `${comp.variantA}_vs_${comp.variantB}`;
        const adjustedP = comp.result.pValue * (numTests - index);
        adjustedPValues[key] = Math.min(adjustedP, 1);
        significantAfterCorrection[key] = adjustedPValues[key] < this.SIGNIFICANCE_LEVEL;
      });
    } else if (correctionMethod === 'fdr') {
      // False Discovery Rate (Benjamini-Hochberg)
      const sortedComparisons = [...comparisons].sort((a, b) => a.result.pValue - b.result.pValue);
      const numTests = comparisons.length;
      
      sortedComparisons.forEach((comp, index) => {
        const key = `${comp.variantA}_vs_${comp.variantB}`;
        const adjustedP = comp.result.pValue * numTests / (index + 1);
        adjustedPValues[key] = Math.min(adjustedP, 1);
        significantAfterCorrection[key] = adjustedPValues[key] < this.SIGNIFICANCE_LEVEL;
      });
    }
    
    // Determine winner
    let winner: MultipleComparisonResult['winner'] = null;
    let bestVariant = null;
    let bestLift = 0;
    
    comparisons.forEach(comp => {
      const key = `${comp.variantA}_vs_${comp.variantB}`;
      if (significantAfterCorrection[key] && comp.result.effectSize.relative > bestLift) {
        bestLift = comp.result.effectSize.relative;
        bestVariant = comp.variantB;
      }
    });
    
    if (bestVariant) {
      const risk = bestLift > 10 ? 'low' : bestLift > 5 ? 'medium' : 'high';
      winner = {
        variantId: bestVariant,
        variantName: bestVariant, // In practice, would look up actual name
        confidence: 1 - adjustedPValues[`${controlId}_vs_${bestVariant}`],
        risk
      };
    }
    
    return {
      comparisons,
      adjustedPValues,
      significantAfterCorrection,
      winner
    };
  }

  /**
   * Calculate required sample size for A/B test
   */
  calculateRequiredSampleSize(
    baselineRate: number,
    minimumDetectableEffect: number,
    power: number = this.POWER_LEVEL,
    significanceLevel: number = this.SIGNIFICANCE_LEVEL
  ): number {
    const zAlpha = this.normalQuantile(1 - significanceLevel/2);
    const zBeta = this.normalQuantile(power);
    
    const p1 = baselineRate;
    const p2 = baselineRate * (1 + minimumDetectableEffect);
    const pooledP = (p1 + p2) / 2;
    
    const sampleSize = (
      2 * pooledP * (1 - pooledP) * Math.pow(zAlpha + zBeta, 2)
    ) / Math.pow(p2 - p1, 2);
    
    return Math.ceil(sampleSize);
  }

  /**
   * Calculate statistical power
   */
  calculatePower(
    baselineRate: number,
    variantRate: number,
    sampleSize1: number,
    sampleSize2: number
  ): number {
    const pooledP = (baselineRate + variantRate) / 2;
    const standardError = Math.sqrt(pooledP * (1 - pooledP) * (1/sampleSize1 + 1/sampleSize2));
    const effectSize = Math.abs(variantRate - baselineRate) / standardError;
    
    // Simplified power calculation
    const zScore = effectSize - this.normalQuantile(1 - this.SIGNIFICANCE_LEVEL/2);
    const power = this.normalCDF(zScore);
    
    return Math.min(0.99, Math.max(0.01, power));
  }

  /**
   * Sequential analysis for early stopping
   */
  sequentialAnalysis(
    data: Array<{ day: number; control: VariantData; variant: VariantData }>,
    alphaSpent: number[] = []
  ): {
    canStop: boolean;
    winner: string | null;
    confidence: number;
    boundaries: {
      upper: number[];
      lower: number[];
    };
  } {
    // O'Brien-Fleming boundaries for sequential analysis
    const numLooks = data.length;
    const boundaries = this.calculateO'BrienFlemingBoundaries(numLooks);
    
    let canStop = false;
    let winner: string | null = null;
    let confidence = 0;
    
    // Check each time point
    data.forEach((point, index) => {
      if (!canStop) {
        const result = this.twoProportionZTest(point.control, point.variant);
        const zScore = this.normalQuantile(1 - result.pValue/2);
        
        if (zScore >= boundaries.upper[index]) {
          canStop = true;
          winner = 'variant';
          confidence = 1 - result.pValue;
        } else if (zScore <= boundaries.lower[index]) {
          canStop = true;
          winner = 'control';
          confidence = 1 - result.pValue;
        }
      }
    });
    
    return {
      canStop,
      winner,
      confidence,
      boundaries
    };
  }

  /**
   * Calculate O'Brien-Fleming boundaries for sequential analysis
   */
  private calculateO'BrienFlemingBoundaries(numLooks: number): {
    upper: number[];
    lower: number[];
  } {
    const alpha = this.SIGNIFICANCE_LEVEL;
    const upper: number[] = [];
    const lower: number[] = [];
    
    for (let i = 1; i <= numLooks; i++) {
      const boundary = this.normalQuantile(1 - alpha/(2 * numLooks)) * Math.sqrt(numLooks / i);
      upper.push(boundary);
      lower.push(-boundary);
    }
    
    return { upper, lower };
  }

  /**
   * Calculate expected values for chi-square test
   */
  private calculateExpectedValues(observed: number[][]): number[][] {
    const rows = observed.length;
    const cols = observed[0].length;
    const expected: number[][] = [];
    
    // Calculate row and column totals
    const rowTotals = observed.map(row => row.reduce((sum, val) => sum + val, 0));
    const colTotals = observed[0].map((_, colIndex) => 
      observed.reduce((sum, row) => sum + row[colIndex], 0)
    );
    const grandTotal = rowTotals.reduce((sum, val) => sum + val, 0);
    
    // Calculate expected values
    for (let i = 0; i < rows; i++) {
      expected[i] = [];
      for (let j = 0; j < cols; j++) {
        expected[i][j] = (rowTotals[i] * colTotals[j]) / grandTotal;
      }
    }
    
    return expected;
  }

  /**
   * Normal cumulative distribution function (CDF)
   */
  private normalCDF(x: number): number {
    // Approximation of normal CDF
    const t = 1 / (1 + 0.2316419 * Math.abs(x));
    const d = 0.3989423 * Math.exp(-x * x / 2);
    const prob = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
    return x > 0 ? 1 - prob : prob;
  }

  /**
   * Normal quantile function (inverse CDF)
   */
  private normalQuantile(p: number): number {
    // Approximation of normal quantile
    const a = [0, -3.969683028665376e+01, 2.209460984245205e+02,
               -2.759285104469687e+02, 1.383577518672690e+02,
               -3.066479806614716e+01, 2.506628277459239e+00];
    
    const b = [0, -5.447609879822406e+01, 1.615858368580409e+02,
               -1.556989798598866e+02, 6.680131188771972e+01,
               -1.328068155288572e+01];
    
    const c = [0, -7.784894002430293e-03, -3.223964580411365e-01,
               -2.400758277161838e+00, -2.549732539343734e+00,
               4.374664141464968e+00, 2.938163982698783e+00];
    
    const d = [0, 7.784695709041462e-03, 3.224671290700398e-01,
               2.445134137142996e+00, 3.754408661907416e+00];
    
    const pLow = 0.02425;
    const pHigh = 1 - pLow;
    let q, r;
    
    if (p < pLow) {
      q = Math.sqrt(-2 * Math.log(p));
      return (((((c[1] * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) * q + c[6]) /
             ((((d[1] * q + d[2]) * q + d[3]) * q + d[4]) * q + 1);
    } else if (p <= pHigh) {
      q = p - 0.5;
      r = q * q;
      return (((((a[1] * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * r + a[6]) * q /
             (((((b[1] * r + b[2]) * r + b[3]) * r + b[4]) * r + b[5]) * r + 1);
    } else {
      q = Math.sqrt(-2 * Math.log(1 - p));
      return -(((((c[1] * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) * q + c[6]) /
              ((((d[1] * q + d[2]) * q + d[3]) * q + d[4]) * q + 1);
    }
  }

  /**
   * Chi-square cumulative distribution function (CDF)
   */
  private chiSquareCDF(x: number, df: number): number {
    // Simplified chi-square CDF approximation
    if (x <= 0) return 0;
    if (df === 1) return 2 * (this.normalCDF(Math.sqrt(x)) - 0.5);
    
    // For larger degrees of freedom, use normal approximation
    const mean = df;
    const variance = 2 * df;
    const z = (x - mean) / Math.sqrt(variance);
    return this.normalCDF(z);
  }
}

// Export singleton instance
export const statisticalAnalyzer = new StatisticalAnalyzer();

// Export utility functions
export function twoProportionZTest(
  control: VariantData,
  variant: VariantData,
  confidenceLevel?: number
): StatisticalTestResult {
  return statisticalAnalyzer.twoProportionZTest(control, variant, confidenceLevel);
}

export function chiSquareTest(observed: number[][], expected?: number[][]): StatisticalTestResult {
  return statisticalAnalyzer.chiSquareTest(observed, expected);
}

export function multipleComparisons(
  variants: Record<string, VariantData>,
  controlId: string,
  correctionMethod?: 'bonferroni' | 'holm' | 'fdr'
): MultipleComparisonResult {
  return statisticalAnalyzer.multipleComparisons(variants, controlId, correctionMethod);
}

export function calculateRequiredSampleSize(
  baselineRate: number,
  minimumDetectableEffect: number,
  power?: number,
  significanceLevel?: number
): number {
  return statisticalAnalyzer.calculateRequiredSampleSize(
    baselineRate,
    minimumDetectableEffect,
    power,
    significanceLevel
  );
}

export function sequentialAnalysis(
  data: Array<{ day: number; control: VariantData; variant: VariantData }>,
  alphaSpent?: number[]
): {
  canStop: boolean;
  winner: string | null;
  confidence: number;
  boundaries: {
    upper: number[];
    lower: number[];
  };
} {
  return statisticalAnalyzer.sequentialAnalysis(data, alphaSpent);
}