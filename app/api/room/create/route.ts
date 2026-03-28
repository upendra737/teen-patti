// app/api/room/create/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'
import redis from '@/lib/redis'
import { Room } from '@/lib/types'

export async function POST(req: NextRequest) {
  const { hostName, bootAmount, startingCoins } = await req.json()

  const roomId = uuidv4().slice(0, 8).toUpperCase()
  const hostId = uuidv4()

  const room: Room = {
    id: roomId,
    hostId,
    players: [
      {
        id: hostId,
        name: hostName,
        coins: startingCoins,
        cards: [],
        status: 'waiting',
        type: 'blind',
        isHost: true,
        hasActed: false,
        totalBet: 0,
      },
    ],
    status: 'waiting',
    bootAmount: bootAmount ?? 10,
    startingCoins: startingCoins ?? 1000,
    createdAt: Date.now(),
  }

  await redis.set(`room:${roomId}`, JSON.stringify(room), { ex: 3600 })

  return NextResponse.json({ roomId, playerId: hostId })
}