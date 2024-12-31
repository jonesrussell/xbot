import { Profile, BotAnalysis } from '../types/profile.js';

export class ProfileAnalyzer {
  private readonly PATTERNS = {
    randomAlphanumeric: /^[a-z0-9]{8,}$/,
    manyNumbers: /[0-9]{4,}/,
    botKeywords: /bot|spam|[0-9]+[a-z]+[0-9]+/,
    randomSuffix: /[a-z]+[0-9]{4,}$/,
    numericSuffix: /[0-9]{4,}$/,
    randomLetters: /[A-Z]{2,}[0-9]+/,
    community: /^i\/communities\//
  };

  private readonly SCORES = {
    noFollowers: 0.3,
    randomAlphanumeric: 0.3,
    manyNumbers: 0.2,
    botKeywords: 0.3,
    randomSuffix: 0.2,
    numericSuffix: 0.2,
    randomLetters: 0.2
  };

  public async analyzeBotProbability(profile: Profile): Promise<BotAnalysis> {
    // Skip community posts
    if (this.PATTERNS.community.test(profile.username)) {
      console.debug('[XBot:Analysis] Skipping community post:', profile.username);
      return { probability: 0, reasons: [] };
    }

    const probability = this.calculateBotProbability(profile);
    const reasons: string[] = [];

    // Add reasons based on matched patterns
    if (profile.followersCount === 0 && profile.followingCount === 0) {
      reasons.push('No followers or following');
    }

    const username = profile.username.toLowerCase();
    if (this.PATTERNS.randomAlphanumeric.test(username)) {
      reasons.push('Random alphanumeric username');
    }
    if (this.PATTERNS.manyNumbers.test(username)) {
      reasons.push('Username contains many numbers');
    }
    if (this.PATTERNS.botKeywords.test(username)) {
      reasons.push('Username contains bot-like keywords');
    }
    if (this.PATTERNS.randomSuffix.test(username)) {
      reasons.push('Username has random number suffix');
    }
    if (this.PATTERNS.numericSuffix.test(username)) {
      reasons.push('Username ends with many numbers');
    }
    if (this.PATTERNS.randomLetters.test(username)) {
      reasons.push('Username has random letters and numbers');
    }

    console.debug('[XBot:Analysis] Analysis result:', {
      username: profile.username,
      probability,
      reasons
    });

    return { probability, reasons };
  }

  public calculateBotProbability(profile: Profile): number {
    let score = 0;

    // Check followers/following
    if (profile.followersCount === 0 && profile.followingCount === 0) {
      score += this.SCORES.noFollowers;
    }

    // Check username patterns
    const username = profile.username.toLowerCase();
    
    if (this.PATTERNS.randomAlphanumeric.test(username)) {
      score += this.SCORES.randomAlphanumeric;
    }
    if (this.PATTERNS.manyNumbers.test(username)) {
      score += this.SCORES.manyNumbers;
    }
    if (this.PATTERNS.botKeywords.test(username)) {
      score += this.SCORES.botKeywords;
    }
    if (this.PATTERNS.randomSuffix.test(username)) {
      score += this.SCORES.randomSuffix;
    }
    if (this.PATTERNS.numericSuffix.test(username)) {
      score += this.SCORES.numericSuffix;
    }
    if (this.PATTERNS.randomLetters.test(username)) {
      score += this.SCORES.randomLetters;
    }

    // Cap the maximum score at 0.9
    return Math.min(score, 0.9);
  }
}
