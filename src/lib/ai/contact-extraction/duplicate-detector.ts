/**
 * Duplicate Detection System
 * Identifies and manages duplicate contacts across extraction results
 */

import {
  ExtractedContact,
  DuplicateGroup,
  DuplicateType,
  ContactExtractionError,
  ExtractionMethod
} from './types';
import crypto from 'crypto';

export class DuplicateDetector {
  private readonly similarityThresholds = {
    email: 0.95, // Email must be exact or very similar
    nameOutlet: 0.85, // Name + outlet similarity
    nameTitle: 0.80, // Name + title similarity
    outletTitle: 0.75, // Outlet + title similarity
    similarBio: 0.70, // Bio content similarity
    socialMedia: 0.80, // Social media profile similarity
    overall: 0.75 // Overall similarity threshold
  };

  private readonly weights = {
    email: 0.35,
    name: 0.25,
    outlet: 0.15,
    title: 0.10,
    bio: 0.10,
    social: 0.05
  };

  /**
   * Detect duplicate contacts in a collection
   */
  detectDuplicates(contacts: ExtractedContact[]): {
    duplicateGroups: DuplicateGroup[];
    uniqueContacts: ExtractedContact[];
    totalDuplicates: number;
    duplicateRate: number;
  } {
    if (contacts.length === 0) {
      return {
        duplicateGroups: [],
        uniqueContacts: [],
        totalDuplicates: 0,
        duplicateRate: 0
      };
    }

    const duplicateGroups: DuplicateGroup[] = [];
    const processedContacts = new Set<string>();
    const uniqueContacts: ExtractedContact[] = [];

    // Sort contacts by confidence score for consistent processing
    const sortedContacts = [...contacts].sort((a, b) => b.confidenceScore - a.confidenceScore);

    for (const contact of sortedContacts) {
      if (processedContacts.has(contact.id)) {
        continue;
      }

      const duplicates = this.findDuplicatesForContact(contact, sortedContacts, processedContacts);

      if (duplicates.length > 0) {
        const duplicateGroup = this.createDuplicateGroup(contact, duplicates);
        duplicateGroups.push(duplicateGroup);

        // Mark all contacts in group as processed
        processedContacts.add(contact.id);
        duplicates.forEach(dup => processedContacts.add(dup.id));
      } else {
        uniqueContacts.push(contact);
        processedContacts.add(contact.id);
      }
    }

    const totalDuplicates = contacts.length - uniqueContacts.length;
    const duplicateRate = totalDuplicates / contacts.length;

    return {
      duplicateGroups,
      uniqueContacts,
      totalDuplicates,
      duplicateRate
    };
  }

  /**
   * Find duplicates for a specific contact
   */
  private findDuplicatesForContact(
    contact: ExtractedContact,
    allContacts: ExtractedContact[],
    processedContacts: Set<string>
  ): ExtractedContact[] {
    const duplicates: ExtractedContact[] = [];

    for (const candidate of allContacts) {
      if (candidate.id === contact.id || processedContacts.has(candidate.id)) {
        continue;
      }

      const similarity = this.calculateSimilarity(contact, candidate);
      const duplicateType = this.determineDuplicateType(contact, candidate, similarity);

      if (duplicateType && similarity.overall >= this.similarityThresholds.overall) {
        duplicates.push(candidate);
      }
    }

    return duplicates;
  }

