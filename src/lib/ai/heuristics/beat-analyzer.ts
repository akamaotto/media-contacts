/**
 * Beat Analyzer - Media-Smart Beat Detection and Prioritization
 * Implements section beats > keyword beats logic for more accurate beat assignment
 */

export interface BeatAnalysis {
  primaryBeats: string[];
  secondaryBeats: string[];
  confidence: number;
  sources: {
    sectionBased: string[];
    keywordBased: string[];
    contextBased: string[];
  };
  reasoning: string;
}

export interface BeatSource {
  beat: string;
  source: 'section' | 'keyword' | 'context' | 'byline';
  confidence: number;
  evidence: string;
  weight: number;
}

/**
 * Section-based beat mappings - these take priority over keyword detection
 */
const SECTION_BEAT_MAPPINGS: Record<string, string[]> = {
  // Technology sections
  'tech': ['technology'],
  'technology': ['technology'],
  'innovation': ['technology', 'innovation'],
  'startups': ['startups', 'technology'],
  'ai': ['artificial intelligence', 'technology'],
  'cybersecurity': ['cybersecurity', 'technology'],
  'fintech': ['fintech', 'finance', 'technology'],
  
  // Business sections
  'business': ['business'],
  'finance': ['finance', 'business'],
  'markets': ['markets', 'finance'],
  'economy': ['economy', 'business'],
  'earnings': ['earnings', 'finance'],
  'ipo': ['ipo', 'finance'],
  'mergers': ['mergers and acquisitions', 'business'],
  'ma': ['mergers and acquisitions', 'business'],
  
  // Industry sections
  'healthcare': ['healthcare'],
  'biotech': ['biotechnology', 'healthcare'],
  'pharma': ['pharmaceuticals', 'healthcare'],
  'energy': ['energy'],
  'oil': ['oil and gas', 'energy'],
  'renewable': ['renewable energy', 'energy'],
  'automotive': ['automotive'],
  'retail': ['retail'],
  'real-estate': ['real estate'],
  'realestate': ['real estate'],
  
  // Media and Entertainment
  'media': ['media'],
  'entertainment': ['entertainment'],
  'gaming': ['gaming', 'entertainment'],
  'sports': ['sports'],
  'music': ['music', 'entertainment'],
  'film': ['film', 'entertainment'],
  'tv': ['television', 'entertainment'],
  
  // Politics and Policy
  'politics': ['politics'],
  'policy': ['policy', 'politics'],
  'government': ['government', 'politics'],
  'regulation': ['regulation', 'policy'],
  'congress': ['congress', 'politics'],
  'senate': ['senate', 'politics'],
  'house': ['house of representatives', 'politics'],
  
  // Science and Research
  'science': ['science'],
  'research': ['research', 'science'],
  'climate': ['climate change', 'environment'],
  'environment': ['environment'],
  'space': ['space', 'science'],
  'medical': ['medical', 'healthcare'],
  
  // Lifestyle and Culture
  'lifestyle': ['lifestyle'],
  'culture': ['culture'],
  'food': ['food', 'lifestyle'],
  'travel': ['travel', 'lifestyle'],
  'fashion': ['fashion', 'lifestyle'],
  'wellness': ['wellness', 'lifestyle']
};

/**
 * Keyword-based beat detection patterns
 */
const KEYWORD_BEAT_PATTERNS: Record<string, RegExp[]> = {
  'artificial intelligence': [
    /\b(AI|artificial intelligence|machine learning|ML|deep learning|neural networks?|LLM|GPT|chatbot|automation)\b/i
  ],
  'cybersecurity': [
    /\b(cybersecurity|cyber security|hacking|breach|malware|ransomware|phishing|data protection|privacy)\b/i
  ],
  'cryptocurrency': [
    /\b(crypto|cryptocurrency|bitcoin|ethereum|blockchain|DeFi|NFT|web3|digital currency)\b/i
  ],
  'climate change': [
    /\b(climate change|global warming|carbon|emissions|sustainability|renewable|green energy|ESG)\b/i
  ],
  'remote work': [
    /\b(remote work|work from home|WFH|hybrid work|distributed teams|digital nomad)\b/i
  ],
  'supply chain': [
    /\b(supply chain|logistics|shipping|manufacturing|inventory|procurement)\b/i
  ]
};

