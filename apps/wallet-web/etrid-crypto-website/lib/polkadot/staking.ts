import type { ApiPromise } from '@polkadot/api';
import { getApi } from './api';
import { signAndSendTx, type TxResult } from '@/lib/wallet/transactions';

export interface StakingInfo {
  stash: string;
  controller: string;
  active: string;
  total: string;
  unlocking: Array<{
    value: string;
    era: number;
  }>;
  claimable: string;
  nominations?: string[];
}

export interface Validator {
  address: string;
  commission: string;
  blocked: boolean;
  totalStake: string;
  ownStake: string;
  nominatorCount: number;
  isActive: boolean;
  identity?: {
    display: string;
    web?: string;
    twitter?: string;
  };
}

export interface Nomination {
  targets: string[];
  submittedIn: number;
  suppressed: boolean;
}

export interface StakingLedger {
  stash: string;
  total: string;
  active: string;
  unlocking: Array<{
    value: string;
    era: number;
  }>;
  claimedRewards: number[];
}

export interface EraInfo {
  activeEra: number;
  currentEra: number;
  sessionLength: number;
  eraLength: number;
  sessionProgress: number;
  eraProgress: number;
}

/**
 * Get staking information for an address
 */
export async function getStakingInfo(address: string): Promise<StakingInfo | null> {
  const api = getApi();

  try {
    const [ledger, nominations, bonded] = await Promise.all([
      api.query.staking.ledger(address),
      api.query.staking.nominators(address),
      api.query.staking.bonded(address),
    ]);

    if (ledger.isNone) {
      return null;
    }

    const stakingLedger = ledger.unwrap();
    const controller = bonded.isSome ? bonded.unwrap().toString() : address;
    const nominationTargets = nominations.isSome
      ? nominations.unwrap().targets.map((t) => t.toString())
      : undefined;

    return {
      stash: stakingLedger.stash.toString(),
      controller,
      active: stakingLedger.active.toString(),
      total: stakingLedger.total.toString(),
      unlocking: stakingLedger.unlocking.map((unlock) => ({
        value: unlock.value.toString(),
        era: unlock.era.toNumber(),
      })),
      claimable: '0', // Calculate from payee and pending rewards
      nominations: nominationTargets,
    };
  } catch (error) {
    console.error('[ËTRID Staking] Error fetching staking info:', error);
    return null;
  }
}

/**
 * Get all validators
 */
export async function getValidators(): Promise<Validator[]> {
  const api = getApi();

  try {
    const [validators, validatorPrefs, exposures, activeEra] = await Promise.all([
      api.query.session.validators(),
      api.query.staking.validators.entries(),
      api.query.staking.erasStakers.entries(),
      api.query.staking.activeEra(),
    ]);

    const validatorAddresses = validators.map((v) => v.toString());
    const validatorList: Validator[] = [];

    const eraIndex = activeEra.isSome ? activeEra.unwrap().index.toNumber() : 0;

    for (const address of validatorAddresses) {
      const prefs = validatorPrefs.find(([key]) =>
        key.args[0].toString() === address
      );

      const exposure = exposures.find(([key]) =>
        key.args[0].toNumber() === eraIndex && key.args[1].toString() === address
      );

      const commission = prefs
        ? prefs[1].commission.toString()
        : '0';

      const blocked = prefs
        ? prefs[1].blocked.isTrue
        : false;

      let totalStake = '0';
      let ownStake = '0';
      let nominatorCount = 0;

      if (exposure) {
        const exposureData = exposure[1];
        totalStake = exposureData.total.toString();
        ownStake = exposureData.own.toString();
        nominatorCount = exposureData.others.length;
      }

      // Try to fetch identity
      let identity;
      try {
        const identityInfo = await api.query.identity.identityOf(address);
        if (identityInfo.isSome) {
          const info = identityInfo.unwrap()[0].info;
          identity = {
            display: info.display.isRaw
              ? info.display.asRaw.toUtf8()
              : info.display.toString(),
            web: info.web.isRaw ? info.web.asRaw.toUtf8() : undefined,
            twitter: info.twitter.isRaw ? info.twitter.asRaw.toUtf8() : undefined,
          };
        }
      } catch (e) {
        // Identity pallet may not be available
      }

      validatorList.push({
        address,
        commission,
        blocked,
        totalStake,
        ownStake,
        nominatorCount,
        isActive: true,
        identity,
      });
    }

    return validatorList;
  } catch (error) {
    console.error('[ËTRID Staking] Error fetching validators:', error);
    return [];
  }
}

/**
 * Get waiting validators (not in active set)
 */
export async function getWaitingValidators(): Promise<Validator[]> {
  const api = getApi();

  try {
    const [allValidators, activeValidators] = await Promise.all([
      api.query.staking.validators.entries(),
      api.query.session.validators(),
    ]);

    const activeAddresses = activeValidators.map((v) => v.toString());
    const waitingList: Validator[] = [];

    for (const [key, prefs] of allValidators) {
      const address = key.args[0].toString();

      if (activeAddresses.includes(address)) {
        continue; // Skip active validators
      }

      waitingList.push({
        address,
        commission: prefs.commission.toString(),
        blocked: prefs.blocked.isTrue,
        totalStake: '0',
        ownStake: '0',
        nominatorCount: 0,
        isActive: false,
      });
    }

    return waitingList;
  } catch (error) {
    console.error('[ËTRID Staking] Error fetching waiting validators:', error);
    return [];
  }
}

/**
 * Get era information
 */