  /**
   * Calculate similarity between two contacts
   */
  calculateSimilarity(contact1: ExtractedContact, contact2: ExtractedContact): {
    overall: number;
    email: number;
    name: number;
    outlet: number;
    title: number;
    bio: number;
    social: number;
    details: {
      emailMatch: boolean;
      nameSimilarity: number;
      outletSimilarity: number;
      titleSimilarity: number;
      bioSimilarity: number;
      socialSimilarity: number;
    };
  } {
    // Email similarity (highest priority)
    const emailMatch = this.compareEmails(contact1.email, contact2.email);
    const emailSimilarity = emailMatch ? 1.0 : 0.0;

    // Name similarity
    const nameSimilarity = this.calculateNameSimilarity(contact1.name, contact2.name);

    // Outlet similarity (from URL)
    const outletSimilarity = this.calculateOutletSimilarity(contact1.sourceUrl, contact2.sourceUrl);

    // Title similarity
    const titleSimilarity = this.calculateTitleSimilarity(contact1.title, contact2.title);

    // Bio similarity
    const bioSimilarity = this.calculateBioSimilarity(contact1.bio, contact2.bio);

    // Social media similarity
    const socialSimilarity = this.calculateSocialSimilarity(
      contact1.socialProfiles,
      contact2.socialProfiles
    );

    // Calculate weighted overall similarity
    const overall = Math.round(
      (emailSimilarity * this.weights.email +
       nameSimilarity * this.weights.name +
       outletSimilarity * this.weights.outlet +
       titleSimilarity * this.weights.title +
       bioSimilarity * this.weights.bio +
       socialSimilarity * this.weights.social) * 100
    ) / 100;

    return {
      overall,
      email: emailSimilarity,
      name: nameSimilarity,
      outlet: outletSimilarity,
      title: titleSimilarity,
      bio: bioSimilarity,
      social: socialSimilarity,
      details: {
        emailMatch,
        nameSimilarity,
        outletSimilarity,
        titleSimilarity,
        bioSimilarity,
        socialSimilarity
      }
    };
  }

  /**
   * Determine the type of duplicate relationship
   */
  private determineDuplicateType(
    contact1: ExtractedContact,
    contact2: ExtractedContact,
    similarity: any
  ): DuplicateType | null {
    // Email match (strongest indicator)
    if (similarity.email >= this.similarityThresholds.email) {
      return DuplicateType.EMAIL;
    }

    // Name + outlet match
    if (similarity.name >= this.similarityThresholds.nameOutlet &&
        similarity.outlet >= this.similarityThresholds.outlet) {
      return DuplicateType.NAME_OUTLET;
    }

    // Name + title match
    if (similarity.name >= this.similarityThresholds.nameTitle &&
        similarity.title >= this.similarityThresholds.title) {
      return DuplicateType.NAME_TITLE;
    }

    // Outlet + title match
    if (similarity.outlet >= this.similarityThresholds.outlet &&
        similarity.title >= this.similarityThresholds.title) {
      return DuplicateType.OUTLET_TITLE;
    }

    // Similar bio
    if (similarity.bio >= this.similarityThresholds.similarBio) {
      return DuplicateType.SIMILAR_BIO;
    }

    // Social media match
    if (similarity.social >= this.similarityThresholds.socialMedia) {
      return DuplicateType.SOCIAL_MEDIA;
    }

    return null;
  }

  /**
   * Create a duplicate group
   */
  private createDuplicateGroup(
    primaryContact: ExtractedContact,
    duplicateContacts: ExtractedContact[]
  ): DuplicateGroup {
    const allContacts = [primaryContact, ...duplicateContacts];

    // Calculate average similarity within the group
    let totalSimilarity = 0;
    let similarityCount = 0;

    for (let i = 0; i < allContacts.length; i++) {
      for (let j = i + 1; j < allContacts.length; j++) {
        const similarity = this.calculateSimilarity(allContacts[i], allContacts[j]);
        totalSimilarity += similarity.overall;
        similarityCount++;
      }
    }

    const averageSimilarity = similarityCount > 0 ? totalSimilarity / similarityCount : 0;

    // Determine duplicate type based on most common similarity
    const duplicateType = this.determineGroupDuplicateType(allContacts);

    // Select best contact (highest confidence score)
    const selectedContact = primaryContact.id; // Primary is already highest confidence

    return {
      id: this.generateDuplicateGroupId(allContacts),
      contacts: allContacts.map(c => c.id),
      similarityScore: Math.round(averageSimilarity * 100) / 100,
      duplicateType,
      confidenceScore: primaryContact.confidenceScore,
      selectedContact,
      reasoning: this.generateDuplicateReasoning(allContacts, duplicateType, averageSimilarity)
    };
  }

