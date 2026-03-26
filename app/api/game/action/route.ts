// app/api/game/action/route.ts

import { NextRequest, NextResponse } from 'next/server'
import redis from '@/lib/redis'
import pusher from '@/lib/pusher'
import { GameState } from '@/lib/types'
import { applyAction, resolveShowdown } from '@/lib/game-engine'

export async function POST(req: NextRequest) {
  const payload = await req.json()
  const { roomId } = payload

  const raw = await redis.get(`game:${roomId}`)
  if (!raw) return NextResponse.json({ error: 'Game not found' }, { status: 404 })

  const gameState: GameState = typeof raw === 'string' ? JSON.parse(raw) : raw as GameState

  let newState = applyAction(gameState, payload)

  if (newState.status === 'showdown') {
    newState = resolveShowdown(newState)
  }

  await redis.set(`game:${roomId}`, JSON.stringify(newState), { ex: 3600 })

  await pusher.trigger(`room-${roomId}`, 'game-updated', {
    gameState: {
      ...newState,
      players: newState.players.map((p) => ({ ...p, cards: [] })),
    },
  })

  // If game finished, send winner event
  if (newState.status === 'finished') {
    const winner = newState.players.find((p) => p.id === newState.winnerId)
    await pusher.trigger(`room-${roomId}`, 'game-finished', {
      winnerId: newState.winnerId,
      winnerName: winner?.name,
      pot: newState.pot,
    })
  }

  return NextResponse.json({ success: true, gameState: newState })
}