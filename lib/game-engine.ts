// lib/game-engine.ts

import { Card, GameState, Player, Suit, Rank, ActionPayload } from './types'

// ─── Deck ───────────────────────────────────────────────────────────────────

const SUITS: Suit[] = ['hearts', 'diamonds', 'clubs', 'spades']
const RANKS: Rank[] = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A']

export function createDeck(): Card[] {
  const deck: Card[] = []
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({ suit, rank })
    }
  }
  return deck
}

export function shuffleDeck(deck: Card[]): Card[] {
  const shuffled = [...deck]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
}

export function dealCards(players: Player[]): Player[] {
  const deck = shuffleDeck(createDeck())
  let cardIndex = 0
  return players.map((player) => ({
    ...player,
    cards: [deck[cardIndex++], deck[cardIndex++], deck[cardIndex++]],
    status: 'active',
    type: 'blind',
    hasActed: false,
    totalBet: 0,
  }))
}

// ─── Hand Rankings ───────────────────────────────────────────────────────────

const RANK_VALUE: Record<Rank, number> = {
  '2': 2, '3': 3, '4': 4, '5': 5, '6': 6,
  '7': 7, '8': 8, '9': 9, '10': 10,
  J: 11, Q: 12, K: 13, A: 14,
}

function rankVal(rank: Rank): number {
  return RANK_VALUE[rank]
}

function isFlush(cards: Card[]): boolean {
  return cards.every((c) => c.suit === cards[0].suit)
}

function isSequence(cards: Card[]): boolean {
  const vals = cards.map((c) => rankVal(c.rank)).sort((a, b) => a - b)
  // Normal sequence
  if (vals[2] - vals[1] === 1 && vals[1] - vals[0] === 1) return true
  // A-2-3 special case
  if (vals[0] === 2 && vals[1] === 3 && vals[2] === 14) return true
  return false
}

function isTrail(cards: Card[]): boolean {
  return cards[0].rank === cards[1].rank && cards[1].rank === cards[2].rank
}

function isPair(cards: Card[]): boolean {
  return (
    cards[0].rank === cards[1].rank ||
    cards[1].rank === cards[2].rank ||
    cards[0].rank === cards[2].rank
  )
}

export type HandRank = 0 | 1 | 2 | 3 | 4 | 5

export function getHandRank(cards: Card[]): HandRank {
  if (isTrail(cards)) return 5          // Trail
  if (isFlush(cards) && isSequence(cards)) return 4  // Pure Sequence
  if (isSequence(cards)) return 3       // Sequence
  if (isFlush(cards)) return 2          // Color
  if (isPair(cards)) return 1           // Pair
  return 0                              // High Card
}

export function compareHands(a: Card[], b: Card[]): number {
  const rankA = getHandRank(a)
  const rankB = getHandRank(b)
  if (rankA !== rankB) return rankA - rankB

  const valsA = a.map((c) => rankVal(c.rank)).sort((x, y) => y - x)
  const valsB = b.map((c) => rankVal(c.rank)).sort((x, y) => y - x)

  for (let i = 0; i < 3; i++) {
    if (valsA[i] !== valsB[i]) return valsA[i] - valsB[i]
  }
  return 0
}

// ─── Game Actions ────────────────────────────────────────────────────────────

export function applyAction(
  state: GameState,
  payload: ActionPayload
): GameState {
  const { playerId, action, amount } = payload
  const newState = JSON.parse(JSON.stringify(state)) as GameState
  const playerIndex = newState.players.findIndex((p) => p.id === playerId)
  const player = newState.players[playerIndex]

  if (!player || player.status !== 'active') return newState

  switch (action) {
    case 'see_cards': {
      player.type = 'seen'
      newState.lastAction = `${player.name} looked at their cards`
      break
    }

    case 'fold': {
      player.status = 'folded'
      newState.lastAction = `${player.name} folded`
      break
    }

    case 'blind_bet':
    case 'bet': {
      const betAmount = amount ?? newState.currentStake
      player.coins -= betAmount
      player.totalBet += betAmount
      newState.pot += betAmount
      if (betAmount > newState.currentStake) {
        newState.currentStake = betAmount
      }
      newState.lastAction = `${player.name} bet ${betAmount} coins`
      break
    }

    case 'show': {
      newState.status = 'showdown'
      newState.lastAction = `${player.name} called Show`
      break
    }

    case 'sideshow': {
      // Compare with previous active player
      const activePlayers = newState.players.filter((p) => p.status === 'active')
      const prevIndex = activePlayers.findIndex((p) => p.id === playerId) - 1
      if (prevIndex >= 0) {
        const prev = activePlayers[prevIndex]
        const result = compareHands(player.cards, prev.cards)
        if (result <= 0) {
          player.status = 'folded'
          newState.lastAction = `${player.name} lost sideshow vs ${prev.name}`
        } else {
          prev.status = 'folded'
          newState.lastAction = `${prev.name} lost sideshow vs ${player.name}`
        }
      }
      break
    }
  }

  player.hasActed = true

  // Check if only one player remains
  const activePlayers = newState.players.filter((p) => p.status === 'active')
  if (activePlayers.length === 1) {
    newState.status = 'finished'
    newState.winnerId = activePlayers[0].id
    activePlayers[0].status = 'winner'
  }

  // Move to next active player
  if (newState.status === 'playing') {
    let next = (playerIndex + 1) % newState.players.length
    while (newState.players[next].status !== 'active') {
      next = (next + 1) % newState.players.length
    }
    newState.currentPlayerIndex = next
  }

  return newState
}

// ─── Showdown ────────────────────────────────────────────────────────────────

export function resolveShowdown(state: GameState): GameState {
  const newState = JSON.parse(JSON.stringify(state)) as GameState
  const activePlayers = newState.players.filter((p) => p.status === 'active')

  let winner = activePlayers[0]
  for (let i = 1; i < activePlayers.length; i++) {
    const result = compareHands(activePlayers[i].cards, winner.cards)
    if (result > 0) winner = activePlayers[i]
  }

  newState.winnerId = winner.id
  newState.status = 'finished'
  winner.status = 'winner'
  winner.coins += newState.pot

  return newState
}