  /**
   * Determine duplicate type for a group
   */
  private determineGroupDuplicateType(contacts: ExtractedContact[]): DuplicateType {
    const typeCounts: Record<DuplicateType, number> = {
      [DuplicateType.EMAIL]: 0,
      [DuplicateType.NAME_OUTLET]: 0,
      [DuplicateType.NAME_TITLE]: 0,
      [DuplicateType.OUTLET_TITLE]: 0,
      [DuplicateType.SIMILAR_BIO]: 0,
      [DuplicateType.SOCIAL_MEDIA]: 0
    };

    // Count similarity types between all pairs
    for (let i = 0; i < contacts.length; i++) {
      for (let j = i + 1; j < contacts.length; j++) {
        const similarity = this.calculateSimilarity(contacts[i], contacts[j]);
        const duplicateType = this.determineDuplicateType(contacts[i], contacts[j], similarity);

        if (duplicateType) {
          typeCounts[duplicateType]++;
        }
      }
    }

    // Return the most common type
    let maxCount = 0;
    let mostCommonType = DuplicateType.EMAIL; // Default

    for (const [type, count] of Object.entries(typeCounts)) {
      if (count > maxCount) {
        maxCount = count;
        mostCommonType = type as DuplicateType;
      }
    }

    return mostCommonType;
  }

  /**
   * Generate reasoning for duplicate detection
   */
  private generateDuplicateReasoning(
    contacts: ExtractedContact[],
    duplicateType: DuplicateType,
    averageSimilarity: number
  ): string {
    const reasons: string[] = [];

    switch (duplicateType) {
      case DuplicateType.EMAIL:
        reasons.push('Email addresses match or are very similar');
        break;
      case DuplicateType.NAME_OUTLET:
        reasons.push('Name and media outlet match');
        break;
      case DuplicateType.NAME_TITLE:
        reasons.push('Name and title/position match');
        break;
      case DuplicateType.OUTLET_TITLE:
        reasons.push('Media outlet and title/position match');
        break;
      case DuplicateType.SIMILAR_BIO:
        reasons.push('Biographical information is very similar');
        break;
      case DuplicateType.SOCIAL_MEDIA:
        reasons.push('Social media profiles match');
        break;
    }

    reasons.push(`Average similarity: ${(averageSimilarity * 100).toFixed(1)}%`);
    reasons.push(`Group contains ${contacts.length} contacts`);

    return reasons.join('; ');
  }

  /**
   * Compare email addresses
   */
  private compareEmails(email1?: string, email2?: string): boolean {
    if (!email1 || !email2) {
      return false;
    }

    const cleanEmail1 = email1.toLowerCase().trim();
    const cleanEmail2 = email2.toLowerCase().trim();

    // Exact match
    if (cleanEmail1 === cleanEmail2) {
      return true;
    }

    // Check for common variations
    const domain1 = cleanEmail1.split('@')[1];
    const domain2 = cleanEmail2.split('@')[1];

    if (domain1 !== domain2) {
      return false;
    }

    const local1 = cleanEmail1.split('@')[0];
    const local2 = cleanEmail2.split('@')[0];

    // Handle common email patterns
    // firstname.lastname vs firstname_lastname
    if (local1.replace('.', '_') === local2.replace('.', '_')) {
      return true;
    }

    // firstname vs firstname.lastname
    if (local1 === local2.split('.')[0] || local2 === local1.split('.')[0]) {
      return true;
    }

    // Handle + aliases
    const baseLocal1 = local1.split('+')[0];
    const baseLocal2 = local2.split('+')[0];

    if (baseLocal1 === baseLocal2) {
      return true;
    }

    return false;
  }