/**
 * Context clues that help determine beat relevance
 */
const CONTEXT_INDICATORS: Record<string, string[]> = {
  'technology': ['startup', 'innovation', 'digital', 'software', 'platform', 'app', 'tech'],
  'finance': ['investment', 'funding', 'valuation', 'IPO', 'revenue', 'profit', 'market'],
  'healthcare': ['patient', 'treatment', 'clinical', 'medical', 'hospital', 'drug', 'therapy'],
  'politics': ['election', 'vote', 'campaign', 'policy', 'legislation', 'government', 'congress'],
  'business': ['company', 'corporate', 'CEO', 'executive', 'strategy', 'growth', 'merger']
};

export class BeatAnalyzer {
  /**
   * Analyze and prioritize beats from multiple sources
   */
  analyzeBeat(content: {
    sectionPath?: string;
    title?: string;
    content?: string;
    byline?: string;
    url?: string;
  }): BeatAnalysis {
    const beatSources: BeatSource[] = [];
    
    // 1. Section-based analysis (highest priority)
    if (content.sectionPath || content.url) {
      const sectionBeats = this.extractSectionBeats(content.sectionPath || content.url || '');
      beatSources.push(...sectionBeats);
    }
    
    // 2. Keyword-based analysis (medium priority)
    const keywordBeats = this.extractKeywordBeats(content.title, content.content);
    beatSources.push(...keywordBeats);
    
    // 3. Context-based analysis (lower priority)
    const contextBeats = this.extractContextBeats(content.title, content.content);
    beatSources.push(...contextBeats);
    
    // 4. Byline-based analysis (supplementary)
    if (content.byline) {
      const bylineBeats = this.extractBylineBeats(content.byline);
      beatSources.push(...bylineBeats);
    }
    
    return this.synthesizeBeats(beatSources);
  }
  
  /**
   * Extract beats from URL section paths (highest confidence)
   */
  private extractSectionBeats(path: string): BeatSource[] {
    const beatSources: BeatSource[] = [];
    const pathSegments = path.toLowerCase().split('/').filter(Boolean);
    
    for (const segment of pathSegments) {
      // Direct section mapping
      if (SECTION_BEAT_MAPPINGS[segment]) {
        for (const beat of SECTION_BEAT_MAPPINGS[segment]) {
          beatSources.push({
            beat,
            source: 'section',
            confidence: 0.9,
            evidence: `Section path: /${segment}`,
            weight: 10
          });
        }
      }
      
      // Partial matches
      for (const [sectionKey, beats] of Object.entries(SECTION_BEAT_MAPPINGS)) {
        if (segment.includes(sectionKey) || sectionKey.includes(segment)) {
          for (const beat of beats) {
            beatSources.push({
              beat,
              source: 'section',
              confidence: 0.7,
              evidence: `Section path contains: ${sectionKey}`,
              weight: 8
            });
          }
        }
      }
    }
    
    return beatSources;
  }
  
  /**
   * Extract beats from keyword patterns (medium confidence)
   */
  private extractKeywordBeats(title?: string, content?: string): BeatSource[] {
    const beatSources: BeatSource[] = [];
    const text = `${title || ''} ${content || ''}`.toLowerCase();
    
    for (const [beat, patterns] of Object.entries(KEYWORD_BEAT_PATTERNS)) {
      for (const pattern of patterns) {
        const matches = text.match(pattern);
        if (matches) {
          beatSources.push({
            beat,
            source: 'keyword',
            confidence: 0.6,
            evidence: `Keyword match: "${matches[0]}"`,
            weight: 5
          });
        }
      }
    }
    
    return beatSources;
  }
  
