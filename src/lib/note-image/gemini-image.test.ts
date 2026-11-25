import { afterEach, describe, expect, it, vi } from 'vitest'
import { GeminiImageError, requestNoteImage } from './gemini-image'

afterEach(() => {
  vi.unstubAllGlobals()
})

function stubFetch(status: number, body: unknown) {
  const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify(body), { status }))
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

describe('requestNoteImage', () => {
  it('JPEG を指定して呼び、返ってきた画像をバイト列にする', async () => {
    const fetchMock = stubFetch(200, {
      steps: [
        { type: 'thought', signature: 'xxx' },
        { type: 'model_output', content: [{ type: 'image', mime_type: 'image/jpeg', data: btoa('jpeg!') }] },
      ],
    })

    const bytes = await requestNoteImage('prompt', 'key')

    expect(new TextDecoder().decode(bytes)).toBe('jpeg!')
    const body = JSON.parse(fetchMock.mock.calls[0][1].body)
    expect(body.response_format.mime_type).toBe('image/jpeg')
  })

  it('残高切れ（402）はステータス付きのエラーにする', async () => {
    stubFetch(402, { error: { message: 'Your prepayment credits are depleted' } })
    await expect(requestNoteImage('prompt', 'key')).rejects.toMatchObject({ name: 'GeminiImageError', status: 402 })
  })

  it('JPEG 以外が返ってきたらエラーにする（JPEG として保存しない）', async () => {
    stubFetch(200, { steps: [{ type: 'model_output', content: [{ type: 'image', mime_type: 'image/png', data: btoa('png!') }] }] })
    await expect(requestNoteImage('prompt', 'key')).rejects.toBeInstanceOf(GeminiImageError)
  })

  it('画像が入っていなければエラーにする', async () => {
    stubFetch(200, { steps: [{ type: 'model_output', content: [{ type: 'text', text: 'sorry' }] }] })
    await expect(requestNoteImage('prompt', 'key')).rejects.toBeInstanceOf(GeminiImageError)
  })
})
