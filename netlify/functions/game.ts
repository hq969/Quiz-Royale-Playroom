import { getStore } from '@netlify/blobs'
import type { Context } from '@netlify/functions'
import { questions } from '../../src/game/questions'
import type { GameRoom, PublicRoom } from '../../src/game/types'

const store = getStore({ name: 'quiz-royale-rooms', consistency: 'strong' })
const json = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } })
const codePattern = /^[A-Z0-9]{5}$/
const generateCode = () => Math.random().toString(36).slice(2, 7).toUpperCase().padEnd(5, 'Q')
const safeName = (value: unknown) => typeof value === 'string' ? value.trim().replace(/\s+/g, ' ').slice(0, 18) : ''
const publicRoom = (room: GameRoom, viewerId = ''): PublicRoom => {
  const question = room.status === 'lobby' ? null : questions[room.questionOrder[room.questionIndex]]
  const allAnswered = room.players.length > 0 && room.players.every((player) => player.answer !== null)
  const reveal = room.status === 'finished' || (room.revealUntil !== null && room.revealUntil > Date.now()) || (room.status === 'playing' && Date.now() >= (room.questionEndsAt || 0)) || allAnswered
  return {
    code: room.code, hostId: room.hostId, status: room.status, questionIndex: room.questionIndex,
    questionStartedAt: room.questionStartedAt, questionEndsAt: room.questionEndsAt, revealUntil: room.revealUntil,
    createdAt: room.createdAt, updatedAt: room.updatedAt,
    players: room.players.map((player) => ({
      id: player.id, name: player.name, score: player.score, hasAnswered: player.answer !== null,
      answer: player.id === viewerId ? player.answer : null,
      answeredAt: player.id === viewerId ? player.answeredAt : null,
    })),
    question: question ? { category: question.category, prompt: question.prompt, options: question.options, ...(reveal ? { answer: question.answer } : {}) } : null,
  }
}
async function updateRoom(code: string, viewerId: string, action: (room: GameRoom) => string | null): Promise<{ room?: PublicRoom; error?: string; status?: number }> {
  for (let attempt = 0; attempt < 6; attempt++) {
    const entry = await store.getWithMetadata<GameRoom>(code, { consistency: 'strong', type: 'json' })
    if (!entry) return { error: 'Room not found. Check the code and try again.', status: 404 }
    const room = entry.data
    const error = action(room)
    if (error) return { error, status: 400 }
    room.updatedAt = Date.now()
    const result = await store.setJSON(code, room, { onlyIfMatch: entry.etag })
    if (result.modified) return { room: publicRoom(room, viewerId) }
  }
  return { error: 'The room is busy. Please try again.', status: 409 }
}

