import { retrieveKnowledge } from './chat.knowledge'

describe('retrieveKnowledge (lexical RAG)', () => {
  it('finds the attendance doc for an attendance question (en + vi)', () => {
    const en = retrieveKnowledge('how does attendance work?', 'en')
    expect(en.length).toBeGreaterThan(0)
    expect(en[0].title.toLowerCase()).toContain('attendance')
    expect(en[0].content).toContain('JOIN')

    const vi = retrieveKnowledge('điểm danh hoạt động thế nào', 'vi')
    expect(vi[0].title).toContain('Điểm danh')
  })

  it('answers a "can passengers log in" question from the roles/passengers docs', () => {
    const r = retrieveKnowledge('can passengers log in or have an account', 'en')
    expect(r.length).toBeGreaterThan(0)
    expect(r.map((c) => c.content).join(' ').toLowerCase()).toContain('account')
  })

  it('returns top-k localized chunks ordered by score', () => {
    const r = retrieveKnowledge('zalo sms voice notification automation reminder', 'en', 2)
    expect(r.length).toBeGreaterThan(0)
    expect(r.length).toBeLessThanOrEqual(2)
    expect(r[0].score).toBeGreaterThanOrEqual(r[r.length - 1].score)
  })

  it('returns [] when nothing matches', () => {
    expect(retrieveKnowledge('xyzzy qwerty zzz', 'en')).toEqual([])
  })
})
