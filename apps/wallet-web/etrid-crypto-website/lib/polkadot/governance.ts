/**
 * Governance API for ËTRID Primearc Core Chain
 *
 * Provides typed interfaces for interacting with governance pallets
 * including Consensus Day proposals, voting, and director elections.
 */

import { ApiPromise } from '@polkadot/api';
import { primearcCoreChainApi } from '../api/primearc-core-chain';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface Proposal {
  id: number;
  proposer: string;
  title: string;
  description: string;
  category: ProposalCategory;
  status: ProposalStatus;
  votesFor: string;
  votesAgainst: string;
  votesAbstain: string;
  approved: boolean;
  executed: boolean;
  createdAt: number;
}

export type ProposalCategory =
  | 'InflationRate'
  | 'ParameterChange'
  | 'BudgetAllocation'
  | 'ProtocolUpgrade'
  | 'DirectorElection'
  | 'EmergencyAction';

export type ProposalStatus =
  | 'Pending'
  | 'Active'
  | 'Approved'
  | 'Rejected'
  | 'Executed'
  | 'Cancelled';

export interface ConsensusDayPhase {
  phase: 'Inactive' | 'Registration' | 'Voting' | 'Minting' | 'Distribution';
  phaseCode: number;
  phaseStartBlock: number;
  eventStartBlock: number;
  year: number;
  blocksRemaining: number;
  isActive: boolean;
}

export interface VotingPower {
  stakedAmount: string;
  votingPower: string;
  participationHistory: number;
  canVote: boolean;
}

export interface VoteRecord {
  voter: string;
  proposalId: number;
  voteType: 'Yes' | 'No' | 'Abstain';
  votingPower: string;
}

export interface DirectorCandidate {
  account: string;
  stake: string;
  votes: string;
}

export interface GovernanceStats {
  totalProposals: number;
  activeProposals: number;
  approvedProposals: number;
  rejectedProposals: number;
  totalVotesCast: string;
  uniqueVoters: number;
  circulatingSupply: string;
  quorumThresholdPercent: number;
}

export interface DistributionInfo {
  totalMinted: string;
  foundationShare: string;
  directorsShare: string;
  validatorsShare: string;
  votersShare: string;
  feesDistributed: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// GOVERNANCE API CLASS
// ═══════════════════════════════════════════════════════════════════════════════

export class GovernanceAPI {
  private api: ApiPromise | null = null;

  /**
   * Ensure connection to Primearc Core Chain
   */
  private async ensureConnection(): Promise<ApiPromise> {
    if (!this.api || !this.api.isConnected) {
      this.api = await primearcCoreChainApi.connectToPrimearcCoreChain();
    }
    return this.api;
  }

