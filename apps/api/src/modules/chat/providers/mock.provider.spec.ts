import { MockChatProvider } from './mock.provider'
import type { ChatContext } from '../chat.types'

const CTX: ChatContext = {
  operatorTripCount: 3,
  busCount: 5,
  statusCounts: { PLANNED: 2, IN_PROGRESS: 1, DONE: 0, CANCELLED: 0 },
  trips: [
    { name: 'hn-hp', status: 'IN_PROGRESS', startDate: '2026-05-22', endDate: '2026-05-25', roundCount: 2, roundsInProgress: 1, passengerCount: 14, description: 'Hanoi to Hai Phong' },
    { name: 'da-nang', status: 'PLANNED', startDate: '2026-07-01', endDate: '2026-07-03', roundCount: 1, roundsInProgress: 0, passengerCount: 8 },
    { name: 'sapa', status: 'PLANNED', startDate: '2026-08-01', endDate: '2026-08-04', roundCount: 0, roundsInProgress: 0, passengerCount: 0 },
  ],
  generatedAt: '2026-06-04T00:00:00.000Z',
}

describe('MockChatProvider (deterministic intents)', () => {
  const p = new MockChatProvider()
  const ask = async (q: string, lang: 'en' | 'vi' = 'en') => (await p.answer(q, CTX, lang)).answer

  it('answers PLANNED count exactly (en + vi, accent-insensitive)', async () => {
    expect(await ask('How many tours are still in PLANNED?')).toContain('2')
    expect(await ask('Có bao nhiêu chuyến đang lên kế hoạch?', 'vi')).toContain('2')
  })

  it('answers IN_PROGRESS and DONE counts', async () => {
    expect(await ask('how many tours are in progress?')).toContain('1')
    expect(await ask('how many tours are done?')).toContain('0')
  })

  it('answers total trips', async () => {
    expect(await ask('how many tours in total?')).toContain('3')
  })

  it('introduces a specific trip with its facts', async () => {
    const a = await ask('introduce hn-hp')
    expect(a).toContain('hn-hp')
    expect(a).toContain('14') // passenger count
  })

  it('answers passenger count for a specific trip', async () => {
    expect(await ask('how many passengers on hn-hp?')).toContain('14')
  })

  it('lists rounds in progress', async () => {
    const a = await ask('which rounds are in progress?')
    expect(a).toContain('hn-hp')
    expect(a).toContain('1')
  })

  it('lists tours', async () => {
    const a = await ask('list my tours')
    expect(a).toContain('hn-hp')
    expect(a).toContain('da-nang')
    expect(a).toContain('sapa')
  })

  it('falls back helpfully on an unrecognised question', async () => {
    expect((await ask('qwerty zzz')).toLowerCase()).toContain('tour')
    expect((await ask('asdf', 'vi'))).toContain('chuyến')
  })

  it('a named trip beats a status word: passenger count, not status count (#7)', async () => {
    // "planned" would trigger a status count (2); da-nang has 8 passengers.
    const a = await ask('how many passengers on the planned tour da-nang?')
    expect(a).toContain('da-nang')
    expect(a).toContain('8')
    expect(a).not.toContain('2 tour')
  })

  it('"list <status> tours" enumerates (filtered), not a bare count (#3)', async () => {
    const a = await ask('list planned tours')
    expect(a).toContain('da-nang')
    expect(a).toContain('sapa')
    expect(a).not.toContain('hn-hp') // hn-hp is IN_PROGRESS, excluded from the planned list
  })

  it('uses retrieved knowledge for a how/what question (RAG)', async () => {
    const ctx = {
      ...CTX,
      knowledge: [
        { title: 'Attendance', content: 'Attendance is JOIN, ABSENT or CANCELLED, set by the BusManager.', score: 3 },
      ],
    }
    const a = (await p.answer('how does attendance work?', ctx, 'en')).answer
    expect(a).toContain('JOIN')
  })

  it('without knowledge, a conceptual question falls back to the help message', async () => {
    expect((await ask('how does attendance work?')).toLowerCase()).toContain('tour')
  })

  it('gives an overall summary/digest', async () => {
    const a = await ask('give me a summary')
    expect(a).toContain('3') // total tours
    expect(a).toContain('22') // total passengers (14+8+0)
    expect(a).toContain('5') // buses
  })

  it('answers the next/upcoming tour (earliest-starting planned)', async () => {
    expect(await ask('what is the next tour?')).toContain('da-nang') // 2026-07-01 < sapa 2026-08-01
  })

  it('answers the tour with the most passengers', async () => {
    const a = await ask('which tour has the most passengers?')
    expect(a).toContain('hn-hp')
    expect(a).toContain('14')
  })

  it('answers fleet size', async () => {
    const a = await ask('how many buses do I have?')
    expect(a).toContain('5')
    expect(a.toLowerCase()).toContain('bus')
  })
})