  /**
   * Calculate name similarity
   */
  private calculateNameSimilarity(name1: string, name2: string): number {
    if (!name1 || !name2) {
      return 0;
    }

    const cleanName1 = name1.toLowerCase().trim();
    const cleanName2 = name2.toLowerCase().trim();

    // Exact match
    if (cleanName1 === cleanName2) {
      return 1.0;
    }

    // Check for reversed names
    const name1Parts = cleanName1.split(' ').filter(p => p.length > 0);
    const name2Parts = cleanName2.split(' ').filter(p => p.length > 0);

    // If one is reversed version of the other
    if (name1Parts.length >= 2 && name2Parts.length >= 2) {
      const reversedName2 = [...name2Parts].reverse().join(' ');
      if (cleanName1 === reversedName2) {
        return 0.95;
      }
    }

    // Check for name with/without middle initial
    if (name1Parts.length === 3 && name2Parts.length === 2) {
      // Check if first and last names match
      if (name1Parts[0] === name2Parts[0] && name1Parts[2] === name2Parts[1]) {
        return 0.9;
      }
    }

    if (name2Parts.length === 3 && name1Parts.length === 2) {
      // Check if first and last names match
      if (name2Parts[0] === name1Parts[0] && name2Parts[2] === name1Parts[1]) {
        return 0.9;
      }
    }

    // Check for common variations
    const commonVariations = this.findCommonNameVariations(cleanName1, cleanName2);
    if (commonVariations > 0.8) {
      return commonVariations;
    }

    // Calculate Levenshtein similarity for remaining cases
    return this.calculateLevenshteinSimilarity(cleanName1, cleanName2);
  }

  /**
   * Calculate outlet similarity
   */
  private calculateOutletSimilarity(url1: string, url2: string): number {
    if (!url1 || !url2) {
      return 0;
    }

    try {
      const domain1 = new URL(url1).hostname.toLowerCase();
      const domain2 = new URL(url2).hostname.toLowerCase();

      // Exact match
      if (domain1 === domain2) {
        return 1.0;
      }

      // Check for subdomain relationships
      if (domain1.includes(domain2) || domain2.includes(domain1)) {
        return 0.9;
      }

      // Check for common news organization domains
      const newsOrgs = [
        ['nytimes.com', 'nyt.com'],
        ['washingtonpost.com', 'washpost.com'],
        ['wsj.com', 'wallstreetjournal.com'],
        ['cnn.com', 'cnnnews.com'],
        ['bbc.co.uk', 'bbc.com'],
        ['reuters.com', 'reuters.net']
      ];

      for (const org of newsOrgs) {
        if (org.includes(domain1) && org.includes(domain2)) {
          return 0.95;
        }
      }

      // Check for common parts
      const domain1Parts = domain1.split('.');
      const domain2Parts = domain2.split('.');

      const commonParts = domain1Parts.filter(part => domain2Parts.includes(part));
      const totalParts = new Set([...domain1Parts, ...domain2Parts]).size;

      if (commonParts.length > 0) {
        return commonParts.length / totalParts;
      }

      return 0;
    } catch {
      return 0;
    }
  }

  /**
   * Calculate title similarity
   */
  private calculateTitleSimilarity(title1?: string, title2?: string): number {
    if (!title1 || !title2) {
      return title1 === title2 ? 1.0 : 0;
    }

    const cleanTitle1 = title1.toLowerCase().trim();
    const cleanTitle2 = title2.toLowerCase().trim();

    // Exact match
    if (cleanTitle1 === cleanTitle2) {
      return 1.0;
    }

    // Check for title variations
    const variations = this.findTitleVariations(cleanTitle1, cleanTitle2);
    if (variations > 0.8) {
      return variations;
    }

    // Calculate similarity based on common words
    const words1 = cleanTitle1.split(/\s+/);
    const words2 = cleanTitle2.split(/\s+/);

    const commonWords = words1.filter(word => words2.includes(word));
    const totalWords = new Set([...words1, ...words2]).size;

    if (commonWords.length > 0) {
      return commonWords.length / totalWords;
    }

    return 0;
  }