export async function getEraInfo(): Promise<EraInfo> {
  const api = getApi();

  try {
    const [activeEra, currentEra, sessionIndex, sessionInfo] = await Promise.all([
      api.query.staking.activeEra(),
      api.query.staking.currentEra(),
      api.query.session.currentIndex(),
      api.consts.babe?.epochDuration || api.consts.staking.sessionsPerEra,
    ]);

    const activeEraIndex = activeEra.isSome ? activeEra.unwrap().index.toNumber() : 0;
    const currentEraIndex = currentEra.isSome ? currentEra.unwrap().toNumber() : 0;
    const session = sessionIndex.toNumber();
    const sessionLength = sessionInfo.toNumber();

    // Calculate session progress (simplified)
    const sessionProgress = 0; // Would need current block and session start block

    return {
      activeEra: activeEraIndex,
      currentEra: currentEraIndex,
      sessionLength,
      eraLength: sessionLength * 6, // Typically 6 sessions per era
      sessionProgress,
      eraProgress: 0,
    };
  } catch (error) {
    console.error('[ËTRID Staking] Error fetching era info:', error);
    return {
      activeEra: 0,
      currentEra: 0,
      sessionLength: 0,
      eraLength: 0,
      sessionProgress: 0,
      eraProgress: 0,
    };
  }
}

/**
 * Bond tokens for staking
 */
export async function bond(
  fromAddress: string,
  amount: string | bigint,
  payee: 'Staked' | 'Stash' | 'Controller' | { Account: string }
): Promise<TxResult> {
  const api = getApi();
  const tx = api.tx.staking.bond(fromAddress, amount, payee);
  return signAndSendTx(api, tx, fromAddress);
}

/**
 * Bond additional tokens
 */
export async function bondExtra(
  fromAddress: string,
  amount: string | bigint
): Promise<TxResult> {
  const api = getApi();
  const tx = api.tx.staking.bondExtra(amount);
  return signAndSendTx(api, tx, fromAddress);
}

/**
 * Unbond tokens
 */
export async function unbond(
  fromAddress: string,
  amount: string | bigint
): Promise<TxResult> {
  const api = getApi();
  const tx = api.tx.staking.unbond(amount);
  return signAndSendTx(api, tx, fromAddress);
}

/**
 * Withdraw unbonded tokens
 */
export async function withdrawUnbonded(
  fromAddress: string,
  numSlashingSpans: number = 0
): Promise<TxResult> {
  const api = getApi();
  const tx = api.tx.staking.withdrawUnbonded(numSlashingSpans);
  return signAndSendTx(api, tx, fromAddress);
}

/**
 * Nominate validators
 */
export async function nominate(
  fromAddress: string,
  targets: string[]
): Promise<TxResult> {
  const api = getApi();
  const tx = api.tx.staking.nominate(targets);
  return signAndSendTx(api, tx, fromAddress);
}

/**
 * Stop nominating (chill)
 */
export async function chill(fromAddress: string): Promise<TxResult> {
  const api = getApi();
  const tx = api.tx.staking.chill();
  return signAndSendTx(api, tx, fromAddress);
}

/**
 * Get minimum staking amount
 */
export async function getMinimumStake(): Promise<string> {
  const api = getApi();

  try {
    const minNominatorBond = api.consts.staking.minNominatorBond;
    return minNominatorBond.toString();
  } catch (error) {
    console.error('[ËTRID Staking] Error fetching minimum stake:', error);
    return '0';
  }
}

/**
 * Get bonding duration (in eras)
 */
export async function getBondingDuration(): Promise<number> {
  const api = getApi();

  try {
    const bondingDuration = api.consts.staking.bondingDuration;
    return bondingDuration.toNumber();
  } catch (error) {
    console.error('[ËTRID Staking] Error fetching bonding duration:', error);
    return 0;
  }
}

/**
 * Get minimum validator bond amount
 */
export async function getMinimumValidatorBond(): Promise<string> {
  const api = getApi();

  try {
    const minValidatorBond = api.consts.staking.minValidatorBond;
    return minValidatorBond.toString();
  } catch (error) {
    console.error('[ËTRID Staking] Error fetching minimum validator bond:', error);
    return '0';
  }
}

/**
 * Check if address is already a validator
 */
export async function isValidator(address: string): Promise<boolean> {
  const api = getApi();

  try {
    const validators = await api.query.session.validators();
    return validators.some((v) => v.toString() === address);
  } catch (error) {
    console.error('[ËTRID Staking] Error checking validator status:', error);
    return false;
  }
}

/**
 * Get validator count and maximum validators
 */
export async function getValidatorCounts(): Promise<{
  current: number;
  max: number;
  slotsAvailable: number;
}> {
  const api = getApi();

  try {
    const validators = await api.query.session.validators();
    const maxValidators = api.consts.staking.maxValidatorCount || 100;
    const current = validators.length;
    const max = maxValidators.toNumber ? maxValidators.toNumber() : Number(maxValidators);

    return {
      current,
      max,
      slotsAvailable: max - current,
    };
  } catch (error) {
    console.error('[ËTRID Staking] Error fetching validator counts:', error);
    return {
      current: 0,
      max: 0,
      slotsAvailable: 0,
    };
  }
}

/**
 * Set session keys for validator
 */
export async function setKeys(
  fromAddress: string,
  keys: string,
  proof: string = '0x00'
): Promise<TxResult> {
  const api = getApi();
  const tx = api.tx.session.setKeys(keys, proof);
  return signAndSendTx(api, tx, fromAddress);
}

/**
 * Declare intention to validate
 */
export async function validate(
  fromAddress: string,
  commission: number // percentage 0-100
): Promise<TxResult> {
  const api = getApi();

  // Convert commission percentage to Perbill (parts per billion)
  // 1% = 10,000,000 Perbill
  const commissionPerbill = Math.floor(commission * 10000000);

  const tx = api.tx.staking.validate({
    commission: commissionPerbill,
    blocked: false,
  });

  return signAndSendTx(api, tx, fromAddress);
}
