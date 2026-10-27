import { useCallback, useEffect, useMemo, useState } from 'react'
import { ArrowLeft, Check, Clock3, Crown, Copy, Gamepad2, Loader2, Sparkles, Trophy, Users } from 'lucide-react'
import type { PublicRoom } from '../game/types'
import '../game/trivia.css'

const PLAYER_KEY = 'quiz-royale-player-id'
type ApiResult = { room?: PublicRoom; playerId?: string; error?: string }
const getPlayerId = () => {
  let id = localStorage.getItem(PLAYER_KEY)
  if (!id) { id = crypto.randomUUID(); localStorage.setItem(PLAYER_KEY, id) }
  return id
}
async function request(action: string, payload: Record<string, unknown> = {}): Promise<ApiResult> {
  const query = new URLSearchParams({ code: String(payload.code || ''), playerId: getPlayerId() })
  const response = await fetch(action === 'poll' ? `/.netlify/functions/game?${query.toString()}` : '/.netlify/functions/game', {
    method: action === 'poll' ? 'GET' : 'POST',
    headers: action === 'poll' ? undefined : { 'content-type': 'application/json' },
    body: action === 'poll' ? undefined : JSON.stringify({ ...payload, action, playerId: getPlayerId() }),
    ...(action === 'poll' ? {} : {}),
  })
  const data = await response.json() as ApiResult
  if (!response.ok) throw new Error(data.error || 'Could not reach the game server.')
  return data
}

