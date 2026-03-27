// app/page.tsx

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function Home() {
  const router = useRouter()
  const [hostName, setHostName] = useState('')
  const [playerName, setPlayerName] = useState('')
  const [roomId, setRoomId] = useState('')
  const [bootAmount, setBootAmount] = useState(10)
  const [startingCoins, setStartingCoins] = useState(1000)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function createRoom() {
    if (!hostName.trim()) return setError('Enter your name!')
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/room/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hostName, bootAmount, startingCoins }),
      })
      const data = await res.json()
      if (data.roomId) {
        localStorage.setItem('playerId', data.playerId)
        localStorage.setItem('playerName', hostName)
        router.push(`/room/${data.roomId}`)
      }
    } catch {
      setError('Failed to create room. Try again!')
    }
    setLoading(false)
  }

  async function joinRoom() {
    if (!playerName.trim()) return setError('Enter your name!')
    if (!roomId.trim()) return setError('Enter a room code!')
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/room/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomId: roomId.toUpperCase(), playerName }),
      })
      const data = await res.json()
      if (data.playerId) {
        localStorage.setItem('playerId', data.playerId)
        localStorage.setItem('playerName', playerName)
        router.push(`/room/${roomId.toUpperCase()}`)
      } else {
        setError(data.error ?? 'Failed to join room!')
      }
    } catch {
      setError('Failed to join room. Try again!')
    }
    setLoading(false)
  }

  return (
    <main className="min-h-screen bg-green-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">

        {/* Title */}
        <div className="text-center">
          <h1 className="text-5xl font-bold text-yellow-400 drop-shadow-lg">🃏 Teen Patti</h1>
          <p className="text-green-300 mt-2 text-sm">Multiplayer Card Game</p>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-500/20 border border-red-500 text-red-300 px-4 py-2 rounded-lg text-sm text-center">
            {error}
          </div>
        )}

        {/* Create Room */}
        <div className="bg-green-900/60 border border-green-700 rounded-2xl p-6 space-y-4">
          <h2 className="text-yellow-400 font-bold text-lg">🏠 Create Room</h2>

          <input
            className="w-full bg-green-800/50 border border-green-600 rounded-lg px-4 py-2 text-white placeholder-green-400 focus:outline-none focus:border-yellow-400"
            placeholder="Your name"
            value={hostName}
            onChange={(e) => setHostName(e.target.value)}
          />

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-green-400 text-xs mb-1 block">Boot Amount</label>
              <select
                className="w-full bg-green-800/50 border border-green-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-yellow-400"
                value={bootAmount}
                onChange={(e) => setBootAmount(Number(e.target.value))}
              >
                <option value={5}>5 coins</option>
                <option value={10}>10 coins</option>
                <option value={25}>25 coins</option>
                <option value={50}>50 coins</option>
              </select>
            </div>
            <div>
              <label className="text-green-400 text-xs mb-1 block">Starting Coins</label>
              <select
                className="w-full bg-green-800/50 border border-green-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-yellow-400"
                value={startingCoins}
                onChange={(e) => setStartingCoins(Number(e.target.value))}
              >
                <option value={500}>500 coins</option>
                <option value={1000}>1000 coins</option>
                <option value={2000}>2000 coins</option>
                <option value={5000}>5000 coins</option>
              </select>
            </div>
          </div>

          <button
            onClick={createRoom}
            disabled={loading}
            className="w-full bg-yellow-400 hover:bg-yellow-300 text-green-950 font-bold py-3 rounded-xl transition disabled:opacity-50"
          >
            {loading ? 'Creating...' : 'Create Room'}
          </button>
        </div>

        {/* Divider */}
        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-green-700" />
          <span className="text-green-500 text-sm">or</span>
          <div className="flex-1 h-px bg-green-700" />
        </div>

        {/* Join Room */}
        <div className="bg-green-900/60 border border-green-700 rounded-2xl p-6 space-y-4">
          <h2 className="text-yellow-400 font-bold text-lg">🔗 Join Room</h2>

          <input
            className="w-full bg-green-800/50 border border-green-600 rounded-lg px-4 py-2 text-white placeholder-green-400 focus:outline-none focus:border-yellow-400"
            placeholder="Your name"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
          />

          <input
            className="w-full bg-green-800/50 border border-green-600 rounded-lg px-4 py-2 text-white placeholder-green-400 focus:outline-none focus:border-yellow-400 uppercase"
            placeholder="Room code (e.g. AB12CD34)"
            value={roomId}
            onChange={(e) => setRoomId(e.target.value.toUpperCase())}
          />

          <button
            onClick={joinRoom}
            disabled={loading}
            className="w-full bg-green-500 hover:bg-green-400 text-white font-bold py-3 rounded-xl transition disabled:opacity-50"
          >
            {loading ? 'Joining...' : 'Join Room'}
          </button>
        </div>

      </div>
    </main>
  )
}