  /**
   * Calculate bio similarity
   */
  private calculateBioSimilarity(bio1?: string, bio2?: string): number {
    if (!bio1 || !bio2) {
      return bio1 === bio2 ? 1.0 : 0;
    }

    const cleanBio1 = bio1.toLowerCase().trim();
    const cleanBio2 = bio2.toLowerCase().trim();

    // Exact match
    if (cleanBio1 === cleanBio2) {
      return 1.0;
    }

    // Calculate Jaccard similarity for word sets
    const words1 = new Set(cleanBio1.split(/\s+/).filter(w => w.length > 2));
    const words2 = new Set(cleanBio2.split(/\s+/).filter(w => w.length > 2));

    const intersection = new Set([...words1].filter(word => words2.has(word)));
    const union = new Set([...words1, ...words2]);

    if (union.size === 0) {
      return 0;
    }

    const jaccardSimilarity = intersection.size / union.size;

    // Check for key phrase similarity
    const keyPhrasesSimilarity = this.calculateKeyPhrasesSimilarity(cleanBio1, cleanBio2);

    // Combine both similarity measures
    return Math.max(jaccardSimilarity, keyPhrasesSimilarity);
  }

  /**
   * Calculate social media similarity
   */
  private calculateSocialSimilarity(
    social1?: any[],
    social2?: any[]
  ): number {
    if (!social1 || !social2 || social1.length === 0 || social2.length === 0) {
      return 0;
    }

    let commonProfiles = 0;
    const platforms1 = new Map(social1.map(p => [p.platform.toLowerCase(), p]));
    const platforms2 = new Map(social2.map(p => [p.platform.toLowerCase(), p]));

    for (const [platform, profile1] of platforms1) {
      const profile2 = platforms2.get(platform);
      if (profile2) {
        // Compare handles for the same platform
        if (profile1.handle.toLowerCase() === profile2.handle.toLowerCase()) {
          commonProfiles++;
        }
      }
    }

    const totalPlatforms = Math.max(social1.length, social2.length);
    if (totalPlatforms === 0) {
      return 0;
    }

    return commonProfiles / totalPlatforms;
  }

  /**
   * Find common name variations
   */
  private findCommonNameVariations(name1: string, name2: string): number {
    // Handle initials
    const initialPattern = /^([a-z])\s*\.?\s*([a-z])/i;
    const match1 = name1.match(initialPattern);
    const match2 = name2.match(initialPattern);

    if (match1 && match2) {
      const initials1 = match1.slice(1).join('');
      const initials2 = match2.slice(1).join('');
      if (initials1 === initials2) {
        return 0.8;
      }
    }

    // Handle hyphenated names
    const hyphenated1 = name1.replace(/-/g, ' ');
    const hyphenated2 = name2.replace(/-/g, ' ');
    if (hyphenated1 === hyphenated2 || hyphenated1 === name2 || hyphenated2 === name1) {
      return 0.9;
    }

    // Handle common nicknames
    const nicknameMap: Record<string, string[]> = {
      'william': ['will', 'bill', 'liam'],
      'james': ['jim', 'jimmy'],
      'robert': ['bob', 'bobby', 'rob'],
      'michael': ['mike', 'mikey'],
      'john': ['johnny'],
      'david': ['dave'],
      'richard': ['rick', 'dick'],
      'joseph': ['joe', 'joey'],
      'thomas': ['tom', 'tommy'],
      'charles': ['charlie', 'chuck'],
      'elizabeth': ['beth', 'liz', 'lizzy', 'betty'],
      'jennifer': ['jen', 'jenny'],
      'margaret': ['maggie', 'peggy'],
      'susan': ['sue', 'suzie'],
      'linda': ['lynn'],
      'patricia': ['pat', 'patty'],
      'jessica': ['jess', 'jessie']
    };

    const name1Parts = name1.split(' ');
    const name2Parts = name2.split(' ');

    for (let i = 0; i < Math.min(name1Parts.length, name2Parts.length); i++) {
      const part1 = name1Parts[i];
      const part2 = name2Parts[i];

      if (part1 === part2) {
        continue;
      }

      // Check nickname mapping
      for (const [formal, nicknames] of Object.entries(nicknameMap)) {
        if ((part1 === formal && nicknames.includes(part2)) ||
            (part2 === formal && nicknames.includes(part1))) {
          return 0.85;
        }
      }
    }

    return 0;
  }

