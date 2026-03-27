// app/room/[roomId]/page.tsx

'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import pusherClient from '@/lib/pusher-client'
import { GameState, Player } from '@/lib/types'

export default function RoomPage() {
  const { roomId } = useParams() as { roomId: string }
  const [playerId, setPlayerId] = useState('')
  const [playerName, setPlayerName] = useState('')
  const [players, setPlayers] = useState<Player[]>([])
  const [gameState, setGameState] = useState<GameState | null>(null)
  const [status, setStatus] = useState<'waiting' | 'playing' | 'finished'>('waiting')
  const [winner, setWinner] = useState<{ name: string; pot: number } | null>(null)
  const [copied, setCopied] = useState(false)
  const [betAmount, setBetAmount] = useState(0)

  useEffect(() => {
    const pid = localStorage.getItem('playerId') ?? ''
    const pname = localStorage.getItem('playerName') ?? ''
    setPlayerId(pid)
    setPlayerName(pname)

    // Subscribe to Pusher channel
    const channel = pusherClient.subscribe(`room-${roomId}`)

    channel.bind('player-joined', (data: { players: Player[] }) => {
      setPlayers(data.players)
    })

    channel.bind('game-started', (data: { gameState: GameState; yourPlayerId: string }) => {
      if (data.yourPlayerId === pid) {
        setGameState(data.gameState)
        setStatus('playing')
        setBetAmount(data.gameState.currentStake)
      }
    })

    channel.bind('game-updated', (data: { gameState: GameState }) => {
      setGameState(data.gameState)
      setBetAmount(data.gameState.currentStake)
    })

    channel.bind('game-finished', (data: { winnerName: string; pot: number }) => {
      setWinner({ name: data.winnerName, pot: data.pot })
      setStatus('finished')
    })

    // Fetch initial room state
    fetch(`/api/game/state?roomId=${roomId}&playerId=${pid}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.gameState) {
          setGameState(data.gameState)
          setStatus('playing')
          setBetAmount(data.gameState.currentStake)
        }
      })

    return () => {
      pusherClient.unsubscribe(`room-${roomId}`)
    }
  }, [roomId])

  async function startGame() {
    await fetch('/api/game/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ roomId, playerId }),
    })
  }

  async function sendAction(action: string, amount?: number) {
    await fetch('/api/game/action', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ roomId, playerId, action, amount }),
    })
  }

  function copyInviteLink() {
    navigator.clipboard.writeText(`${window.location.origin}/room/${roomId}`)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const me = gameState?.players.find((p) => p.id === playerId)
  const isMyTurn = gameState?.players[gameState.currentPlayerIndex]?.id === playerId
  const activePlayers = gameState?.players.filter((p) => p.status === 'active') ?? []

  function suitEmoji(suit: string) {
    return suit === 'hearts' ? '♥' : suit === 'diamonds' ? '♦' : suit === 'clubs' ? '♣' : '♠'
  }

  function suitColor(suit: string) {
    return suit === 'hearts' || suit === 'diamonds' ? 'text-red-400' : 'text-white'
  }

  return (
    <main className="min-h-screen bg-green-950 text-white p-4">

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-yellow-400">🃏 Teen Patti</h1>
          <p className="text-green-400 text-sm">Room: <span className="font-mono font-bold">{roomId}</span></p>
        </div>
        <button
          onClick={copyInviteLink}
          className="bg-green-700 hover:bg-green-600 px-4 py-2 rounded-lg text-sm font-medium transition"
        >
          {copied ? '✅ Copied!' : '🔗 Invite Link'}
        </button>
      </div>

      {/* Winner Banner */}
      {winner && (
        <div className="bg-yellow-400 text-green-950 rounded-2xl p-6 text-center mb-6">
          <p className="text-3xl font-bold">🏆 {winner.name} Wins!</p>
          <p className="text-lg mt-1">Pot: {winner.pot} coins</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 bg-green-800 text-white px-6 py-2 rounded-xl font-bold"
          >
            Play Again
          </button>
        </div>
      )}

      {/* Waiting Lobby */}
      {status === 'waiting' && (
        <div className="bg-green-900/60 border border-green-700 rounded-2xl p-6 mb-6">
          <h2 className="text-yellow-400 font-bold text-lg mb-4">
            Waiting for players... ({players.length}/6)
          </h2>
          <div className="space-y-2 mb-6">
            {players.map((p) => (
              <div key={p.id} className="flex items-center gap-3 bg-green-800/40 rounded-lg px-4 py-2">
                <span className="text-green-300">👤</span>
                <span className="font-medium">{p.name}</span>
                {p.isHost && <span className="text-xs bg-yellow-400 text-green-950 px-2 py-0.5 rounded-full font-bold">HOST</span>}
              </div>
            ))}
          </div>
          {players.find((p) => p.id === playerId || p.isHost) && players.length >= 2 && (
            <button
              onClick={startGame}
              className="w-full bg-yellow-400 hover:bg-yellow-300 text-green-950 font-bold py-3 rounded-xl transition"
            >
              🚀 Start Game
            </button>
          )}
          {players.length < 2 && (
            <p className="text-green-400 text-sm text-center">Need at least 2 players to start</p>
          )}
        </div>
      )}

      {/* Game Table */}
      {status === 'playing' && gameState && (
        <div className="space-y-4">

          {/* Pot & Stake */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-green-900/60 border border-green-700 rounded-xl p-4 text-center">
              <p className="text-green-400 text-xs">POT</p>
              <p className="text-yellow-400 font-bold text-2xl">{gameState.pot}</p>
              <p className="text-green-500 text-xs">coins</p>
            </div>
            <div className="bg-green-900/60 border border-green-700 rounded-xl p-4 text-center">
              <p className="text-green-400 text-xs">CURRENT STAKE</p>
              <p className="text-white font-bold text-2xl">{gameState.currentStake}</p>
              <p className="text-green-500 text-xs">coins</p>
            </div>
          </div>

          {/* Last Action */}
          {gameState.lastAction && (
            <div className="bg-green-900/40 border border-green-800 rounded-lg px-4 py-2 text-center text-green-300 text-sm">
              {gameState.lastAction}
            </div>
          )}

          {/* All Players */}
          <div className="grid grid-cols-2 gap-3">
            {gameState.players.map((p) => {
              const isCurrentTurn = gameState.players[gameState.currentPlayerIndex]?.id === p.id
              return (
                <div
                  key={p.id}
                  className={`rounded-xl p-3 border transition ${
                    p.status === 'folded'
                      ? 'bg-gray-900/40 border-gray-700 opacity-50'
                      : p.status === 'winner'
                      ? 'bg-yellow-400/20 border-yellow-400'
                      : isCurrentTurn
                      ? 'bg-green-700/40 border-yellow-400 shadow-lg shadow-yellow-400/20'
                      : 'bg-green-900/40 border-green-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-sm truncate">
                      {p.id === playerId ? '⭐ You' : p.name}
                    </span>
                    {isCurrentTurn && <span className="text-xs text-yellow-400 animate-pulse">▶ Turn</span>}
                  </div>
                  <p className="text-yellow-400 text-sm font-bold">{p.coins} coins</p>
                  <p className={`text-xs mt-1 ${
                    p.status === 'folded' ? 'text-gray-500' :
                    p.type === 'seen' ? 'text-blue-400' : 'text-green-400'
                  }`}>
                    {p.status === 'folded' ? 'Folded' : p.type === 'seen' ? '👁 Seen' : '🙈 Blind'}
                  </p>

                  {/* Show your own cards */}
                  {p.id === playerId && p.cards.length > 0 && (
                    <div className="flex gap-1 mt-2">
                      {p.type === 'seen' ? p.cards.map((card, i) => (
                        <div key={i} className={`bg-white text-xs rounded px-1.5 py-1 font-bold ${suitColor(card.suit)}`}>
                          {card.rank}{suitEmoji(card.suit)}
                        </div>
                      )) : (
                        <div className="text-xs text-green-400">Cards hidden 🙈</div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* Action Panel — only show on your turn */}
          {isMyTurn && me && me.status === 'active' && (
            <div className="bg-green-900/80 border border-yellow-400 rounded-2xl p-4 space-y-3">
              <p className="text-yellow-400 font-bold text-center">Your Turn!</p>

              {/* Bet amount slider */}
              <div>
                <div className="flex justify-between text-xs text-green-400 mb-1">
                  <span>Bet Amount</span>
                  <span className="text-yellow-400 font-bold">{betAmount} coins</span>
                </div>
                <input
                  type="range"
                  min={gameState.currentStake}
                  max={Math.min(me.coins, gameState.currentStake * 4)}
                  value={betAmount}
                  onChange={(e) => setBetAmount(Number(e.target.value))}
                  className="w-full accent-yellow-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                {me.type === 'blind' && (
                  <button
                    onClick={() => sendAction('see_cards')}
                    className="bg-blue-600 hover:bg-blue-500 py-2 rounded-lg text-sm font-bold transition"
                  >
                    👁 See Cards
                  </button>
                )}
                <button
                  onClick={() => sendAction(me.type === 'blind' ? 'blind_bet' : 'bet', betAmount)}
                  className="bg-green-500 hover:bg-green-400 py-2 rounded-lg text-sm font-bold transition"
                >
                  {me.type === 'blind' ? '🙈 Blind Bet' : '💰 Bet'}
                </button>
                {me.type === 'seen' && activePlayers.length === 2 && (
                  <button
                    onClick={() => sendAction('show')}
                    className="bg-yellow-400 hover:bg-yellow-300 text-green-950 py-2 rounded-lg text-sm font-bold transition"
                  >
                    🃏 Show
                  </button>
                )}
                {me.type === 'seen' && activePlayers.length > 2 && (
                  <button
                    onClick={() => sendAction('sideshow')}
                    className="bg-purple-600 hover:bg-purple-500 py-2 rounded-lg text-sm font-bold transition"
                  >
                    🔀 Sideshow
                  </button>
                )}
                <button
                  onClick={() => sendAction('fold')}
                  className="bg-red-600 hover:bg-red-500 py-2 rounded-lg text-sm font-bold transition col-span-full"
                >
                  ❌ Fold
                </button>
              </div>
            </div>
          )}

          {/* Waiting for turn */}
          {!isMyTurn && me?.status === 'active' && (
            <div className="bg-green-900/40 border border-green-700 rounded-xl p-4 text-center text-green-400">
              ⏳ Waiting for {gameState.players[gameState.currentPlayerIndex]?.name}&apos;s turn...
            </div>
          )}

          {/* Folded message */}
          {me?.status === 'folded' && (
            <div className="bg-gray-900/60 border border-gray-700 rounded-xl p-4 text-center text-gray-400">
              You folded this round. Watching the game... 👀
            </div>
          )}
        </div>
      )}
    </main>
  )
}