  /**
   * Make a governance RPC call
   */
  private async rpcCall<T>(method: string, params: any[] = []): Promise<T> {
    const api = await this.ensureConnection();
    const result = await (api.rpc as any).governance[method](...params);
    return result.toJSON() as T;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PROPOSAL QUERIES
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Get all governance proposals
   */
  async getProposals(): Promise<Proposal[]> {
    try {
      const result = await this.rpcCall<any[]>('getProposals');
      return result.map(this.parseProposal);
    } catch (error) {
      console.error('Failed to fetch proposals:', error);
      return [];
    }
  }

  /**
   * Get a specific proposal by ID
   */
  async getProposal(id: number): Promise<Proposal | null> {
    try {
      const result = await this.rpcCall<any>('getProposal', [id]);
      return result ? this.parseProposal(result) : null;
    } catch (error) {
      console.error(`Failed to fetch proposal ${id}:`, error);
      return null;
    }
  }

  private parseProposal(data: any): Proposal {
    return {
      id: data.id,
      proposer: data.proposer,
      title: data.title,
      description: data.description || '',
      category: this.parseCategory(data.category),
      status: this.parseStatus(data.status),
      votesFor: data.votes_for || '0',
      votesAgainst: data.votes_against || '0',
      votesAbstain: data.votes_abstain || '0',
      approved: data.approved,
      executed: data.executed,
      createdAt: data.created_at || 0,
    };
  }

  private parseCategory(category: string): ProposalCategory {
    const categories: Record<string, ProposalCategory> = {
      InflationRate: 'InflationRate',
      ParameterChange: 'ParameterChange',
      BudgetAllocation: 'BudgetAllocation',
      ProtocolUpgrade: 'ProtocolUpgrade',
      DirectorElection: 'DirectorElection',
      EmergencyAction: 'EmergencyAction',
    };
    return categories[category] || 'ParameterChange';
  }

  private parseStatus(status: string): ProposalStatus {
    const statuses: Record<string, ProposalStatus> = {
      Pending: 'Pending',
      Active: 'Active',
      Approved: 'Approved',
      Rejected: 'Rejected',
      Executed: 'Executed',
      Cancelled: 'Cancelled',
    };
    return statuses[status] || 'Pending';
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // CONSENSUS DAY QUERIES
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Get current Consensus Day phase
   */
  async getPhase(): Promise<ConsensusDayPhase> {
    try {
      const result = await this.rpcCall<any>('getPhase');
      return {
        phase: result.phase || 'Inactive',
        phaseCode: result.phase_code || 0,
        phaseStartBlock: result.phase_start_block || 0,
        eventStartBlock: result.event_start_block || 0,
        year: result.year || 0,
        blocksRemaining: result.blocks_remaining || 0,
        isActive: result.is_active || false,
      };
    } catch (error) {
      console.error('Failed to fetch phase:', error);
      return {
        phase: 'Inactive',
        phaseCode: 0,
        phaseStartBlock: 0,
        eventStartBlock: 0,
        year: 0,
        blocksRemaining: 0,
        isActive: false,
      };
    }
  }

  /**
   * Check if Consensus Day is active
   */
  async isActive(): Promise<boolean> {
    try {
      const result = await this.rpcCall<boolean>('isActive');
      return result;
    } catch (error) {
      console.error('Failed to check if active:', error);
      return false;
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // VOTING QUERIES
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Get voting power for an account
   */
  async getVotingPower(account: string): Promise<VotingPower> {
    try {
      const result = await this.rpcCall<any>('getVotingPower', [account]);
      return {
        stakedAmount: result.staked_amount || '0',
        votingPower: result.voting_power || '0',
        participationHistory: result.participation_history || 0,
        canVote: result.can_vote || false,
      };
    } catch (error) {
      console.error(`Failed to get voting power for ${account}:`, error);
      return {
        stakedAmount: '0',
        votingPower: '0',
        participationHistory: 0,
        canVote: false,
      };
    }
  }

  /**
   * Get vote counts for a proposal
   */
  async getVoteCounts(proposalId: number): Promise<{ for: string; against: string; abstain: string; total: string }> {
    try {
      const result = await this.rpcCall<any>('getVoteCounts', [proposalId]);
      return {
        for: result.votes_for || '0',
        against: result.votes_against || '0',
        abstain: result.votes_abstain || '0',
        total: result.total_voting_power || '0',
      };
    } catch (error) {
      console.error(`Failed to get vote counts for proposal ${proposalId}:`, error);
      return { for: '0', against: '0', abstain: '0', total: '0' };
    }
  }

  /**
   * Get all votes for a proposal
   */
  async getVotes(proposalId: number): Promise<VoteRecord[]> {
    try {
      const result = await this.rpcCall<any[]>('getVotes', [proposalId]);
      return result.map((v) => ({
        voter: v.voter,
        proposalId: v.proposal_id,
        voteType: v.vote_type as 'Yes' | 'No' | 'Abstain',
        votingPower: v.voting_power || '0',
      }));
    } catch (error) {
      console.error(`Failed to get votes for proposal ${proposalId}:`, error);
      return [];
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // DIRECTOR QUERIES
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Get elected directors
   */
  async getDirectors(): Promise<string[]> {
    try {
      const result = await this.rpcCall<string[]>('getDirectors');
      return result;
    } catch (error) {
      console.error('Failed to get directors:', error);
      return [];
    }
  }

  /**
   * Get director candidates
   */
  async getCandidates(): Promise<DirectorCandidate[]> {
    try {
      const result = await this.rpcCall<any[]>('getCandidates');
      return result.map((c) => ({
        account: c.account,
        stake: c.stake || '0',
        votes: c.votes || '0',
      }));
    } catch (error) {
      console.error('Failed to get candidates:', error);
      return [];
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // STATISTICS QUERIES
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Get governance statistics
   */
  async getStats(): Promise<GovernanceStats> {
    try {
      const result = await this.rpcCall<any>('getStats');
      return {
        totalProposals: result.total_proposals || 0,
        activeProposals: result.active_proposals || 0,
        approvedProposals: result.approved_proposals || 0,
        rejectedProposals: result.rejected_proposals || 0,
        totalVotesCast: result.total_votes_cast || '0',
        uniqueVoters: result.unique_voters || 0,
        circulatingSupply: result.circulating_supply || '0',
        quorumThresholdPercent: result.quorum_threshold_percent || 33,
      };
    } catch (error) {
      console.error('Failed to get stats:', error);
      return {
        totalProposals: 0,
        activeProposals: 0,
        approvedProposals: 0,
        rejectedProposals: 0,
        totalVotesCast: '0',
        uniqueVoters: 0,
        circulatingSupply: '0',
        quorumThresholdPercent: 33,
      };
    }
  }

  /**
   * Get distribution info
   */
  async getDistribution(): Promise<DistributionInfo> {
    try {
      const result = await this.rpcCall<any>('getDistribution');
      return {
        totalMinted: result.total_minted || '0',
        foundationShare: result.foundation_share || '0',
        directorsShare: result.directors_share || '0',
        validatorsShare: result.validators_share || '0',
        votersShare: result.voters_share || '0',
        feesDistributed: result.fees_distributed || '0',
      };
    } catch (error) {
      console.error('Failed to get distribution:', error);
      return {
        totalMinted: '0',
        foundationShare: '0',
        directorsShare: '0',
        validatorsShare: '0',
        votersShare: '0',
        feesDistributed: '0',
      };
    }
  }

  /**
   * Get pending participation reward for an account
   */
  async getReward(account: string): Promise<string> {
    try {
      const result = await this.rpcCall<string>('getReward', [account]);
      return result || '0';
    } catch (error) {
      console.error(`Failed to get reward for ${account}:`, error);
      return '0';
    }
  }

  /**
   * Get current inflation rate (basis points)
   */
  async getInflationRate(): Promise<number> {
    try {
      const result = await this.rpcCall<number>('getInflationRate');
      return result || 0;
    } catch (error) {
      console.error('Failed to get inflation rate:', error);
      return 0;
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // EXTRINSICS (Write Operations)
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Submit a vote on a proposal
   */
  async submitVote(
    proposalId: number,
    voteType: 'Yes' | 'No' | 'Abstain',
    signer: any
  ): Promise<string> {
    const api = await this.ensureConnection();

    const voteTypeEncoded = voteType === 'Yes' ? 0 : voteType === 'No' ? 1 : 2;
    const tx = api.tx.consensusDay.vote(proposalId, voteTypeEncoded);

    return new Promise((resolve, reject) => {
      tx.signAndSend(signer, ({ status, dispatchError }) => {
        if (dispatchError) {
          if (dispatchError.isModule) {
            const decoded = api.registry.findMetaError(dispatchError.asModule);
            reject(new Error(`${decoded.section}.${decoded.name}: ${decoded.docs}`));
          } else {
            reject(new Error(dispatchError.toString()));
          }
        }
        if (status.isFinalized) {
          resolve(status.asFinalized.toString());
        }
      }).catch(reject);
    });
  }

  /**
   * Submit a new proposal
   */
  async submitProposal(
    title: string,
    category: ProposalCategory,
    budgetRequest: string,
    budgetCategory: string | null,
    signer: any
  ): Promise<string> {
    const api = await this.ensureConnection();

    const categoryEncoded = {
      InflationRate: 0,
      ParameterChange: 1,
      BudgetAllocation: 2,
      ProtocolUpgrade: 3,
      DirectorElection: 4,
      EmergencyAction: 5,
    }[category];

    const tx = api.tx.consensusDay.submitProposal(
      title,
      categoryEncoded,
      budgetRequest,
      budgetCategory
    );

    return new Promise((resolve, reject) => {
      tx.signAndSend(signer, ({ status, dispatchError }) => {
        if (dispatchError) {
          if (dispatchError.isModule) {
            const decoded = api.registry.findMetaError(dispatchError.asModule);
            reject(new Error(`${decoded.section}.${decoded.name}: ${decoded.docs}`));
          } else {
            reject(new Error(dispatchError.toString()));
          }
        }
        if (status.isFinalized) {
          resolve(status.asFinalized.toString());
        }
      }).catch(reject);
    });
  }

  /**
   * Lock stake for voting power
   */
  async lockStakeForVoting(amount: string, signer: any): Promise<string> {
    const api = await this.ensureConnection();

    const tx = api.tx.consensusDay.lockStakeForVoting(amount);

    return new Promise((resolve, reject) => {
      tx.signAndSend(signer, ({ status, dispatchError }) => {
        if (dispatchError) {
          if (dispatchError.isModule) {
            const decoded = api.registry.findMetaError(dispatchError.asModule);
            reject(new Error(`${decoded.section}.${decoded.name}: ${decoded.docs}`));
          } else {
            reject(new Error(dispatchError.toString()));
          }
        }
        if (status.isFinalized) {
          resolve(status.asFinalized.toString());
        }
      }).catch(reject);
    });
  }

  /**
   * Claim participation reward
   */
  async claimReward(signer: any): Promise<string> {
    const api = await this.ensureConnection();

    const tx = api.tx.consensusDay.claimParticipationReward();

    return new Promise((resolve, reject) => {
      tx.signAndSend(signer, ({ status, dispatchError }) => {
        if (dispatchError) {
          if (dispatchError.isModule) {
            const decoded = api.registry.findMetaError(dispatchError.asModule);
            reject(new Error(`${decoded.section}.${decoded.name}: ${decoded.docs}`));
          } else {
            reject(new Error(dispatchError.toString()));
          }
        }
        if (status.isFinalized) {
          resolve(status.asFinalized.toString());
        }
      }).catch(reject);
    });
  }
}

// Singleton instance
export const governanceApi = new GovernanceAPI();

// ═══════════════════════════════════════════════════════════════════════════════
// HELPER EXPORTS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Get voting power for an account (convenience function)
 */
export async function getVotingPower(account: string): Promise<VotingPower> {
  return governanceApi.getVotingPower(account);
}

/**
 * Submit a vote on a proposal (convenience function)
 */
export async function submitVote(
  proposalId: number,
  voteType: 'Yes' | 'No' | 'Abstain',
  signer: any
): Promise<string> {
  return governanceApi.submitVote(proposalId, voteType, signer);
}
