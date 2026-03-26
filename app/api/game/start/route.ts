// app/api/game/start/route.ts

import { NextRequest, NextResponse } from 'next/server'
import redis from '@/lib/redis'
import pusher from '@/lib/pusher'
import { Room, GameState } from '@/lib/types'
import { dealCards } from '@/lib/game-engine'

export async function POST(req: NextRequest) {
  const { roomId, playerId } = await req.json()

  const raw = await redis.get(`room:${roomId}`)
  if (!raw) return NextResponse.json({ error: 'Room not found' }, { status: 404 })

  const room: Room = typeof raw === 'string' ? JSON.parse(raw) : raw as Room

  if (room.hostId !== playerId) {
    return NextResponse.json({ error: 'Only host can start the game' }, { status: 403 })
  }

  if (room.players.length < 2) {
    return NextResponse.json({ error: 'Need at least 2 players' }, { status: 400 })
  }

  // Collect boot amount from all players
  const playersWithBoot = room.players.map((p) => ({
    ...p,
    coins: p.coins - room.bootAmount,
    totalBet: room.bootAmount,
  }))

  const dealtPlayers = dealCards(playersWithBoot)
  const pot = room.bootAmount * room.players.length

  const gameState: GameState = {
    roomId,
    players: dealtPlayers,
    pot,
    currentStake: room.bootAmount,
    currentPlayerIndex: 1 % dealtPlayers.length,
    dealerIndex: 0,
    round: 1,
    status: 'playing',
    winnerId: null,
    lastAction: 'Game started! Cards dealt.',
  }

  room.status = 'playing'
  await redis.set(`room:${roomId}`, JSON.stringify(room), { ex: 3600 })
  await redis.set(`game:${roomId}`, JSON.stringify(gameState), { ex: 3600 })

  // Send each player their own cards privately
  for (const player of dealtPlayers) {
    await pusher.trigger(`room-${roomId}`, 'game-started', {
      gameState: {
        ...gameState,
        players: gameState.players.map((p) =>
          p.id === player.id ? p : { ...p, cards: [] }
        ),
      },
      yourPlayerId: player.id,
    })
  }

  return NextResponse.json({ success: true, gameState })
}