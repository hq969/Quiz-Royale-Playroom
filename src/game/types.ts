export type Player = { id: string; name: string; score: number; answer: number | null; answeredAt: number | null }
export type GameRoom = {
  code: string; hostId: string; players: Player[]; status: 'lobby' | 'playing' | 'finished'
  questionOrder: number[]; questionIndex: number; questionStartedAt: number | null; questionEndsAt: number | null
  revealUntil: number | null; createdAt: number; updatedAt: number
}
export type PublicPlayer = Omit<Player, 'answer' | 'answeredAt'> & { answer: number | null; answeredAt: number | null; hasAnswered: boolean }
export type PublicRoom = Omit<GameRoom, 'questionOrder' | 'players'> & { players: PublicPlayer[]; question: { category: string; prompt: string; options: string[]; answer?: number } | null }
