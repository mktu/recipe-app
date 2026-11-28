import { describe, expect, it } from 'vitest'
import { newNoteImagePath, noteImagePathFromUrl, noteImagePublicUrl } from './storage-url'

const USER_ID = '5b1e0000-0000-0000-0000-0000000000c3'

describe('newNoteImagePath', () => {
  it('ユーザー ID で始まり、毎回違う名前になる', () => {
    const a = newNoteImagePath(USER_ID)
    expect(a).toMatch(new RegExp(`^${USER_ID}/[0-9a-f-]{36}\\.jpg$`))
    expect(newNoteImagePath(USER_ID)).not.toBe(a)
  })
})

describe('公開 URL とパスの往復', () => {
  it('公開 URL からパスを取り出せる（末尾スラッシュ付きの Supabase URL でも）', () => {
    const path = `${USER_ID}/abc.jpg`
    const url = noteImagePublicUrl('https://abcd.supabase.co/', path)
    expect(url).toBe(`https://abcd.supabase.co/storage/v1/object/public/generated-images/${path}`)
    expect(noteImagePathFromUrl(url)).toBe(path)
  })

  it('このバケットの URL でなければ null（外部サイトの画像やプリセットを消さない）', () => {
    expect(noteImagePathFromUrl('/placeholders/japanese.png')).toBeNull()
    expect(noteImagePathFromUrl('https://cdn.example.org/a.jpg')).toBeNull()
    expect(noteImagePathFromUrl('https://abcd.supabase.co/storage/v1/object/public/generated-images/')).toBeNull()
    expect(noteImagePathFromUrl(null)).toBeNull()
  })
})