  /**
   * Find title variations
   */
  private findTitleVariations(title1: string, title2: string): number {
    // Normalize titles by removing common connectors
    const normalizeTitle = (title: string) => {
      return title.replace(/\b(and|&|for|of|in|at)\b/g, '')
                 .replace(/\s+/g, ' ')
                 .trim();
    };

    const norm1 = normalizeTitle(title1);
    const norm2 = normalizeTitle(title2);

    if (norm1 === norm2) {
      return 0.9;
    }

    // Check for hierarchical variations
    const hierarchyMap: Record<string, string[]> = {
      'editor': ['editor', 'managing editor', 'executive editor', 'senior editor'],
      'reporter': ['reporter', 'journalist', 'correspondent', 'staff writer'],
      'producer': ['producer', 'senior producer', 'executive producer'],
      'director': ['director', 'head', 'manager'],
      'writer': ['writer', 'author', 'contributor', 'columnist']
    };

    for (const [base, variations] of Object.entries(hierarchyMap)) {
      if (variations.some(v => title1.includes(v)) && variations.some(v => title2.includes(v))) {
        return 0.85;
      }
    }

    return 0;
  }

  /**
   * Calculate key phrases similarity
   */
  private calculateKeyPhrasesSimilarity(text1: string, text2: string): number {
    // Extract key phrases (2-3 word combinations)
    const extractKeyPhrases = (text: string): string[] => {
      const words = text.split(/\s+/).filter(w => w.length > 2);
      const phrases: string[] = [];

      for (let i = 0; i < words.length - 1; i++) {
        phrases.push(words[i] + ' ' + words[i + 1]);
      }

      for (let i = 0; i < words.length - 2; i++) {
        phrases.push(words[i] + ' ' + words[i + 1] + ' ' + words[i + 2]);
      }

      return phrases;
    };

    const phrases1 = new Set(extractKeyPhrases(text1));
    const phrases2 = new Set(extractKeyPhrases(text2));

    const intersection = new Set([...phrases1].filter(phrase => phrases2.has(phrase)));
    const union = new Set([...phrases1, ...phrases2]);

    if (union.size === 0) {
      return 0;
    }

    return intersection.size / union.size;
  }