  /**
   * Extract beats from context indicators (lower confidence)
   */
  private extractContextBeats(title?: string, content?: string): BeatSource[] {
    const beatSources: BeatSource[] = [];
    const text = `${title || ''} ${content || ''}`.toLowerCase();
    
    for (const [beat, indicators] of Object.entries(CONTEXT_INDICATORS)) {
      let matchCount = 0;
      const matchedIndicators: string[] = [];
      
      for (const indicator of indicators) {
        if (text.includes(indicator.toLowerCase())) {
          matchCount++;
          matchedIndicators.push(indicator);
        }
      }
      
      if (matchCount >= 2) { // Require multiple context indicators
        beatSources.push({
          beat,
          source: 'context',
          confidence: 0.4 + (matchCount * 0.1),
          evidence: `Context indicators: ${matchedIndicators.join(', ')}`,
          weight: 3
        });
      }
    }
    
    return beatSources;
  }
  
  /**
   * Extract beats from byline information
   */
  private extractBylineBeats(byline: string): BeatSource[] {
    const beatSources: BeatSource[] = [];
    const bylineLower = byline.toLowerCase();
    
    // Look for explicit beat mentions in byline
    const beatMentions = [
      { pattern: /technology|tech/i, beat: 'technology' },
      { pattern: /business|finance/i, beat: 'business' },
      { pattern: /politics|political/i, beat: 'politics' },
      { pattern: /health|medical/i, beat: 'healthcare' },
      { pattern: /sports/i, beat: 'sports' },
      { pattern: /entertainment/i, beat: 'entertainment' },
      { pattern: /science/i, beat: 'science' }
    ];
    
    for (const { pattern, beat } of beatMentions) {
      if (pattern.test(bylineLower)) {
        beatSources.push({
          beat,
          source: 'byline',
          confidence: 0.5,
          evidence: `Byline mention: "${byline}"`,
          weight: 4
        });
      }
    }
    
    return beatSources;
  }
  
  /**
   * Synthesize beats from all sources with proper prioritization
   */
  private synthesizeBeats(beatSources: BeatSource[]): BeatAnalysis {
    // Group by beat and calculate weighted scores
    const beatScores = new Map<string, {
      totalScore: number;
      sources: BeatSource[];
      maxConfidence: number;
    }>();
    
    for (const source of beatSources) {
      const score = source.confidence * source.weight;
      const existing = beatScores.get(source.beat);
      
      if (existing) {
        existing.totalScore += score;
        existing.sources.push(source);
        existing.maxConfidence = Math.max(existing.maxConfidence, source.confidence);
      } else {
        beatScores.set(source.beat, {
          totalScore: score,
          sources: [source],
          maxConfidence: source.confidence
        });
      }
    }
    
    // Sort beats by score and separate primary/secondary
    const sortedBeats = Array.from(beatScores.entries())
      .sort(([, a], [, b]) => b.totalScore - a.totalScore);
    
    const primaryBeats = sortedBeats
      .filter(([, data]) => data.totalScore >= 5) // Minimum threshold for primary
      .slice(0, 3) // Max 3 primary beats
      .map(([beat]) => beat);
    
    const secondaryBeats = sortedBeats
      .filter(([beat, data]) => !primaryBeats.includes(beat) && data.totalScore >= 2)
      .slice(0, 5) // Max 5 secondary beats
      .map(([beat]) => beat);
    
    // Calculate overall confidence
    const totalScore = sortedBeats.reduce((sum, [, data]) => sum + data.totalScore, 0);
    const maxPossibleScore = beatSources.length * 10; // Max weight is 10
    const confidence = Math.min(totalScore / Math.max(maxPossibleScore, 1), 1);
    
    // Generate reasoning
    const reasoning = this.generateReasoning(sortedBeats.slice(0, 3), beatScores);
    
    // Categorize sources
    const sources = {
      sectionBased: beatSources.filter(s => s.source === 'section').map(s => s.beat),
      keywordBased: beatSources.filter(s => s.source === 'keyword').map(s => s.beat),
      contextBased: beatSources.filter(s => s.source === 'context').map(s => s.beat)
    };
    
    return {
      primaryBeats,
      secondaryBeats,
      confidence,
      sources,
      reasoning
    };
  }
  
