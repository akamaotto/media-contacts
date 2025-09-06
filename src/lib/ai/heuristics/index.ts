/**
 * Media Heuristics - Export all heuristic analyzers
 */

import { BeatAnalyzer } from './beat-analyzer';
import { EmailAnalyzer } from './email-analyzer';
import { FreelancerAnalyzer } from './freelancer-analyzer';
import { SyndicationDetector } from './syndication-detector';
import { MediaHeuristics } from './media-heuristics';

export { BeatAnalyzer, type BeatAnalysis, type BeatSource } from './beat-analyzer';
export { EmailAnalyzer, type EmailAnalysis, type EmailPattern } from './email-analyzer';
export { FreelancerAnalyzer, type FreelancerProfile, type OutletAssociation } from './freelancer-analyzer';
export { SyndicationDetector, type SyndicationAnalysis, type SourceInfo } from './syndication-detector';
export { 
  MediaHeuristics, 
  type MediaHeuristicsAnalysis, 
  type MediaRecommendation,
  type ContactInput,
  type ContentInput 
} from './media-heuristics';

// Create singleton instances for easy use
export const beatAnalyzer = new BeatAnalyzer();
export const emailAnalyzer = new EmailAnalyzer();
export const freelancerAnalyzer = new FreelancerAnalyzer();
export const syndicationDetector = new SyndicationDetector();
export const mediaHeuristics = new MediaHeuristics();