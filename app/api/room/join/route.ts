// app/api/room/join/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'
import redis from '@/lib/redis'
import pusher from '@/lib/pusher'
import { Room } from '@/lib/types'

export async function POST(req: NextRequest) {
  const { roomId, playerName } = await req.json()

  const raw = await redis.get(`room:${roomId}`)
  if (!raw) return NextResponse.json({ error: 'Room not found' }, { status: 404 })

  const room: Room = typeof raw === 'string' ? JSON.parse(raw) : raw as Room

  if (room.status !== 'waiting') {
    return NextResponse.json({ error: 'Game already started' }, { status: 400 })
  }

  if (room.players.length >= 6) {
    return NextResponse.json({ error: 'Room is full' }, { status: 400 })
  }

  const playerId = uuidv4()
  room.players.push({
    id: playerId,
    name: playerName,
    coins: room.startingCoins,
    cards: [],
    status: 'waiting',
    type: 'blind',
    isHost: false,
    hasActed: false,
    totalBet: 0,
  })

  await redis.set(`room:${roomId}`, JSON.stringify(room), { ex: 3600 })

  await pusher.trigger(`room-${roomId}`, 'player-joined', {
    players: room.players.map((p) => ({ id: p.id, name: p.name, coins: p.coins, isHost: p.isHost })),
  })

  return NextResponse.json({ playerId, room })
}