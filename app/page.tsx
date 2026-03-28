'use client'

import { useState } from 'react'

export default function Home() {
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
        window.location.href = `/room/${data.roomId}`
      } else {
        setError('Failed to create room. Try again!')
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
        window.location.href = `/room/${roomId.toUpperCase()}`
      } else {
        setError(data.error ?? 'Failed to join room!')
      }
    } catch {
      setError('Failed to join room. Try again!')
    }
    setLoading(false)
  }

  return (
    <main
      className="min-h-screen flex items-center justify-center p-4"
      style={{
        background: 'radial-gradient(ellipse at top, #1a0a2e 0%, #0d0d0d 60%, #0a0a0a 100%)',
        fontFamily: "'Georgia', serif",
      }}
    >
      <div className="w-full max-w-md space-y-6">

        {/* Title */}
        <div className="text-center space-y-2">
          <div className="flex justify-center gap-4 text-4xl mb-2">
            <span>♠</span>
            <span style={{ color: '#dc2626' }}>♥</span>
            <span style={{ color: '#dc2626' }}>♦</span>
            <span>♣</span>
          </div>
          <h1
            className="text-5xl font-bold tracking-wide"
            style={{ color: '#FFD700', textShadow: '0 0 30px #FFD70066' }}
          >
            Teen Patti
          </h1>
          <p className="text-sm tracking-widest uppercase" style={{ color: '#8B6914' }}>
            Multiplayer Card Game
          </p>
        </div>

        {/* Error */}
        {error && (
          <div
            className="px-4 py-3 rounded-xl text-sm text-center"
            style={{
              background: 'rgba(220,38,38,0.15)',
              border: '1px solid rgba(220,38,38,0.4)',
              color: '#fca5a5',
            }}
          >
            {error}
          </div>
        )}

        {/* Create Room */}
        <div
          className="rounded-2xl p-6 space-y-4"
          style={{
            background: 'linear-gradient(135deg, #1a1a2e, #16213e)',
            border: '1px solid #8B6914',
            boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
          }}
        >
          <h2 className="font-bold text-lg" style={{ color: '#FFD700' }}>🏠 Create Room</h2>

          <input
            className="w-full px-4 py-3 rounded-xl text-white placeholder-gray-500 outline-none"
            style={{
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(139,105,20,0.4)',
            }}
            placeholder="Your name"
            value={hostName}
            onChange={(e) => setHostName(e.target.value)}
          />

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs uppercase tracking-widest block mb-1" style={{ color: '#8B6914' }}>
                Boot Amount
              </label>
              <select
                className="w-full px-3 py-2 rounded-xl text-white outline-none"
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(139,105,20,0.4)',
                }}
                value={bootAmount}
                onChange={(e) => setBootAmount(Number(e.target.value))}
              >
                <option value={5} style={{ background: '#1a1a2e' }}>5 coins</option>
                <option value={10} style={{ background: '#1a1a2e' }}>10 coins</option>
                <option value={25} style={{ background: '#1a1a2e' }}>25 coins</option>
                <option value={50} style={{ background: '#1a1a2e' }}>50 coins</option>
              </select>
            </div>
            <div>
              <label className="text-xs uppercase tracking-widest block mb-1" style={{ color: '#8B6914' }}>
                Starting Coins
              </label>
              <select
                className="w-full px-3 py-2 rounded-xl text-white outline-none"
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(139,105,20,0.4)',
                }}
                value={startingCoins}
                onChange={(e) => setStartingCoins(Number(e.target.value))}
              >
                <option value={500} style={{ background: '#1a1a2e' }}>500 coins</option>
                <option value={1000} style={{ background: '#1a1a2e' }}>1000 coins</option>
                <option value={2000} style={{ background: '#1a1a2e' }}>2000 coins</option>
                <option value={5000} style={{ background: '#1a1a2e' }}>5000 coins</option>
              </select>
            </div>
          </div>

          <button
            type="button"
            onClick={createRoom}
            disabled={loading}
            className="w-full py-3 rounded-xl font-bold text-black text-lg transition-all hover:opacity-90 disabled:opacity-50"
            style={{ background: 'linear-gradient(135deg, #FFD700, #FFA500)' }}
          >
            {loading ? 'Creating...' : 'Create Room'}
          </button>
        </div>

        {/* Divider */}
        <div className="flex items-center gap-4">
          <div className="flex-1 h-px" style={{ background: 'rgba(139,105,20,0.3)' }} />
          <span className="text-sm" style={{ color: '#8B6914' }}>or</span>
          <div className="flex-1 h-px" style={{ background: 'rgba(139,105,20,0.3)' }} />
        </div>

        {/* Join Room */}
        <div
          className="rounded-2xl p-6 space-y-4"
          style={{
            background: 'linear-gradient(135deg, #1a1a2e, #16213e)',
            border: '1px solid #8B6914',
            boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
          }}
        >
          <h2 className="font-bold text-lg" style={{ color: '#FFD700' }}>🔗 Join Room</h2>

          <input
            className="w-full px-4 py-3 rounded-xl text-white placeholder-gray-500 outline-none"
            style={{
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(139,105,20,0.4)',
            }}
            placeholder="Your name"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
          />

          <input
            className="w-full px-4 py-3 rounded-xl text-white placeholder-gray-500 outline-none uppercase font-mono"
            style={{
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(139,105,20,0.4)',
            }}
            placeholder="Room code (e.g. AB12CD34)"
            value={roomId}
            onChange={(e) => setRoomId(e.target.value.toUpperCase())}
          />

          <button
            type="button"
            onClick={joinRoom}
            disabled={loading}
            className="w-full py-3 rounded-xl font-bold text-white text-lg transition-all hover:opacity-90 disabled:opacity-50"
            style={{ background: 'linear-gradient(135deg, #1d4ed8, #3b82f6)' }}
          >
            {loading ? 'Joining...' : 'Join Room'}
          </button>
        </div>

      </div>
    </main>
  )
}