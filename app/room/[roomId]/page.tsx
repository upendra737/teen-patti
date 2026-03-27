'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import pusherClient from '@/lib/pusher-client'
import { GameState, Player } from '@/lib/types'

export default function RoomPage() {
  const { roomId } = useParams() as { roomId: string }
  const [playerId, setPlayerId] = useState('')
  const [players, setPlayers] = useState<Player[]>([])
  const [gameState, setGameState] = useState<GameState | null>(null)
  const [status, setStatus] = useState<'waiting' | 'playing' | 'finished'>('waiting')
  const [winner, setWinner] = useState<{ name: string; pot: number } | null>(null)
  const [copied, setCopied] = useState(false)
  const [betAmount, setBetAmount] = useState(0)
  const [cardsRevealed, setCardsRevealed] = useState(false)
  const [shuffling, setShuffling] = useState(false)

  useEffect(() => {
    const pid = localStorage.getItem('playerId') ?? ''
    setPlayerId(pid)

    const channel = pusherClient.subscribe(`room-${roomId}`)

    channel.bind('player-joined', (data: { players: Player[] }) => {
      setPlayers(data.players)
    })

    channel.bind('game-started', (data: { gameState: GameState; yourPlayerId: string }) => {
      if (data.yourPlayerId === pid) {
        setShuffling(true)
        setTimeout(() => {
          setShuffling(false)
          setGameState(data.gameState)
          setStatus('playing')
          setBetAmount(data.gameState.currentStake)
          setCardsRevealed(false)
        }, 1500)
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

    fetch(`/api/game/state?roomId=${roomId}&playerId=${pid}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.gameState) {
          setGameState(data.gameState)
          setStatus('playing')
          setBetAmount(data.gameState.currentStake)
        }
      })

    return () => pusherClient.unsubscribe(`room-${roomId}`)
  }, [roomId])

  async function startGame() {
    await fetch('/api/game/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ roomId, playerId }),
    })
  }

  async function sendAction(action: string, amount?: number) {
    const me = gameState?.players.find((p) => p.id === playerId)
    if (!me) return
    // Prevent negative coins
    const safeBet = Math.min(amount ?? 0, me.coins)
    await fetch('/api/game/action', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ roomId, playerId, action, amount: safeBet }),
    })
  }

  async function seeCards() {
    setCardsRevealed(true)
    await sendAction('see_cards')
  }

  function copyInviteLink() {
    navigator.clipboard.writeText(`${window.location.origin}/room/${roomId}`)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const me = gameState?.players.find((p) => p.id === playerId)
  const isMyTurn = gameState?.players[gameState.currentPlayerIndex]?.id === playerId
  const activePlayers = gameState?.players.filter((p) => p.status === 'active') ?? []

  function suitSymbol(suit: string) {
    return suit === 'hearts' ? '♥' : suit === 'diamonds' ? '♦' : suit === 'clubs' ? '♣' : '♠'
  }

  function isRed(suit: string) {
    return suit === 'hearts' || suit === 'diamonds'
  }

  return (
    <main
      className="min-h-screen text-white"
      style={{
        background: 'radial-gradient(ellipse at top, #1a0a2e 0%, #0d0d0d 60%, #0a0a0a 100%)',
        fontFamily: "'Georgia', serif",
      }}
    >
      {/* Shuffling Overlay */}
      {shuffling && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.85)' }}>
          <div className="text-6xl mb-4 animate-bounce">🃏</div>
          <p className="text-yellow-400 text-xl font-bold tracking-widest animate-pulse">Shuffling cards...</p>
        </div>
      )}

      {/* Header */}
      <div
        className="flex items-center justify-between px-6 py-4 border-b"
        style={{ borderColor: '#8B6914', background: 'rgba(0,0,0,0.4)' }}
      >
        <div>
          <h1 className="text-2xl font-bold" style={{ color: '#FFD700', textShadow: '0 0 20px #FFD70066' }}>
            ♠ Teen Patti ♠
          </h1>
          <p className="text-xs mt-0.5" style={{ color: '#8B6914' }}>
            Room: <span className="font-mono font-bold text-yellow-500">{roomId}</span>
          </p>
        </div>
        <button
          type="button"
          onClick={copyInviteLink}
          className="px-4 py-2 rounded-lg text-sm font-bold transition-all"
          style={{
            background: copied ? '#166534' : 'linear-gradient(135deg, #8B6914, #FFD700)',
            color: copied ? '#fff' : '#000',
          }}
        >
          {copied ? '✅ Copied!' : '🔗 Invite'}
        </button>
      </div>

      <div className="px-4 py-4 max-w-lg mx-auto space-y-4">

        {/* Winner Banner */}
        {winner && (
          <div
            className="rounded-2xl p-6 text-center"
            style={{
              background: 'linear-gradient(135deg, #78350f, #92400e)',
              border: '2px solid #FFD700',
              boxShadow: '0 0 40px #FFD70044',
            }}
          >
            <p className="text-5xl mb-2">🏆</p>
            <p className="text-2xl font-bold text-yellow-400">{winner.name} Wins!</p>
            <p className="text-yellow-200 mt-1">{winner.pot} coins collected</p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mt-4 px-6 py-2 rounded-xl font-bold text-black"
              style={{ background: 'linear-gradient(135deg, #FFD700, #FFA500)' }}
            >
              Play Again
            </button>
          </div>
        )}

        {/* Waiting Lobby */}
        {status === 'waiting' && (
          <div
            className="rounded-2xl p-6"
            style={{
              background: 'linear-gradient(135deg, #1a1a2e, #16213e)',
              border: '1px solid #8B6914',
            }}
          >
            <h2 className="text-yellow-400 font-bold text-lg mb-1">Waiting Room</h2>
            <p className="text-gray-400 text-sm mb-4">{players.length}/6 players joined</p>

            <div className="space-y-2 mb-6">
              {players.map((p, i) => (
                <div
                  key={p.id}
                  className="flex items-center gap-3 rounded-xl px-4 py-3"
                  style={{ background: 'rgba(255,215,0,0.05)', border: '1px solid rgba(255,215,0,0.1)' }}
                >
                  <span className="text-2xl">{['♠', '♥', '♦', '♣'][i % 4]}</span>
                  <span className="font-medium flex-1">{p.name}</span>
                  {p.isHost && (
                    <span
                      className="text-xs px-2 py-0.5 rounded-full font-bold"
                      style={{ background: '#FFD700', color: '#000' }}
                    >
                      HOST
                    </span>
                  )}
                </div>
              ))}
            </div>

            {players.find((p) => p.isHost && p.id === playerId) && players.length >= 2 ? (
              <button
                type="button"
                onClick={startGame}
                className="w-full py-3 rounded-xl font-bold text-black text-lg transition-all hover:opacity-90"
                style={{ background: 'linear-gradient(135deg, #FFD700, #FFA500)' }}
              >
                🚀 Start Game
              </button>
            ) : players.length < 2 ? (
              <p className="text-center text-gray-500 text-sm">Need at least 2 players</p>
            ) : (
              <p className="text-center text-yellow-600 text-sm animate-pulse">Waiting for host to start...</p>
            )}
          </div>
        )}

        {/* Game Table */}
        {status === 'playing' && gameState && (
          <div className="space-y-4">

            {/* Pot & Stake */}
            <div
              className="rounded-2xl p-4 flex items-center justify-between"
              style={{
                background: 'linear-gradient(135deg, #1a1a2e, #16213e)',
                border: '1px solid #8B6914',
              }}
            >
              <div className="text-center flex-1">
                <p className="text-xs text-gray-400 uppercase tracking-widest">Pot</p>
                <p className="text-3xl font-bold text-yellow-400">{gameState.pot}</p>
                <p className="text-xs text-gray-500">coins</p>
              </div>
              <div style={{ width: 1, background: '#8B6914', height: 50 }} />
              <div className="text-center flex-1">
                <p className="text-xs text-gray-400 uppercase tracking-widest">Stake</p>
                <p className="text-3xl font-bold text-white">{gameState.currentStake}</p>
                <p className="text-xs text-gray-500">coins</p>
              </div>
              <div style={{ width: 1, background: '#8B6914', height: 50 }} />
              <div className="text-center flex-1">
                <p className="text-xs text-gray-400 uppercase tracking-widest">Round</p>
                <p className="text-3xl font-bold text-purple-400">{gameState.round}</p>
                <p className="text-xs text-gray-500">round</p>
              </div>
            </div>

            {/* Last Action */}
            {gameState.lastAction && (
              <div
                className="rounded-xl px-4 py-2 text-center text-sm"
                style={{ background: 'rgba(255,215,0,0.05)', border: '1px solid rgba(255,215,0,0.15)', color: '#FFD700' }}
              >
                {gameState.lastAction}
              </div>
            )}

            {/* MY CARDS */}
            {me && me.cards.length > 0 && (
              <div
                className="rounded-2xl p-4"
                style={{
                  background: 'linear-gradient(135deg, #1a1a2e, #16213e)',
                  border: '2px solid #FFD700',
                  boxShadow: '0 0 20px #FFD70022',
                }}
              >
                <p className="text-xs text-gray-400 uppercase tracking-widest mb-3">Your Hand</p>
                <div className="flex gap-3 justify-center">
                  {cardsRevealed && me.type === 'seen'
                    ? me.cards.map((card, i) => (
                        <div
                          key={i}
                          className="rounded-xl flex flex-col items-center justify-between p-3 w-20 h-28 shadow-xl"
                          style={{
                            background: 'white',
                            border: '2px solid #e5e7eb',
                            color: isRed(card.suit) ? '#dc2626' : '#111',
                            boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
                            animation: `cardFlip 0.4s ease ${i * 0.15}s both`,
                          }}
                        >
                          <span className="text-lg font-bold self-start leading-none">{card.rank}</span>
                          <span className="text-3xl">{suitSymbol(card.suit)}</span>
                          <span className="text-lg font-bold self-end leading-none rotate-180">{card.rank}</span>
                        </div>
                      ))
                    : [0, 1, 2].map((i) => (
                        <div
                          key={i}
                          className="rounded-xl w-20 h-28 flex items-center justify-center shadow-xl"
                          style={{
                            background: 'linear-gradient(135deg, #1e3a5f, #0f2744)',
                            border: '2px solid #8B6914',
                            boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
                          }}
                        >
                          <span className="text-3xl opacity-40">🂠</span>
                        </div>
                      ))}
                </div>
                {me.type === 'blind' && me.status === 'active' && (
                  <p className="text-center text-gray-500 text-xs mt-3">Click &quot;See Cards&quot; to reveal</p>
                )}
              </div>
            )}

            {/* Players */}
            <div className="grid grid-cols-2 gap-3">
              {gameState.players.map((p) => {
                const isCurrentTurn = gameState.players[gameState.currentPlayerIndex]?.id === p.id
                const isMe = p.id === playerId
                return (
                  <div
                    key={p.id}
                    className="rounded-xl p-3 transition-all"
                    style={{
                      background: p.status === 'folded'
                        ? 'rgba(30,30,30,0.5)'
                        : p.status === 'winner'
                        ? 'rgba(255,215,0,0.1)'
                        : isCurrentTurn
                        ? 'rgba(255,215,0,0.08)'
                        : 'rgba(255,255,255,0.03)',
                      border: p.status === 'winner'
                        ? '2px solid #FFD700'
                        : isCurrentTurn
                        ? '1.5px solid #FFD700'
                        : '1px solid rgba(139,105,20,0.3)',
                      opacity: p.status === 'folded' ? 0.4 : 1,
                      boxShadow: isCurrentTurn ? '0 0 15px rgba(255,215,0,0.15)' : 'none',
                    }}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-bold truncate" style={{ color: isMe ? '#FFD700' : '#fff' }}>
                        {isMe ? '⭐ You' : p.name}
                      </span>
                      {isCurrentTurn && (
                        <span className="text-xs animate-pulse" style={{ color: '#FFD700' }}>▶</span>
                      )}
                    </div>
                    <p className="text-yellow-400 text-sm font-bold">{Math.max(0, p.coins)} coins</p>
                    <div className="flex items-center gap-1 mt-1">
                      {p.status === 'folded' ? (
                        <span className="text-xs text-gray-500">Folded</span>
                      ) : p.status === 'winner' ? (
                        <span className="text-xs text-yellow-400">🏆 Winner</span>
                      ) : p.type === 'seen' ? (
                        <span className="text-xs text-blue-400">👁 Seen</span>
                      ) : (
                        <span className="text-xs text-gray-400">🙈 Blind</span>
                      )}
                    </div>
                    {/* Card backs for other players */}
                    {!isMe && p.status === 'active' && (
                      <div className="flex gap-1 mt-2">
                        {[0, 1, 2].map((i) => (
                          <div
                            key={i}
                            className="w-5 h-7 rounded"
                            style={{
                              background: 'linear-gradient(135deg, #1e3a5f, #0f2744)',
                              border: '1px solid #8B6914',
                            }}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            {/* Action Panel */}
            {isMyTurn && me && me.status === 'active' && (
              <div
                className="rounded-2xl p-4 space-y-3"
                style={{
                  background: 'linear-gradient(135deg, #1a1a2e, #16213e)',
                  border: '2px solid #FFD700',
                  boxShadow: '0 0 30px rgba(255,215,0,0.1)',
                }}
              >
                <p className="text-center font-bold text-lg" style={{ color: '#FFD700' }}>
                  ✨ Your Turn
                </p>

                {/* Bet Slider */}
                <div>
                  <div className="flex justify-between text-xs mb-2" style={{ color: '#8B6914' }}>
                    <span>Bet Amount</span>
                    <span className="font-bold text-yellow-400">{Math.min(betAmount, me.coins)} coins</span>
                  </div>
                  <input
                    type="range"
                    min={gameState.currentStake}
                    max={Math.max(gameState.currentStake, Math.min(me.coins, gameState.currentStake * 4))}
                    value={Math.min(betAmount, me.coins)}
                    onChange={(e) => setBetAmount(Number(e.target.value))}
                    className="w-full"
                    style={{ accentColor: '#FFD700' }}
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {me.type === 'blind' && (
                    <button
                      type="button"
                      onClick={seeCards}
                      className="py-3 rounded-xl text-sm font-bold transition-all hover:opacity-90"
                      style={{ background: 'linear-gradient(135deg, #1d4ed8, #3b82f6)', color: '#fff' }}
                    >
                      👁 See Cards
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => sendAction(me.type === 'blind' ? 'blind_bet' : 'bet', Math.min(betAmount, me.coins))}
                    className="py-3 rounded-xl text-sm font-bold transition-all hover:opacity-90"
                    style={{ background: 'linear-gradient(135deg, #166534, #16a34a)', color: '#fff' }}
                  >
                    {me.type === 'blind' ? '🙈 Blind Bet' : '💰 Bet'}
                  </button>
                  {me.type === 'seen' && activePlayers.length === 2 && (
                    <button
                      type="button"
                      onClick={() => sendAction('show')}
                      className="py-3 rounded-xl text-sm font-bold transition-all hover:opacity-90"
                      style={{ background: 'linear-gradient(135deg, #FFD700, #FFA500)', color: '#000' }}
                    >
                      🃏 Show
                    </button>
                  )}
                  {me.type === 'seen' && activePlayers.length > 2 && (
                    <button
                      type="button"
                      onClick={() => sendAction('sideshow')}
                      className="py-3 rounded-xl text-sm font-bold transition-all hover:opacity-90"
                      style={{ background: 'linear-gradient(135deg, #6d28d9, #8b5cf6)', color: '#fff' }}
                    >
                      🔀 Sideshow
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => sendAction('fold')}
                    className="py-3 rounded-xl text-sm font-bold transition-all hover:opacity-90 col-span-full"
                    style={{ background: 'linear-gradient(135deg, #991b1b, #dc2626)', color: '#fff' }}
                  >
                    ❌ Fold
                  </button>
                </div>
              </div>
            )}

            {/* Waiting */}
            {!isMyTurn && me?.status === 'active' && (
              <div
                className="rounded-xl p-4 text-center text-sm"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(139,105,20,0.3)', color: '#8B6914' }}
              >
                ⏳ Waiting for <span className="text-yellow-500 font-bold">{gameState.players[gameState.currentPlayerIndex]?.name}</span> to play...
              </div>
            )}

            {/* Folded */}
            {me?.status === 'folded' && (
              <div
                className="rounded-xl p-4 text-center text-sm text-gray-500"
                style={{ background: 'rgba(30,30,30,0.5)', border: '1px solid rgba(75,75,75,0.3)' }}
              >
                You folded. Watching the game... 👀
              </div>
            )}
          </div>
        )}
      </div>

      <style>{`
        @keyframes cardFlip {
          from { transform: rotateY(90deg) scale(0.8); opacity: 0; }
          to { transform: rotateY(0deg) scale(1); opacity: 1; }
        }
      `}</style>
    </main>
  )
}