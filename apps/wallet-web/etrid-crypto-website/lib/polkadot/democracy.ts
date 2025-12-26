import type { ApiPromise } from '@polkadot/api';
import { web3FromAddress } from '@polkadot/extension-dapp';
import { getApi } from './api';

export interface DemocracyProposal {
  index: number;
  hash: string;
  proposer: string;
  deposit: string;
  at: number;
}

export interface Referendum {
  index: number;
  hash: string;
  threshold: string;
  delay: number;
  end: number;
  status: 'ongoing' | 'finished';
  tally: {
    ayes: string;
    nays: string;
    turnout: string;
  };
}

export interface Vote {
  aye: boolean;
  conviction: number; // 0-6 (None, Locked1x, Locked2x, ..., Locked6x)
  balance: string;
}

export type VoteConviction = 'None' | 'Locked1x' | 'Locked2x' | 'Locked3x' | 'Locked4x' | 'Locked5x' | 'Locked6x';

/**
 * Get all active democracy proposals
 */
export async function getProposals(): Promise<DemocracyProposal[]> {
  const api = getApi();

  try {
    const proposals = await api.query.democracy.publicProps();

    return proposals.map((proposal) => {
      const [index, hash, proposer] = proposal;

      return {
        index: index.toNumber(),
        hash: hash.toHex(),
        proposer: proposer.toString(),
        deposit: '0', // Deposit info available in depositOf query
        at: 0, // Block number when proposed
      };
    });
  } catch (error) {
    console.error('[ËTRID Democracy] Error fetching proposals:', error);
    return [];
  }
}

/**
 * Get detailed proposal information including deposit
 */
export async function getProposalDetails(proposalIndex: number): Promise<{
  index: number;
  deposit: string;
  depositors: string[];
} | null> {
  const api = getApi();

  try {
    const depositInfo = await api.query.democracy.depositOf(proposalIndex);

    if (depositInfo.isNone) {
      return null;
    }

    const [depositors, deposit] = depositInfo.unwrap();

    return {
      index: proposalIndex,
      deposit: deposit.toString(),
      depositors: depositors.map((d) => d.toString()),
    };
  } catch (error) {
    console.error('[ËTRID Democracy] Error fetching proposal details:', error);
    return null;
  }
}

/**
 * Get all active and recent referendums
 */
export async function getReferendums(): Promise<Referendum[]> {
  const api = getApi();

  try {
    const [refCount, currentBlock] = await Promise.all([
      api.query.democracy.referendumCount(),
      api.rpc.chain.getHeader(),
    ]);

    const currentBlockNum = currentBlock.number.toNumber();
    const referendums: Referendum[] = [];

    // Query last 50 referendums or all if less
    const count = refCount.toNumber();
    const startIndex = Math.max(0, count - 50);

    for (let i = startIndex; i < count; i++) {
      const refInfo = await api.query.democracy.referendumInfoOf(i);

      if (refInfo.isNone) continue;

      const info = refInfo.unwrap();

      if (info.isOngoing) {
        const ongoing = info.asOngoing;

        referendums.push({
          index: i,
          hash: ongoing.proposalHash.toHex(),
          threshold: ongoing.threshold.type,
          delay: ongoing.delay.toNumber(),
          end: ongoing.end.toNumber(),
          status: currentBlockNum < ongoing.end.toNumber() ? 'ongoing' : 'finished',
          tally: {
            ayes: ongoing.tally.ayes.toString(),
            nays: ongoing.tally.nays.toString(),
            turnout: ongoing.tally.turnout.toString(),
          },
        });
      } else if (info.isFinished) {
        const finished = info.asFinished;

        referendums.push({
          index: i,
          hash: '0x',
          threshold: 'SimpleMajority',
          delay: 0,
          end: finished.end.toNumber(),
          status: 'finished',
          tally: {
            ayes: '0',
            nays: '0',
            turnout: '0',
          },
        });
      }
    }

    return referendums.reverse(); // Most recent first
  } catch (error) {
    console.error('[ËTRID Democracy] Error fetching referendums:', error);
    return [];
  }
}

/**
 * Get referendum details by index
 */
export async function getReferendumDetails(refIndex: number): Promise<Referendum | null> {
  const api = getApi();

  try {
    const [refInfo, currentBlock] = await Promise.all([
      api.query.democracy.referendumInfoOf(refIndex),
      api.rpc.chain.getHeader(),
    ]);

    if (refInfo.isNone) {
      return null;
    }

    const info = refInfo.unwrap();
    const currentBlockNum = currentBlock.number.toNumber();

    if (info.isOngoing) {
      const ongoing = info.asOngoing;

      return {
        index: refIndex,
        hash: ongoing.proposalHash.toHex(),
        threshold: ongoing.threshold.type,
        delay: ongoing.delay.toNumber(),
        end: ongoing.end.toNumber(),
        status: currentBlockNum < ongoing.end.toNumber() ? 'ongoing' : 'finished',
        tally: {
          ayes: ongoing.tally.ayes.toString(),
          nays: ongoing.tally.nays.toString(),
          turnout: ongoing.tally.turnout.toString(),
        },
      };
    }

    return null;
  } catch (error) {
    console.error('[ËTRID Democracy] Error fetching referendum details:', error);
    return null;
  }
}

/**
 * Submit a new proposal to democracy pallet
 * @param proposalHash - Hash of the preimage/proposal
 * @param depositAmount - Amount to deposit (usually minimum deposit)
 * @param fromAddress - Address submitting the proposal
 */
