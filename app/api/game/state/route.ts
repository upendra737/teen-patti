// app/api/game/state/route.ts

import { NextRequest, NextResponse } from 'next/server'
import redis from '@/lib/redis'
import { GameState } from '@/lib/types'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const roomId = searchParams.get('roomId')
  const playerId = searchParams.get('playerId')

  if (!roomId || !playerId) {
    return NextResponse.json({ error: 'Missing params' }, { status: 400 })
  }

  const raw = await redis.get(`game:${roomId}`)
  if (!raw) return NextResponse.json({ error: 'Game not found' }, { status: 404 })

  const gameState: GameState = typeof raw === 'string' ? JSON.parse(raw) : raw as GameState

  // Only send the requesting player their own cards
  const sanitized = {
    ...gameState,
    players: gameState.players.map((p) =>
      p.id === playerId ? p : { ...p, cards: [] }
    ),
  }

  return NextResponse.json({ gameState: sanitized })
}