export default async (req: Request, _context: Context) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: { 'access-control-allow-origin': '*', 'access-control-allow-methods': 'GET, POST, OPTIONS', 'access-control-allow-headers': 'content-type' } })
  if (req.method !== 'GET' && req.method !== 'POST') return json({ error: 'Method not allowed.' }, 405)
  try {
    const url = new URL(req.url)
    if (req.method === 'GET') {
      const code = (url.searchParams.get('code') || '').toUpperCase()
      if (!codePattern.test(code)) return json({ error: 'Enter a valid 5-character room code.' }, 400)
      const room = await store.get<GameRoom>(code, { consistency: 'strong', type: 'json' })
      if (!room) return json({ error: 'Room not found. Check the code and try again.' }, 404)
      return json({ room: publicRoom(room, url.searchParams.get('playerId') || '') })
    }
    const body = await req.json() as { action?: string; code?: string; playerId?: string; name?: string; answer?: number }
    const action = body.action
    const playerId = typeof body.playerId === 'string' ? body.playerId : ''
    if (action === 'create') {
      const name = safeName(body.name)
      if (!name) return json({ error: 'Enter your name to create a room.' }, 400)
      for (let attempt = 0; attempt < 5; attempt++) {
        const code = generateCode()
        const now = Date.now()
        const room: GameRoom = { code, hostId: playerId || crypto.randomUUID(), players: [{ id: playerId || crypto.randomUUID(), name, score: 0, answer: null, answeredAt: null }], status: 'lobby', questionOrder: [], questionIndex: 0, questionStartedAt: null, questionEndsAt: null, revealUntil: null, createdAt: now, updatedAt: now }
        room.players[0].id = room.hostId
        const result = await store.setJSON(code, room, { onlyIfNew: true })
        if (result.modified) return json({ room: publicRoom(room, room.hostId), playerId: room.hostId })
      }
      return json({ error: 'Could not create a room. Please try again.' }, 503)
    }
    const code = (body.code || '').toUpperCase()
    if (!codePattern.test(code)) return json({ error: 'Enter a valid 5-character room code.' }, 400)
    if (action === 'join') {
      const name = safeName(body.name)
      if (!name) return json({ error: 'Enter your name to join.' }, 400)
      const id = playerId || crypto.randomUUID()
      const result = await updateRoom(code, id, (room) => {
        if (room.status !== 'lobby') return 'This game has already started.'
        if (room.players.some((p) => p.id === id)) return null
        if (room.players.length >= 8) return 'This room is full (8 players maximum).'
        if (room.players.some((p) => p.name.toLowerCase() === name.toLowerCase())) return 'That name is already taken in this room.'
        room.players.push({ id, name, score: 0, answer: null, answeredAt: null }); return null
      })
      return result.error ? json({ error: result.error }, result.status) : json({ room: result.room, playerId: id })
    }
    const result = await updateRoom(code, playerId, (room) => {
      const player = room.players.find((p) => p.id === playerId)
      if (!player) return 'You are not in this room. Rejoin with your name.'
      if (action === 'start') {
        if (room.hostId !== playerId) return 'Only the host can start the game.'
        if (room.status !== 'lobby') return 'The game has already started.'
        if (room.players.length < 2) return 'At least 2 players are needed to start.'
        room.questionOrder = questions.map((_, i) => i).sort(() => Math.random() - 0.5).slice(0, 3)
        room.questionIndex = 0; room.status = 'playing'; room.questionStartedAt = Date.now(); room.questionEndsAt = Date.now() + 15000; room.revealUntil = null
        return null
      }
      if (action === 'answer') {
        if (room.status !== 'playing' || room.revealUntil) return 'Answers are closed for this question.'
        if (Date.now() > (room.questionEndsAt || 0)) return 'Time is up for this question.'
        if (!Number.isInteger(body.answer) || (body.answer as number) < 0 || (body.answer as number) > 3) return 'Choose one of the four answers.'
        if (player.answer !== null) return 'You already answered this question.'
        player.answer = body.answer as number; player.answeredAt = Date.now()
        const q = questions[room.questionOrder[room.questionIndex]]
        if (player.answer === q.answer) player.score += 100 + Math.max(0, Math.ceil(((room.questionEndsAt! - player.answeredAt) / 15000) * 50))
        if (room.players.every((p) => p.answer !== null)) room.revealUntil = Date.now() + 4000
        return null
      }
      if (action === 'advance') {
        if (room.hostId !== playerId) return 'Only the host can move to the next question.'
        if (room.status !== 'playing' || Date.now() < (room.revealUntil || room.questionEndsAt || 0)) return 'This question is still in progress.'
        if (room.questionIndex === 2) { room.status = 'finished'; room.questionStartedAt = null; room.questionEndsAt = null; room.revealUntil = null; return null }
        room.questionIndex++; room.players.forEach((p) => { p.answer = null; p.answeredAt = null })
        room.questionStartedAt = Date.now(); room.questionEndsAt = Date.now() + 15000; room.revealUntil = null
        return null
      }
      return 'Unknown game action.'
    })
    return result.error ? json({ error: result.error }, result.status) : json({ room: result.room })
  } catch {
    return json({ error: 'The game server could not save that update. Please try again.' }, 500)
  }
}
