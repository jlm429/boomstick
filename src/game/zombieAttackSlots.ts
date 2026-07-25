export const ZOMBIE_ATTACK_SLOT_COUNT = 8;
export const ZOMBIE_ATTACK_SLOT_RADIUS = 0.76;
export const ZOMBIE_ATTACK_SLOT_ARRIVAL_TOLERANCE = 0.04;
export const ZOMBIE_ATTACK_SLOT_EXIT_TOLERANCE = 0.12;
export const ZOMBIE_ATTACK_WAITING_RADIUS = 1.4;

export type ZombieAttackSlotPoint = Readonly<{ x: number; z: number }>;

export type ZombieAttackSlotTarget = Readonly<{
  kind: 'attack' | 'waiting';
  index: number;
  position: ZombieAttackSlotPoint;
}>;

const angleForIndex = (index: number, offset: number) =>
  ((index + offset) * Math.PI * 2) / ZOMBIE_ATTACK_SLOT_COUNT;

const pointOnRing = (
  playerPosition: ZombieAttackSlotPoint,
  index: number,
  radius: number,
  offset = 0,
): ZombieAttackSlotPoint => {
  const angle = angleForIndex(index, offset);
  return {
    x: playerPosition.x + Math.sin(angle) * radius,
    z: playerPosition.z + Math.cos(angle) * radius,
  };
};

const squaredDistance = (from: ZombieAttackSlotPoint, to: ZombieAttackSlotPoint) => {
  const x = to.x - from.x;
  const z = to.z - from.z;
  return x * x + z * z;
};

export const updateZombieSlotSettlement = (
  settled: boolean,
  zombiePosition: ZombieAttackSlotPoint,
  targetPosition: ZombieAttackSlotPoint,
) => {
  const tolerance = settled
    ? ZOMBIE_ATTACK_SLOT_EXIT_TOLERANCE
    : ZOMBIE_ATTACK_SLOT_ARRIVAL_TOLERANCE;
  return squaredDistance(zombiePosition, targetPosition) <= tolerance * tolerance;
};

export class ZombieAttackSlotCoordinator {
  private readonly attackOwners = new Map<number, string>();
  private readonly attackAssignments = new Map<string, number>();
  private readonly waitingAssignments = new Map<string, number>();
  private readonly waitingOwners = new Map<number, string>();

  claim(
    zombieId: string,
    zombiePosition: ZombieAttackSlotPoint,
    playerPosition: ZombieAttackSlotPoint,
  ): ZombieAttackSlotTarget {
    const existingAttackSlot = this.attackAssignments.get(zombieId);
    if (existingAttackSlot !== undefined) {
      return this.attackTarget(existingAttackSlot, playerPosition);
    }

    const availableAttackSlot = this.nearestAvailableAttackSlot(zombiePosition, playerPosition);
    if (availableAttackSlot !== null) {
      this.releaseWaitingAssignment(zombieId);
      this.attackAssignments.set(zombieId, availableAttackSlot);
      this.attackOwners.set(availableAttackSlot, zombieId);
      return this.attackTarget(availableAttackSlot, playerPosition);
    }

    const waitingSlot =
      this.waitingAssignments.get(zombieId) ?? this.claimWaitingSlot(zombieId);
    return {
      kind: 'waiting',
      index: waitingSlot,
      position: pointOnRing(
        playerPosition,
        waitingSlot % ZOMBIE_ATTACK_SLOT_COUNT,
        ZOMBIE_ATTACK_WAITING_RADIUS,
        0.5,
      ),
    };
  }

  release(zombieId: string) {
    const attackSlot = this.attackAssignments.get(zombieId);
    if (attackSlot !== undefined) {
      this.attackAssignments.delete(zombieId);
      this.attackOwners.delete(attackSlot);
    }
    this.releaseWaitingAssignment(zombieId);
  }

  reset() {
    this.attackOwners.clear();
    this.attackAssignments.clear();
    this.waitingAssignments.clear();
    this.waitingOwners.clear();
  }

  getAttackSlot(zombieId: string) {
    return this.attackAssignments.get(zombieId) ?? null;
  }

  private nearestAvailableAttackSlot(
    zombiePosition: ZombieAttackSlotPoint,
    playerPosition: ZombieAttackSlotPoint,
  ) {
    let nearestSlot: number | null = null;
    let nearestDistance = Infinity;
    for (let index = 0; index < ZOMBIE_ATTACK_SLOT_COUNT; index += 1) {
      if (this.attackOwners.has(index)) continue;
      const distance = squaredDistance(
        zombiePosition,
        pointOnRing(playerPosition, index, ZOMBIE_ATTACK_SLOT_RADIUS),
      );
      if (distance < nearestDistance) {
        nearestSlot = index;
        nearestDistance = distance;
      }
    }
    return nearestSlot;
  }

  private attackTarget(
    index: number,
    playerPosition: ZombieAttackSlotPoint,
  ): ZombieAttackSlotTarget {
    return {
      kind: 'attack',
      index,
      position: pointOnRing(playerPosition, index, ZOMBIE_ATTACK_SLOT_RADIUS),
    };
  }

  private claimWaitingSlot(zombieId: string) {
    let index = 0;
    while (this.waitingOwners.has(index)) index += 1;
    this.waitingAssignments.set(zombieId, index);
    this.waitingOwners.set(index, zombieId);
    return index;
  }

  private releaseWaitingAssignment(zombieId: string) {
    const waitingSlot = this.waitingAssignments.get(zombieId);
    if (waitingSlot === undefined) return;
    this.waitingAssignments.delete(zombieId);
    this.waitingOwners.delete(waitingSlot);
  }
}
