// Campus Ambassador localStorage service

export interface CampusAmbassador {
  id: string;
  name: string;
  email: string;
  whatsapp: string;
  college: string;
  city: string;
  referralCode: string;
  referralLink: string;
  upiId?: string;
  totalRewards: number;
  createdAt: string;
}

export interface AmbassadorReward {
  id: string;
  ambassadorId: string;
  groupId: string;
  groupName: string;
  memberCount: number;
  rewardAmount: number;
  status: 'Pending' | 'Approved' | 'Paid';
  orderValue?: number;
  createdAt: string;
  paidAt?: string;
}

const STORAGE_KEYS = {
  AMBASSADORS: 'campus_ambassadors',
  REWARDS: 'ambassador_rewards',
  REFERRAL_TRACKING: 'referral_tracking',
};

export class AmbassadorStorageService {
  // Generate unique referral code
  static generateReferralCode(): string {
    const random = Math.floor(10000 + Math.random() * 90000);
    return `SD-CA-${random}`;
  }

  // Create ambassador
  static createAmbassador(data: Omit<CampusAmbassador, 'id' | 'referralCode' | 'referralLink' | 'totalRewards' | 'createdAt'>): CampusAmbassador {
    const ambassadors = this.getAllAmbassadors();
    const referralCode = this.generateReferralCode();
    const ambassador: CampusAmbassador = {
      ...data,
      id: `amb-${Date.now()}`,
      referralCode,
      referralLink: `${window.location.origin}/ref/${referralCode}`,
      totalRewards: 0,
      createdAt: new Date().toISOString(),
    };
    
    ambassadors.push(ambassador);
    localStorage.setItem(STORAGE_KEYS.AMBASSADORS, JSON.stringify(ambassadors));
    return ambassador;
  }

  // Get all ambassadors
  static getAllAmbassadors(): CampusAmbassador[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.AMBASSADORS);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Error loading ambassadors:', error);
      return [];
    }
  }

  // Get ambassador by ID
  static getAmbassadorById(id: string): CampusAmbassador | null {
    const ambassadors = this.getAllAmbassadors();
    return ambassadors.find(a => a.id === id) || null;
  }

  // Get ambassador by referral code
  static getAmbassadorByReferralCode(code: string): CampusAmbassador | null {
    const ambassadors = this.getAllAmbassadors();
    return ambassadors.find(a => a.referralCode === code) || null;
  }

  // Get ambassador by email
  static getAmbassadorByEmail(email: string): CampusAmbassador | null {
    const ambassadors = this.getAllAmbassadors();
    return ambassadors.find(a => a.email === email) || null;
  }

  // Update ambassador
  static updateAmbassador(id: string, updates: Partial<CampusAmbassador>): boolean {
    const ambassadors = this.getAllAmbassadors();
    const index = ambassadors.findIndex(a => a.id === id);
    
    if (index === -1) return false;
    
    ambassadors[index] = { ...ambassadors[index], ...updates };
    localStorage.setItem(STORAGE_KEYS.AMBASSADORS, JSON.stringify(ambassadors));
    return true;
  }

  // Store referral tracking (when someone clicks referral link)
  static setActiveReferral(referralCode: string): void {
    localStorage.setItem(STORAGE_KEYS.REFERRAL_TRACKING, referralCode);
  }

  // Get active referral
  static getActiveReferral(): string | null {
    return localStorage.getItem(STORAGE_KEYS.REFERRAL_TRACKING);
  }

  // Clear active referral
  static clearActiveReferral(): void {
    localStorage.removeItem(STORAGE_KEYS.REFERRAL_TRACKING);
  }

  // Calculate reward based on member count
  static calculateReward(memberCount: number): number {
    // 12% of total join amount where each member pays ₹200
    // Reward per member = ₹200 * 12% = ₹24
    if (memberCount <= 0) return 0;
    return memberCount * 24;
  }

  // Create reward when group completes order
  static createReward(groupId: string, groupName: string, ambassadorId: string, memberCount: number, orderValue?: number): AmbassadorReward {
    const rewards = this.getAllRewards();
    const rewardAmount = this.calculateReward(memberCount);
    
    const reward: AmbassadorReward = {
      id: `reward-${Date.now()}`,
      ambassadorId,
      groupId,
      groupName,
      memberCount,
      rewardAmount,
      status: 'Pending',
      orderValue,
      createdAt: new Date().toISOString(),
    };
    
    rewards.push(reward);
    localStorage.setItem(STORAGE_KEYS.REWARDS, JSON.stringify(rewards));
    
    // Update ambassador total rewards
    const ambassador = this.getAmbassadorById(ambassadorId);
    if (ambassador) {
      this.updateAmbassador(ambassadorId, {
        totalRewards: ambassador.totalRewards + rewardAmount,
      });
    }
    
    return reward;
  }

  // Get all rewards
  static getAllRewards(): AmbassadorReward[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.REWARDS);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Error loading rewards:', error);
      return [];
    }
  }

  // Get rewards for specific ambassador
  static getRewardsByAmbassador(ambassadorId: string): AmbassadorReward[] {
    const rewards = this.getAllRewards();
    return rewards.filter(r => r.ambassadorId === ambassadorId);
  }

  // Get group IDs that were created via the ambassador's referral (client-side tracking)
  static getReferredGroupIdsForAmbassador(ambassadorId: string): string[] {
    const ids: string[] = [];
    try {
      // Iterate over localStorage keys to find pattern group-<id>-ambassador
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i) || '';
        if (key.startsWith('group-') && key.endsWith('-ambassador')) {
          const groupId = key.slice('group-'.length, -'-ambassador'.length);
          const val = localStorage.getItem(key);
          if (val === ambassadorId) {
            ids.push(groupId);
          }
        }
      }
    } catch (error) {
      console.error('Error reading referred groups:', error);
    }
    return ids;
  }

  // Update reward status
  static updateRewardStatus(rewardId: string, status: AmbassadorReward['status']): boolean {
    const rewards = this.getAllRewards();
    const index = rewards.findIndex(r => r.id === rewardId);
    
    if (index === -1) return false;
    
    rewards[index].status = status;
    if (status === 'Paid') {
      rewards[index].paidAt = new Date().toISOString();
    }
    
    localStorage.setItem(STORAGE_KEYS.REWARDS, JSON.stringify(rewards));
    return true;
  }

  // Get dashboard stats for ambassador
  static getAmbassadorStats(ambassadorId: string) {
    const rewards = this.getRewardsByAmbassador(ambassadorId);
    const referredGroupIds = this.getReferredGroupIdsForAmbassador(ambassadorId);
    
    return {
      totalGroups: rewards.length,
      totalMembers: rewards.reduce((sum, r) => sum + r.memberCount, 0),
      totalRewards: rewards.reduce((sum, r) => sum + r.rewardAmount, 0),
      pendingRewards: rewards.filter(r => r.status === 'Pending').reduce((sum, r) => sum + r.rewardAmount, 0),
      paidRewards: rewards.filter(r => r.status === 'Paid').reduce((sum, r) => sum + r.rewardAmount, 0),
      completedOrders: rewards.filter(r => r.status !== 'Pending').length,
      referredGroups: referredGroupIds.length,
    };
  }
}