export async function submitProposal(
  proposalHash: string,
  depositAmount: string | bigint,
  fromAddress: string
): Promise<{
  txHash: string;
  blockHash?: string;
}> {
  const api = getApi();
  const injector = await web3FromAddress(fromAddress);

  return new Promise(async (resolve, reject) => {
    try {
      const unsub = await api.tx.democracy
        .propose(proposalHash, depositAmount)
        .signAndSend(
          fromAddress,
          { signer: injector.signer },
          ({ status, txHash, dispatchError }) => {
            console.log(`[ËTRID Democracy] Proposal submission status: ${status.type}`);

            if (status.isFinalized) {
              if (dispatchError) {
                let errorMsg = 'Proposal submission failed';

                if (dispatchError.isModule) {
                  const decoded = api.registry.findMetaError(dispatchError.asModule);
                  errorMsg = `${decoded.section}.${decoded.name}: ${decoded.docs.join(' ')}`;
                }

                unsub();
                reject(new Error(errorMsg));
              } else {
                unsub();
                resolve({
                  txHash: txHash.toHex(),
                  blockHash: status.asFinalized.toHex(),
                });
              }
            }

            if (status.isError) {
              unsub();
              reject(new Error('Transaction failed'));
            }
          }
        );
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Vote on an active referendum
 * @param refIndex - Referendum index
 * @param aye - True for yes, false for no
 * @param conviction - Conviction multiplier (0-6)
 * @param balance - Amount to vote with
 * @param fromAddress - Voter address
 */
export async function vote(
  refIndex: number,
  aye: boolean,
  conviction: VoteConviction,
  balance: string | bigint,
  fromAddress: string
): Promise<{
  txHash: string;
  blockHash?: string;
}> {
  const api = getApi();
  const injector = await web3FromAddress(fromAddress);

  return new Promise(async (resolve, reject) => {
    try {
      const vote = {
        Standard: {
          vote: {
            aye,
            conviction,
          },
          balance,
        },
      };

      const unsub = await api.tx.democracy
        .vote(refIndex, vote)
        .signAndSend(
          fromAddress,
          { signer: injector.signer },
          ({ status, txHash, dispatchError }) => {
            console.log(`[ËTRID Democracy] Vote status: ${status.type}`);

            if (status.isFinalized) {
              if (dispatchError) {
                let errorMsg = 'Vote failed';

                if (dispatchError.isModule) {
                  const decoded = api.registry.findMetaError(dispatchError.asModule);
                  errorMsg = `${decoded.section}.${decoded.name}: ${decoded.docs.join(' ')}`;
                }

                unsub();
                reject(new Error(errorMsg));
              } else {
                unsub();
                resolve({
                  txHash: txHash.toHex(),
                  blockHash: status.asFinalized.toHex(),
                });
              }
            }

            if (status.isError) {
              unsub();
              reject(new Error('Transaction failed'));
            }
          }
        );
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Remove a vote from a referendum
 */
export async function removeVote(
  refIndex: number,
  fromAddress: string
): Promise<{
  txHash: string;
  blockHash?: string;
}> {
  const api = getApi();
  const injector = await web3FromAddress(fromAddress);

  return new Promise(async (resolve, reject) => {
    try {
      const unsub = await api.tx.democracy
        .removeVote(refIndex)
        .signAndSend(
          fromAddress,
          { signer: injector.signer },
          ({ status, txHash, dispatchError }) => {
            if (status.isFinalized) {
              if (dispatchError) {
                let errorMsg = 'Remove vote failed';

                if (dispatchError.isModule) {
                  const decoded = api.registry.findMetaError(dispatchError.asModule);
                  errorMsg = `${decoded.section}.${decoded.name}: ${decoded.docs.join(' ')}`;
                }

                unsub();
                reject(new Error(errorMsg));
              } else {
                unsub();
                resolve({
                  txHash: txHash.toHex(),
                  blockHash: status.asFinalized.toHex(),
                });
              }
            }

            if (status.isError) {
              unsub();
              reject(new Error('Transaction failed'));
            }
          }
        );
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Get voting info for an address on a specific referendum
 */
export async function getVotingInfo(
  refIndex: number,
  address: string
): Promise<Vote | null> {
  const api = getApi();

  try {
    const votingInfo = await api.query.democracy.votingOf(address);

    if (votingInfo.isDirect) {
      const direct = votingInfo.asDirect;
      const votes = direct.votes;

      const vote = votes.find(([index]) => index.toNumber() === refIndex);

      if (vote) {
        const [, voteData] = vote;

        if (voteData.isStandard) {
          const standard = voteData.asStandard;

          return {
            aye: standard.vote.isAye,
            conviction: standard.vote.conviction.toNumber(),
            balance: standard.balance.toString(),
          };
        }
      }
    }

    return null;
  } catch (error) {
    console.error('[ËTRID Democracy] Error fetching voting info:', error);
    return null;
  }
}

/**
 * Get minimum deposit required for proposals
 */
export async function getMinimumDeposit(): Promise<string> {
  const api = getApi();

  try {
    const deposit = api.consts.democracy.minimumDeposit;
    return deposit.toString();
  } catch (error) {
    console.error('[ËTRID Democracy] Error fetching minimum deposit:', error);
    return '0';
  }
}

/**
 * Subscribe to referendum updates
 */
export async function subscribeReferendums(
  callback: (referendums: Referendum[]) => void
): Promise<() => void> {
  const api = getApi();

  // Subscribe to new blocks and fetch referendums on each new block
  const unsubscribe = await api.rpc.chain.subscribeNewHeads(async () => {
    const referendums = await getReferendums();
    callback(referendums);
  });

  return unsubscribe;
}
