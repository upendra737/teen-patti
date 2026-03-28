'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import pusherClient from '@/lib/pusher-client'
import { GameState, Player, Card } from '@/lib/types'

export default function RoomPage() {
  const { roomId } = useParams() as { roomId: string }
  const [playerId, setPlayerId] = useState('')
  const [players, setPlayers] = useState<Player[]>([])
  const [gameState, setGameState] = useState<GameState | null>(null)
  const [myCards, setMyCards] = useState<Card[]>([])
  const [status, setStatus] = useState<'waiting' | 'playing' | 'finished'>('waiting')
  const [winner, setWinner] = useState<{ name: string; pot: number; allPlayers: Player[] } | null>(null)
  const [copied, setCopied] = useState(false)
  const [betAmount, setBetAmount] = useState(0)
  const [cardsRevealed, setCardsRevealed] = useState(false)
  const [shuffling, setShuffling] = useState(false)

  useEffect(() => {
    const pid = localStorage.getItem('playerId') ?? ''
    const pname = localStorage.getItem('playerName') ?? ''
    setPlayerId(pid)

    setTimeout(() => {
  fetch(`/api/room/join`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ roomId, playerName: pname, rejoin: true }),
  })
    .then((r) => r.json())
    .then((data) => {
      if (data.players) setPlayers(data.players)
      if (data.status === 'playing') {
        fetch(`/api/game/state?roomId=${roomId}&playerId=${pid}`)
          .then((r) => r.json())
          .then((d) => {
            if (d.gameState) {
              setGameState(d.gameState)
              setStatus('playing')
              setBetAmount(d.gameState.currentStake)
              const me = d.gameState.players.find((p: Player) => p.id === pid)
              if (me?.cards?.length) setMyCards(me.cards)
            }
          })
      }
    })
    .catch(() => {
      console.log('Room not ready yet')
    })
}, 1000)

    const channel = pusherClient.subscribe(`room-${roomId}`)

    channel.bind('player-joined', (data: { players: Player[] }) => {
      setPlayers(data.players)
    })

    channel.bind('game-started', (data: {
      gameState: GameState
      yourPlayerId: string
      yourCards: Card[]
    }) => {
      if (data.yourPlayerId === pid) {
        setShuffling(true)
        setTimeout(() => {
          setShuffling(false)
          setMyCards(data.yourCards)
          setGameState(data.gameState)
          setStatus('playing')
          setBetAmount(data.gameState.currentStake)
          setCardsRevealed(false)
        }, 2000)
      }
    })

    channel.bind('game-updated', (data: { gameState: GameState; forPlayerId: string }) => {
      if (data.forPlayerId === pid) {
        setGameState(data.gameState)
        setBetAmount(data.gameState.currentStake)
        const me = data.gameState.players.find((p) => p.id === pid)
        if (me?.cards?.length) setMyCards(me.cards)
      }
    })

    channel.bind('game-finished', (data: {
      gameState: GameState
      winnerName: string
      pot: number
    }) => {
      setGameState(data.gameState)
      setWinner({
        name: data.winnerName,
        pot: data.pot,
        allPlayers: data.gameState.players,
      })
      setStatus('finished')
    })

    return () => pusherClient.unsubscribe(`room-${roomId}`)
  }, [roomId])

  async function startGame() {
    const pid = localStorage.getItem('playerId') ?? ''
    await fetch('/api/game/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ roomId, playerId: pid }),
    })
  }

  async function sendAction(action: string, amount?: number) {
    const me = gameState?.players.find((p) => p.id === playerId)
    if (!me) return
    const safeBet = Math.min(amount ?? gameState?.currentStake ?? 0, me.coins)
    await fetch('/api/game/action', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ roomId, playerId, action, amount: safeBet }),
    })
  }

  function seeCards() {
    setCardsRevealed(true)
    sendAction('see_cards')
  }

  function copyInviteLink() {
    navigator.clipboard.writeText(`${window.location.origin}/room/${roomId}`)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function suitSymbol(suit: string) {
    return suit === 'hearts' ? '♥' : suit === 'diamonds' ? '♦' : suit === 'clubs' ? '♣' : '♠'
  }

  function isRed(suit: string) {
    return suit === 'hearts' || suit === 'diamonds'
  }

  const me = gameState?.players.find((p) => p.id === playerId)
  const isMyTurn = gameState?.players[gameState.currentPlayerIndex]?.id === playerId
  const activePlayers = gameState?.players.filter((p) => p.status === 'active') ?? []

  function CardFace({ card, index }: { card: Card; index: number }) {
    return (
      <div
        className="rounded-xl flex flex-col items-center justify-between p-2 shadow-xl"
        style={{
          width: 70,
          height: 100,
          background: 'white',
          border: '2px solid #e5e7eb',
          color: isRed(card.suit) ? '#dc2626' : '#111',
          boxShadow: '0 8px 24px rgba(0,0,0,0.6)',
          animation: `cardFlip 0.5s ease ${index * 0.15}s both`,
        }}
      >
        <span className="text-base font-black self-start leading-none">{card.rank}</span>
        <span className="text-4xl leading-none">{suitSymbol(card.suit)}</span>
        <span className="text-base font-black self-end leading-none" style={{ transform: 'rotate(180deg)' }}>
          {card.rank}
        </span>
      </div>
    )
  }

  function CardBack() {
    return (
      <div
        className="rounded-xl flex items-center justify-center shadow-xl"
        style={{
          width: 70,
          height: 100,
          background: 'linear-gradient(135deg, #1e3a8a, #1e3a5f)',
          border: '2px solid #8B6914',
          boxShadow: '0 8px 24px rgba(0,0,0,0.6)',
        }}
      >
        <div style={{
          width: 54,
          height: 84,
          borderRadius: 8,
          border: '2px solid rgba(255,215,0,0.3)',
          background: 'repeating-linear-gradient(45deg, rgba(255,215,0,0.05) 0px, rgba(255,215,0,0.05) 2px, transparent 2px, transparent 8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <span style={{ color: 'rgba(255,215,0,0.4)', fontSize: 20 }}>♠</span>
        </div>
      </div>
    )
  }

  return (
    <main
      className="min-h-screen text-white pb-8"
      style={{
        background: 'radial-gradient(ellipse at top, #1a0a2e 0%, #0d0d0d 60%, #0a0a0a 100%)',
        fontFamily: "'Georgia', serif",
      }}
    >
      {/* Shuffling Overlay */}
      {shuffling && (
        <div
          className="fixed inset-0 z-50 flex flex-col items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.92)' }}
        >
          <div className="flex gap-3 mb-6">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                style={{
                  width: 60,
                  height: 84,
                  borderRadius: 8,
                  background: 'linear-gradient(135deg, #1e3a8a, #1e3a5f)',
                  border: '2px solid #FFD700',
                  animation: `shuffle 0.6s ease ${i * 0.2}s infinite alternate`,
                }}
              />
            ))}
          </div>
          <p className="text-yellow-400 text-xl font-bold tracking-widest animate-pulse">
            Dealing cards...
          </p>
        </div>
      )}

      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-4 border-b sticky top-0 z-40"
        style={{ borderColor: '#8B6914', background: 'rgba(10,10,10,0.95)' }}
      >
        <div>
          <h1 className="text-xl font-bold" style={{ color: '#FFD700' }}>♠ Teen Patti ♠</h1>
          <p className="text-xs" style={{ color: '#8B6914' }}>
            Room: <span className="font-mono text-yellow-500">{roomId}</span>
          </p>
        </div>
        <button
          type="button"
          onClick={copyInviteLink}
          className="px-3 py-2 rounded-lg text-sm font-bold"
          style={{
            background: copied ? '#166534' : 'linear-gradient(135deg, #8B6914, #FFD700)',
            color: copied ? '#fff' : '#000',
          }}
        >
          {copied ? '✅ Copied!' : '🔗 Invite'}
        </button>
      </div>

      <div className="px-4 py-4 max-w-lg mx-auto space-y-4">

        {/* Winner Screen */}
        {status === 'finished' && winner && (
          <div
            className="rounded-2xl p-6"
            style={{
              background: 'linear-gradient(135deg, #78350f, #1a1a2e)',
              border: '2px solid #FFD700',
              boxShadow: '0 0 60px #FFD70033',
            }}
          >
            <p className="text-center text-5xl mb-3">🏆</p>
            <p className="text-center text-2xl font-bold text-yellow-400 mb-1">{winner.name} Wins!</p>
            <p className="text-center text-yellow-200 mb-6">{winner.pot} coins collected</p>

            {/* Show all cards at end */}
            <div className="space-y-3 mb-6">
              {winner.allPlayers.filter(p => p.cards.length > 0).map((p) => (
                <div key={p.id}
                  className="rounded-xl p-3"
                  style={{
                    background: p.id === winner.allPlayers.find(x => x.status === 'winner')?.id
                      ? 'rgba(255,215,0,0.1)' : 'rgba(255,255,255,0.03)',
                    border: p.status === 'winner' ? '1px solid #FFD700' : '1px solid rgba(255,255,255,0.1)',
                  }}
                >
                  <p className="text-sm font-bold mb-2" style={{ color: p.status === 'winner' ? '#FFD700' : '#aaa' }}>
                    {p.name} {p.status === 'winner' ? '🏆' : p.status === 'folded' ? '(folded)' : ''}
                  </p>
                  <div className="flex gap-2">
                    {p.cards.map((card, i) => (
                      <CardFace key={i} card={card} index={i} />
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={() => { window.location.href = '/' }}
              className="w-full py-3 rounded-xl font-bold text-black"
              style={{ background: 'linear-gradient(135deg, #FFD700, #FFA500)' }}
            >
              🏠 New Game
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
                  style={{
                    background: 'rgba(255,215,0,0.05)',
                    border: '1px solid rgba(255,215,0,0.1)',
                  }}
                >
                  <span className="text-xl">{['♠', '♥', '♦', '♣'][i % 4]}</span>
                  <span className="font-medium flex-1">{p.name}</span>
                  {p.isHost && (
                    <span className="text-xs px-2 py-0.5 rounded-full font-bold"
                      style={{ background: '#FFD700', color: '#000' }}>
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
                className="w-full py-3 rounded-xl font-bold text-black text-lg"
                style={{ background: 'linear-gradient(135deg, #FFD700, #FFA500)' }}
              >
                🚀 Start Game
              </button>
            ) : players.length < 2 ? (
              <p className="text-center text-gray-500 text-sm">Need at least 2 players</p>
            ) : (
              <p className="text-center text-yellow-600 text-sm animate-pulse">
                Waiting for host to start...
              </p>
            )}
          </div>
        )}

        {/* Game Playing */}
        {status === 'playing' && gameState && (
          <div className="space-y-4">

            {/* Pot / Stake / Round */}
            <div
              className="rounded-2xl p-4 grid grid-cols-3 gap-2 text-center"
              style={{
                background: 'linear-gradient(135deg, #1a1a2e, #16213e)',
                border: '1px solid #8B6914',
              }}
            >
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-widest">Pot</p>
                <p className="text-2xl font-bold text-yellow-400">{gameState.pot}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-widest">Stake</p>
                <p className="text-2xl font-bold text-white">{gameState.currentStake}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-widest">Round</p>
                <p className="text-2xl font-bold text-purple-400">{gameState.round}</p>
              </div>
            </div>

            {/* Last Action */}
            {gameState.lastAction && (
              <div
                className="rounded-xl px-4 py-2 text-center text-sm"
                style={{
                  background: 'rgba(255,215,0,0.05)',
                  border: '1px solid rgba(255,215,0,0.15)',
                  color: '#FFD700',
                }}
              >
                {gameState.lastAction}
              </div>
            )}

            {/* MY CARDS */}
            {myCards.length > 0 && (
              <div
                className="rounded-2xl p-4"
                style={{
                  background: 'linear-gradient(135deg, #1a1a2e, #16213e)',
                  border: `2px solid ${cardsRevealed ? '#FFD700' : '#8B6914'}`,
                  boxShadow: cardsRevealed ? '0 0 30px #FFD70033' : 'none',
                }}
              >
                <p className="text-xs text-gray-400 uppercase tracking-widest mb-3">
                  Your Hand {me?.type === 'seen' ? '👁 (Seen)' : '🙈 (Blind)'}
                </p>
                <div className="flex gap-3 justify-center mb-3">
                  {cardsRevealed
                    ? myCards.map((card, i) => <CardFace key={i} card={card} index={i} />)
                    : myCards.map((_, i) => <CardBack key={i} />)
                  }
                </div>
                {!cardsRevealed && me?.status === 'active' && (
                  <button
                    type="button"
                    onClick={seeCards}
                    className="w-full py-2 rounded-xl text-sm font-bold mt-1"
                    style={{ background: 'linear-gradient(135deg, #1d4ed8, #3b82f6)', color: '#fff' }}
                  >
                    👁 Reveal My Cards
                  </button>
                )}
              </div>
            )}

            {/* All Players */}
            <div className="grid grid-cols-2 gap-3">
              {gameState.players.map((p) => {
                const isCurrentTurn = gameState.players[gameState.currentPlayerIndex]?.id === p.id
                const isMe = p.id === playerId
                return (
                  <div
                    key={p.id}
                    className="rounded-xl p-3"
                    style={{
                      background: p.status === 'folded'
                        ? 'rgba(20,20,20,0.8)'
                        : p.status === 'winner'
                        ? 'rgba(255,215,0,0.1)'
                        : isCurrentTurn
                        ? 'rgba(255,215,0,0.07)'
                        : 'rgba(255,255,255,0.03)',
                      border: p.status === 'winner'
                        ? '2px solid #FFD700'
                        : isCurrentTurn
                        ? '2px solid #FFD700'
                        : '1px solid rgba(139,105,20,0.3)',
                      opacity: p.status === 'folded' ? 0.5 : 1,
                      boxShadow: isCurrentTurn ? '0 0 20px rgba(255,215,0,0.2)' : 'none',
                    }}
                  >
                    <div className="flex justify-between items-start mb-1">
                      <span
                        className="text-sm font-bold truncate"
                        style={{ color: isMe ? '#FFD700' : '#fff' }}
                      >
                        {isMe ? '⭐ You' : p.name}
                      </span>
                      {isCurrentTurn && (
                        <span className="text-yellow-400 text-xs animate-pulse">▶ Turn</span>
                      )}
                    </div>
                    <p className="text-yellow-400 text-sm font-bold">
                      {Math.max(0, p.coins)} coins
                    </p>
                    <p className="text-xs mt-1" style={{
                      color: p.status === 'folded' ? '#4b5563'
                        : p.status === 'winner' ? '#FFD700'
                        : p.type === 'seen' ? '#60a5fa' : '#6b7280'
                    }}>
                      {p.status === 'folded' ? '❌ Folded'
                        : p.status === 'winner' ? '🏆 Winner'
                        : p.type === 'seen' ? '👁 Seen' : '🙈 Blind'}
                    </p>
                    {/* Card backs for other active players */}
                    {!isMe && p.status === 'active' && (
                      <div className="flex gap-1 mt-2">
                        {[0, 1, 2].map((i) => (
                          <div key={i} style={{
                            width: 18, height: 26, borderRadius: 3,
                            background: 'linear-gradient(135deg, #1e3a8a, #1e3a5f)',
                            border: '1px solid #8B6914',
                          }} />
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
                  boxShadow: '0 0 40px rgba(255,215,0,0.15)',
                }}
              >
                <p className="text-center font-bold text-xl" style={{ color: '#FFD700' }}>
                  ✨ Your Turn!
                </p>

                {/* Bet slider */}
                <div
                  className="rounded-xl p-3"
                  style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(139,105,20,0.3)' }}
                >
                  <div className="flex justify-between text-xs mb-2">
                    <span style={{ color: '#8B6914' }}>Bet Amount</span>
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
                  <div className="flex justify-between text-xs mt-1" style={{ color: '#4b5563' }}>
                    <span>Min: {gameState.currentStake}</span>
                    <span>Max: {Math.min(me.coins, gameState.currentStake * 4)}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {me.type === 'blind' && !cardsRevealed && (
                    <button type="button" onClick={seeCards}
                      className="py-3 rounded-xl text-sm font-bold col-span-full"
                      style={{ background: 'linear-gradient(135deg, #1d4ed8, #3b82f6)', color: '#fff' }}
                    >
                      👁 See Cards First
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => sendAction(me.type === 'blind' ? 'blind_bet' : 'bet', Math.min(betAmount, me.coins))}
                    className="py-3 rounded-xl text-sm font-bold"
                    style={{ background: 'linear-gradient(135deg, #166534, #16a34a)', color: '#fff' }}
                  >
                    {me.type === 'blind' ? '🙈 Blind Bet' : '💰 Bet'}
                  </button>
                  {me.type === 'seen' && activePlayers.length === 2 && (
                    <button type="button" onClick={() => sendAction('show')}
                      className="py-3 rounded-xl text-sm font-bold"
                      style={{ background: 'linear-gradient(135deg, #FFD700, #FFA500)', color: '#000' }}
                    >
                      🃏 Show Hand
                    </button>
                  )}
                  {me.type === 'seen' && activePlayers.length > 2 && (
                    <button type="button" onClick={() => sendAction('sideshow')}
                      className="py-3 rounded-xl text-sm font-bold"
                      style={{ background: 'linear-gradient(135deg, #6d28d9, #8b5cf6)', color: '#fff' }}
                    >
                      🔀 Sideshow
                    </button>
                  )}
                  <button type="button" onClick={() => sendAction('fold')}
                    className="py-3 rounded-xl text-sm font-bold col-span-full"
                    style={{ background: 'linear-gradient(135deg, #991b1b, #dc2626)', color: '#fff' }}
                  >
                    ❌ Fold
                  </button>
                </div>
              </div>
            )}

            {/* Waiting for turn */}
            {!isMyTurn && me?.status === 'active' && (
              <div
                className="rounded-xl p-4 text-center text-sm"
                style={{
                  background: 'rgba(255,255,255,0.02)',
                  border: '1px solid rgba(139,105,20,0.2)',
                  color: '#8B6914',
                }}
              >
                ⏳ Waiting for{' '}
                <span className="font-bold text-yellow-500">
                  {gameState.players[gameState.currentPlayerIndex]?.name}
                </span>{' '}
                to play...
              </div>
            )}

            {/* Folded */}
            {me?.status === 'folded' && (
              <div
                className="rounded-xl p-4 text-center text-gray-500 text-sm"
                style={{ background: 'rgba(20,20,20,0.6)', border: '1px solid rgba(75,75,75,0.3)' }}
              >
                You folded this round. Watching... 👀
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
        @keyframes shuffle {
          from { transform: translateY(0px) rotate(-5deg); }
          to { transform: translateY(-15px) rotate(5deg); }
        }
      `}</style>
    </main>
  )
}