  /**
   * Generate human-readable reasoning for beat assignment
   */
  private generateReasoning(
    topBeats: Array<[string, { totalScore: number; sources: BeatSource[]; maxConfidence: number }]>,
    beatScores: Map<string, { totalScore: number; sources: BeatSource[]; maxConfidence: number }>
  ): string {
    if (topBeats.length === 0) {
      return 'No clear beat indicators found in content.';
    }
    
    const [topBeat, topData] = topBeats[0];
    const sectionSources = topData.sources.filter(s => s.source === 'section');
    const keywordSources = topData.sources.filter(s => s.source === 'keyword');
    
    let reasoning = `Primary beat "${topBeat}" determined by: `;
    
    if (sectionSources.length > 0) {
      reasoning += `section-based evidence (${sectionSources[0].evidence})`;
      if (keywordSources.length > 0) {
        reasoning += ` reinforced by keyword patterns`;
      }
    } else if (keywordSources.length > 0) {
      reasoning += `keyword patterns (${keywordSources[0].evidence})`;
    } else {
      reasoning += `context analysis`;
    }
    
    if (topBeats.length > 1) {
      reasoning += `. Secondary beats include: ${topBeats.slice(1).map(([beat]) => beat).join(', ')}`;
    }
    
    return reasoning;
  }
  
  /**
   * Compare two beat analyses and determine which is more reliable
   */
  compareBeatAnalyses(analysis1: BeatAnalysis, analysis2: BeatAnalysis): BeatAnalysis {
    // Prioritize section-based beats
    const analysis1SectionBeats = analysis1.sources.sectionBased.length;
    const analysis2SectionBeats = analysis2.sources.sectionBased.length;
    
    if (analysis1SectionBeats > analysis2SectionBeats) {
      return analysis1;
    } else if (analysis2SectionBeats > analysis1SectionBeats) {
      return analysis2;
    }
    
    // If section beats are equal, use confidence
    return analysis1.confidence > analysis2.confidence ? analysis1 : analysis2;
  }
  
  /**
   * Merge multiple beat analyses with proper weighting
   */
  mergeBeatAnalyses(analyses: BeatAnalysis[]): BeatAnalysis {
    if (analyses.length === 0) {
      return {
        primaryBeats: [],
        secondaryBeats: [],
        confidence: 0,
        sources: { sectionBased: [], keywordBased: [], contextBased: [] },
        reasoning: 'No analyses to merge'
      };
    }
    
    if (analyses.length === 1) {
      return analyses[0];
    }
    
    // Combine all beat sources with weighting based on analysis confidence
    const allBeatSources: BeatSource[] = [];
    
    for (const analysis of analyses) {
      const weight = analysis.confidence;
      
      // Convert analysis back to beat sources for re-synthesis
      for (const beat of analysis.primaryBeats) {
        allBeatSources.push({
          beat,
          source: 'section', // Assume primary beats are section-based
          confidence: analysis.confidence,
          evidence: `Merged from analysis`,
          weight: 10 * weight
        });
      }
      
      for (const beat of analysis.secondaryBeats) {
        allBeatSources.push({
          beat,
          source: 'keyword', // Assume secondary beats are keyword-based
          confidence: analysis.confidence * 0.8,
          evidence: `Merged from analysis`,
          weight: 5 * weight
        });
      }
    }
    
    return this.synthesizeBeats(allBeatSources);
  }
}