export function TriviaGame() {
  const [name, setName] = useState(localStorage.getItem('quiz-royale-name') || '')
  const [code, setCode] = useState(new URLSearchParams(window.location.search).get('room')?.toUpperCase() || '')
  const [room, setRoom] = useState<PublicRoom | null>(null)
  const [playerId, setPlayerId] = useState(getPlayerId())
  const [screen, setScreen] = useState<'home' | 'room'>('home')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [now, setNow] = useState(Date.now())
  const [copied, setCopied] = useState(false)
  const [showRules, setShowRules] = useState(false)

  const sync = useCallback(async (roomCode: string, quiet = false) => {
    try {
      const result = await request('poll', { code: roomCode })
      setRoom(result.room || null)
      setScreen('room')
      setError('')
    } catch (err) { if (!quiet) setError(err instanceof Error ? err.message : 'Could not load the room.') }
  }, [])
  const act = useCallback(async (action: string, payload: Record<string, unknown> = {}) => {
    setBusy(true); setError('')
    try {
      const result = await request(action, { ...payload, code: room?.code || code, name: name.trim() })
      if (result.playerId) { localStorage.setItem(PLAYER_KEY, result.playerId); setPlayerId(result.playerId) }
      if (result.room) { setRoom(result.room); setScreen('room'); setCode(result.room.code) }
      if (name.trim()) localStorage.setItem('quiz-royale-name', name.trim())
    } catch (err) { setError(err instanceof Error ? err.message : 'Something went wrong.') }
    finally { setBusy(false) }
  }, [code, name, room?.code])

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 200)
    return () => window.clearInterval(timer)
  }, [])
  useEffect(() => {
    if (screen !== 'room' || !room?.code) return
    const timer = window.setInterval(() => void sync(room.code, true), 1000)
    return () => window.clearInterval(timer)
  }, [room?.code, screen, sync])

  const me = room?.players.find((player) => player.id === playerId)
  const isHost = room?.hostId === playerId
  const secondsLeft = room?.questionEndsAt ? Math.max(0, Math.ceil((room.questionEndsAt - now) / 1000)) : 0
  const answeredCount = room?.players.filter((player) => player.hasAnswered).length || 0
  const scoreboard = useMemo(() => [...(room?.players || [])].sort((a, b) => b.score - a.score), [room?.players])
  const isRevealing = Boolean(room?.question?.answer !== undefined && room.status === 'playing')
  const round = (room?.questionIndex || 0) + 1

  async function createRoom() { if (!name.trim()) { setError('Enter your name first.'); return } await act('create') }
  async function joinRoom() { if (!name.trim()) { setError('Enter your name first.'); return } if (code.trim().length !== 5) { setError('Room codes have 5 characters.'); return } await act('join', { code: code.toUpperCase() }) }
  async function copyInvite() {
    if (!room) return
    const invite = `${window.location.origin}/game?room=${room.code}`
    await navigator.clipboard.writeText(invite).catch(() => undefined)
    setCopied(true); window.setTimeout(() => setCopied(false), 1800)
  }
  function leaveRoom() { setRoom(null); setScreen('home'); setError(''); setCode(''); window.history.replaceState({}, '', '/game') }

  if (screen === 'home' || !room) return (
    <main className="qr-app qr-home">
      <header className="qr-topbar"><a className="qr-brand" href="/"><span className="qr-brand-mark"><Gamepad2 size={20} /></span> PLAYROOM</a><button className="qr-help" onClick={() => setShowRules(!showRules)}>How to play</button></header>
      <div className="qr-hero">
        <div className="qr-hero-copy"><div className="qr-eyebrow"><span className="qr-live-dot" /> FRIENDS, FAMILY & BIG BRAINS</div><h1>Quiz <span>Royale</span></h1><p>Three quick rounds. One room full of rivals. Find out who really knows it all.</p><div className="qr-hero-pills"><span><Users size={14} /> 2–8 players</span><span><Clock3 size={14} /> 3 rounds</span><span><Sparkles size={14} /> No sign-up</span></div></div>
        <div className="qr-join-card"><div className="qr-card-icon"><Trophy size={21} /></div><h2>Ready to play?</h2><p>Pick a name, then create a room or join a friend.</p><label className="qr-label" htmlFor="player-name">YOUR NAME</label><input id="player-name" className="qr-input" maxLength={18} placeholder="e.g. Quiz wizard" value={name} onChange={(event) => setName(event.target.value)} onKeyDown={(event) => event.key === 'Enter' && void createRoom()} />
          <button className="qr-button qr-button-primary" disabled={busy} onClick={() => void createRoom()}>{busy ? <Loader2 className="qr-spin" size={18} /> : <Sparkles size={17} />} Create a room</button>
          <div className="qr-or"><span />OR<span /></div><div className="qr-join-row"><input className="qr-input qr-code-input" aria-label="5-character room code" maxLength={5} placeholder="ROOM CODE" value={code} onChange={(event) => setCode(event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))} onKeyDown={(event) => event.key === 'Enter' && void joinRoom()} /><button className="qr-button qr-button-dark" disabled={busy} onClick={() => void joinRoom()}>{busy ? 'Joining…' : 'Join'}</button></div>
          {error && <div className="qr-error" role="alert">{error}</div>}
          {showRules && <div className="qr-rules"><strong>How to win</strong><p>Answer 3 trivia questions. Each correct answer earns 100 points plus up to 50 bonus points for speed. Highest score wins. You have 15 seconds per question.</p></div>}
        </div>
      </div>
      <footer className="qr-footnote">Make a room, share the code, and let the showdown begin.</footer>
    </main>
  )

  return <main className="qr-app qr-game-screen">
    <header className="qr-topbar"><button className="qr-brand qr-brand-button" onClick={leaveRoom}><ArrowLeft size={17} /> <span className="qr-brand-mark"><Gamepad2 size={20} /></span> PLAYROOM</button><div className="qr-top-actions"><span className="qr-code-label">ROOM <b>{room.code}</b></span><button className="qr-copy-button" onClick={() => void copyInvite()}><Copy size={15} /> {copied ? 'Copied!' : 'Invite'}</button></div></header>
    {room.status === 'lobby' ? <section className="qr-lobby"><div className="qr-lobby-card"><div className="qr-status"><span className="qr-live-dot" /> WAITING ROOM</div><h1>Bring your <span>brain trust.</span></h1><p className="qr-lobby-intro">Share this room code with your crew. The game starts when everyone is in.</p><button className="qr-room-code" onClick={() => void copyInvite()} aria-label="Copy room code">{room.code}<Copy size={17} /></button><div className="qr-players-head"><span><Users size={17} /> Players in the room</span><b>{room.players.length} / 8</b></div><div className="qr-player-grid">{room.players.map((player, index) => <div className="qr-player-chip" key={player.id}><span className={`qr-avatar qr-avatar-${index % 5}`}>{player.name.slice(0, 1).toUpperCase()}</span><span>{player.name}{player.id === room.hostId && <small>HOST</small>}</span>{player.id === playerId && <Check size={16} className="qr-ready-check" />}</div>)}</div>{room.players.length < 2 && <p className="qr-waiting-note"><span className="qr-live-dot" /> Waiting for one more player…</p>}{isHost ? <button className="qr-button qr-button-primary qr-start" disabled={busy || room.players.length < 2} onClick={() => void act('start')}>{busy ? <Loader2 className="qr-spin" size={18} /> : <Sparkles size={17} />} Start the game</button> : <div className="qr-wait-host">The host will start the game soon.</div>}{error && <div className="qr-error" role="alert">{error}</div>}</div></section> : room.status === 'finished' ? <section className="qr-finish"><div className="qr-finish-card"><div className="qr-trophy-big"><Trophy size={34} /></div><div className="qr-status">THAT'S A WRAP</div><h1>We have a <span>winner!</span></h1><div className="qr-winner-banner"><Crown size={20} /><span>{scoreboard[0]?.name || 'Player'}</span><b>{scoreboard[0]?.score || 0} pts</b></div><div className="qr-score-list">{scoreboard.map((player, index) => <div className="qr-score-row" key={player.id}><b className="qr-rank">{String(index + 1).padStart(2, '0')}</b><span>{player.name}</span><strong>{player.score}</strong></div>)}</div><button className="qr-button qr-button-primary qr-start" onClick={leaveRoom}>Back to home</button></div></section> : <section className="qr-live-game"><div className="qr-round-strip"><div><span>ROUND</span><strong>0{round}<i> / 03</i></strong></div><div className="qr-progress"><span style={{ width: `${(round / 3) * 100}%` }} /></div><div className={`qr-timer ${secondsLeft <= 5 ? 'qr-timer-urgent' : ''}`}><Clock3 size={16} /><strong>{String(secondsLeft).padStart(2, '0')}<small>s</small></strong></div></div><div className="qr-game-grid"><section className="qr-question-panel"><div className="qr-status"><span className="qr-live-dot" /> {isRevealing ? 'ANSWER REVEALED' : 'LOCK IN YOUR ANSWER'}</div><div className="qr-category">{room.question?.category || 'TRIVIA'}</div><h1>{room.question?.prompt}</h1><div className="qr-options">{room.question?.options.map((option, index) => { const selected = me?.answer === index; const correct = room.question?.answer === index; const cls = isRevealing ? correct ? 'qr-option-correct' : selected ? 'qr-option-wrong' : '' : selected ? 'qr-option-selected' : ''; return <button key={`${round}-${index}`} className={`qr-option ${cls}`} disabled={busy || me?.answer !== null || isRevealing || secondsLeft <= 0} onClick={() => void act('answer', { answer: index })}><span className="qr-option-letter">{String.fromCharCode(65 + index)}</span><span>{option}</span>{isRevealing && correct && <Check size={18} />}{selected && !correct && isRevealing && <span>✕</span>}</button> })}</div><div className="qr-answer-status">{isRevealing ? <><Check size={15} /> Correct answer revealed. {isHost ? 'Next round starts shortly.' : 'Waiting for the host…'}</> : me?.answer !== null ? <><Check size={15} /> Answer locked in! Waiting for everyone else ({answeredCount}/{room.players.length}).</> : <><Clock3 size={15} /> {secondsLeft > 0 ? `${answeredCount} of ${room.players.length} answered` : 'Time is up! Revealing the answer…'}</>}</div>{error && <div className="qr-error" role="alert">{error}</div>}{isHost && isRevealing && <button className="qr-button qr-button-primary qr-next" disabled={busy || now < (room.revealUntil || 0)} onClick={() => void act('advance')}>{round === 3 ? 'Show final scores' : 'Next question'} →</button>}</section><aside className="qr-scoreboard"><div className="qr-scoreboard-title"><span><Trophy size={16} /> SCOREBOARD</span><span>{room.players.length} PLAYERS</span></div>{scoreboard.map((player) => <div className={`qr-mini-score ${player.id === playerId ? 'qr-mini-me' : ''}`} key={player.id}><span className={`qr-mini-avatar qr-avatar-${room.players.findIndex((p) => p.id === player.id) % 5}`}>{player.name.slice(0, 1).toUpperCase()}</span><span className="qr-mini-name">{player.name}{player.id === playerId && <small>YOU</small>}</span><b>{player.score}</b></div>)}<div className="qr-score-tip"><Sparkles size={15} /><span>Fast answers earn up to <b>50 bonus points</b>.</span></div></aside></div></section>}
  </main>
}