  /**
   * Calculate Levenshtein similarity
   */
  private calculateLevenshteinSimilarity(str1: string, str2: string): number {
    const matrix: number[][] = [];

    for (let i = 0; i <= str1.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= str2.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= str1.length; i++) {
      for (let j = 1; j <= str2.length; j++) {
        if (str1[i - 1] === str2[j - 1]) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1, // substitution
            matrix[i][j - 1] + 1,     // insertion
            matrix[i - 1][j] + 1      // deletion
          );
        }
      }
    }

    const distance = matrix[str1.length][str2.length];
    const maxLength = Math.max(str1.length, str2.length);

    return maxLength === 0 ? 1 : (maxLength - distance) / maxLength;
  }

  /**
   * Generate duplicate group ID
   */
  private generateDuplicateGroupId(contacts: ExtractedContact[]): string {
    const contactIds = contacts.map(c => c.id).sort().join(':');
    const hash = crypto.createHash('md5');
    hash.update(contactIds);
    return `dup_${hash.digest('hex').substring(0, 12)}`;
  }

  /**
   * Merge duplicate contacts into a single best contact
   */
  mergeDuplicateGroup(group: DuplicateGroup, allContacts: ExtractedContact[]): ExtractedContact {
    const groupContacts = allContacts.filter(c => group.contacts.includes(c.id));

    if (groupContacts.length === 0) {
      throw new ContactExtractionError(
        'No contacts found for duplicate group',
        'EMPTY_DUPLICATE_GROUP',
        'VALIDATION_ERROR'
      );
    }

    // Sort by confidence score to find the best contact
    groupContacts.sort((a, b) => b.confidenceScore - a.confidenceScore);
    const bestContact = groupContacts[0];

    // Merge information from other contacts to improve completeness
    const mergedContact = { ...bestContact };

    // Merge email if best contact doesn't have one
    if (!mergedContact.email) {
      const contactWithEmail = groupContacts.find(c => c.email);
      if (contactWithEmail) {
        mergedContact.email = contactWithEmail.email;
        mergedContact.emailType = contactWithEmail.emailType;
        mergedContact.emailValidation = contactWithEmail.emailValidation;
      }
    }

    // Merge title if best contact doesn't have one
    if (!mergedContact.title) {
      const contactWithTitle = groupContacts.find(c => c.title);
      if (contactWithTitle) {
        mergedContact.title = contactWithTitle.title;
      }
    }

    // Merge bio if best contact's bio is shorter
    const longestBio = groupContacts.reduce((longest, contact) => {
      return (contact.bio?.length || 0) > (longest?.bio?.length || 0) ? contact : longest;
    }, bestContact);

    if (longestBio.bio && longestBio.bio.length > (mergedContact.bio?.length || 0)) {
      mergedContact.bio = longestBio.bio;
    }

    // Merge social profiles
    const allSocialProfiles = groupContacts.flatMap(c => c.socialProfiles || []);
    const uniqueSocialProfiles = this.deduplicateSocialProfiles(allSocialProfiles);
    mergedContact.socialProfiles = uniqueSocialProfiles;

    // Update metadata
    mergedContact.metadata = {
      ...mergedContact.metadata,
      duplicateGroupId: group.id,
      mergedFrom: group.contacts,
      mergeReasoning: group.reasoning
    };

    return mergedContact;
  }

  /**
   * Deduplicate social profiles
   */
  private deduplicateSocialProfiles(profiles: any[]): any[] {
    const seen = new Map<string, any>();

    for (const profile of profiles) {
      const key = `${profile.platform.toLowerCase()}:${profile.handle.toLowerCase()}`;
      if (!seen.has(key) || (profile.verified && !seen.get(key).verified)) {
        seen.set(key, profile);
      }
    }

    return Array.from(seen.values());
  }

  /**
   * Get duplicate detection statistics
   */
  getDuplicateStatistics(): {
    totalGroupsProcessed: number;
    averageGroupSize: number;
    commonDuplicateTypes: Record<DuplicateType, number>;
    averageSimilarityScore: number;
    processingTimeMs: number;
  } {
    return {
      totalGroupsProcessed: 0,
      averageGroupSize: 0,
      commonDuplicateTypes: {
        [DuplicateType.EMAIL]: 0,
        [DuplicateType.NAME_OUTLET]: 0,
        [DuplicateType.NAME_TITLE]: 0,
        [DuplicateType.OUTLET_TITLE]: 0,
        [DuplicateType.SIMILAR_BIO]: 0,
        [DuplicateType.SOCIAL_MEDIA]: 0
      },
      averageSimilarityScore: 0,
      processingTimeMs: 0
    };
  }
}