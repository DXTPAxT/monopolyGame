// ============================================================
// Bankruptcy resolution — docs/RULES.md §10
// ============================================================

import { GameState, PendingPayment } from '../types';
import { getTile } from '../board';
import { buildingValue } from './mortgage';

export interface BankruptcyResult {
  ok: boolean;
  events: string[];
  gameOver: boolean;
  winnerId?: string;
}

type PendingPaymentPurpose = PendingPayment['purpose'];

// ─────────────────────────────────────────────────────────────
// liquidatableWorth
//   = cash
//   + for each OWNED, UNMORTGAGED tile:  floor(price / 2)
//   + for each OWNED house:              floor(housePrice / 2)
//   + for each OWNED hotel:              floor(housePrice / 2)
// ─────────────────────────────────────────────────────────────
export function liquidatableWorth(state: GameState, playerId: string): number {
  const player = state.players.find((p) => p.id === playerId);
  if (!player) return 0;

  let worth = player.money;
  const sellDeedMode = state.settings?.houseRules?.sellDeedOutright ?? false;

  for (const tileState of state.tiles) {
    if (tileState.ownerId !== playerId) continue;

    const meta = getTile(tileState.id);

    if (sellDeedMode) {
      // Chế độ bán đứt: 80% (giá đất + công trình) trong một lần
      const total = (meta.price || 0) + buildingValue(meta.housePrice || 0, tileState);
      worth += Math.floor(total * 0.8);
      continue;
    }

    // Mortgage value (only if not already mortgaged)
    if (!tileState.mortgaged && meta.price) {
      worth += Math.floor(meta.price / 2);
    }

    // House sell-back
    if (tileState.houses > 0 && meta.housePrice) {
      worth += tileState.houses * Math.floor(meta.housePrice / 2);
    }

    // Hotel sell-back
    if (tileState.hotel && meta.housePrice) {
      worth += Math.floor(meta.housePrice / 2);
    }
  }

  return worth;
}

// ─────────────────────────────────────────────────────────────
// resolveDebt
// ─────────────────────────────────────────────────────────────
export function resolveDebt(
  state: GameState,
  debt: number,
  creditorId: string,
  purpose: PendingPaymentPurpose
): BankruptcyResult {
  const activePlayer = state.players[state.activePlayerIndex];

  // Case 1: Player can pay immediately from cash
  if (activePlayer.money >= debt) {
    activePlayer.money -= debt;

    if (creditorId !== 'bank') {
      const creditor = state.players.find((p) => p.id === creditorId);
      if (creditor) creditor.money += debt;
    }

    state.pendingPayment = null;

    return {
      ok: true,
      events: [`debt_paid:from=${activePlayer.id}:to=${creditorId}:amount=${debt}`],
      gameOver: false,
    };
  }

  // Case 2: Cash insufficient but could raise funds
  const worth = liquidatableWorth(state, activePlayer.id);
  if (worth >= debt) {
    state.currentActionRequired = 'must_raise_funds';
    state.pendingPayment = {
      fromPlayerId: activePlayer.id,
      toPlayerId: creditorId,
      amount: debt,
      purpose,
    };

    return {
      ok: true,
      events: [`must_raise_funds:player=${activePlayer.id}:amount=${debt}`],
      gameOver: false,
    };
  }

  // Case 3: Truly insolvent — bankruptcy
  // Set up pendingPayment so declareBankruptcy can read creditor
  state.pendingPayment = {
    fromPlayerId: activePlayer.id,
    toPlayerId: creditorId,
    amount: debt,
    purpose,
  };

  return declareBankruptcy(state);
}

// ─────────────────────────────────────────────────────────────
// settleDebt
// Called after the active player has sold/mortgaged assets.
// ─────────────────────────────────────────────────────────────
export function settleDebt(state: GameState): BankruptcyResult {
  const payment = state.pendingPayment;
  if (!payment) {
    return { ok: false, events: ['no_pending_payment'], gameOver: false };
  }

  const payer = state.players.find((p) => p.id === payment.fromPlayerId);
  if (!payer) {
    return { ok: false, events: ['payer_not_found'], gameOver: false };
  }

  if (payer.money >= payment.amount) {
    payer.money -= payment.amount;

    if (payment.toPlayerId !== 'bank') {
      const creditor = state.players.find((p) => p.id === payment.toPlayerId);
      if (creditor) creditor.money += payment.amount;
    }

    state.pendingPayment = null;
    state.currentActionRequired = 'none';

    return {
      ok: true,
      events: [`debt_settled:from=${payer.id}:to=${payment.toPlayerId}:amount=${payment.amount}`],
      gameOver: false,
    };
  }

  // Still can't pay → bankruptcy
  return declareBankruptcy(state);
}

// ─────────────────────────────────────────────────────────────
// declareBankruptcy
// ─────────────────────────────────────────────────────────────
export function declareBankruptcy(state: GameState): BankruptcyResult {
  const payment = state.pendingPayment;
  const activePlayer = state.players[state.activePlayerIndex];
  const creditorId = payment?.toPlayerId ?? 'bank';

  const events: string[] = [];

  if (creditorId !== 'bank') {
    // Transfer tiles to creditor (keep their mortgaged flag)
    const creditor = state.players.find((p) => p.id === creditorId);
    for (const tileState of state.tiles) {
      if (tileState.ownerId === activePlayer.id) {
        tileState.ownerId = creditorId;
        events.push(`tile_transferred:tile=${tileState.id}:to=${creditorId}`);
      }
    }

    // Transfer remaining cash to creditor
    if (creditor && activePlayer.money > 0) {
      creditor.money += activePlayer.money;
      events.push(`cash_transferred:amount=${activePlayer.money}:to=${creditorId}`);
    }
  } else {
    // Return tiles to bank (reset fully)
    for (const tileState of state.tiles) {
      if (tileState.ownerId === activePlayer.id) {
        tileState.ownerId = null;
        tileState.houses = 0;
        tileState.hotel = false;
        tileState.mortgaged = false;
        events.push(`tile_returned_to_bank:tile=${tileState.id}`);
      }
    }
  }

  // Mark bankrupt
  activePlayer.isBankrupt = true;
  activePlayer.money = 0;
  state.pendingPayment = null;
  state.currentActionRequired = 'none';

  events.push(`player_bankrupt:player=${activePlayer.id}`);

  // Check win condition: exactly one non-bankrupt player left
  const survivors = state.players.filter((p) => !p.isBankrupt);
  if (survivors.length === 1) {
    state.winnerId = survivors[0].id;
    return {
      ok: false,
      events,
      gameOver: true,
      winnerId: survivors[0].id,
    };
  }

  return { ok: false, events, gameOver: false };
}
