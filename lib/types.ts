// lib/types.ts

export type Suit = 'hearts' | 'diamonds' | 'clubs' | 'spades'
export type Rank = '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K' | 'A'

export interface Card {
  suit: Suit
  rank: Rank
}

export type PlayerStatus = 'waiting' | 'active' | 'folded' | 'winner'
export type PlayerType = 'blind' | 'seen'

export interface Player {
  id: string
  name: string
  coins: number
  cards: Card[]
  status: PlayerStatus
  type: PlayerType
  isHost: boolean
  hasActed: boolean
  totalBet: number
}

export interface Room {
  id: string
  hostId: string
  players: Player[]
  status: 'waiting' | 'playing' | 'finished'
  bootAmount: number
  startingCoins: number
  createdAt: number
}

export interface GameState {
  roomId: string
  players: Player[]
  pot: number
  currentStake: number
  currentPlayerIndex: number
  dealerIndex: number
  round: number
  status: 'waiting' | 'playing' | 'showdown' | 'finished'
  winnerId: string | null
  lastAction: string | null
}

export type GameAction =
  | 'bet'
  | 'fold'
  | 'show'
  | 'sideshow'
  | 'see_cards'
  | 'blind_bet'

export interface ActionPayload {
  roomId: string
  playerId: string
  action: GameAction
  amount?: number
}