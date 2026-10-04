import { describe, it, expect } from 'vitest'
import { findCookingTime, findServings, parseDurationMinutes } from './meta'

describe('parseDurationMinutes', () => {
  it('分・時間を分に直す', () => {
    expect(parseDurationMinutes('20分')).toBe(20)
    expect(parseDurationMinutes('１５分')).toBe(15)
    expect(parseDurationMinutes('1時間')).toBe(60)
    expect(parseDurationMinutes('1時間30分')).toBe(90)
    expect(parseDurationMinutes('1.5時間')).toBe(90)
    expect(parseDurationMinutes('1時間半')).toBe(90)
  })

  it('範囲は長いほうを取る', () => {
    expect(parseDurationMinutes('20〜30分')).toBe(30)
    expect(parseDurationMinutes('20～30分')).toBe(30)
  })

  it('単位をまたぐ範囲も長いほうを取る', () => {
    expect(parseDurationMinutes('30分〜1時間')).toBe(60)
    expect(parseDurationMinutes('30分〜1時間半')).toBe(90)
  })

  it('読めなければ null', () => {
    expect(parseDurationMinutes('すぐ')).toBeNull()
    expect(parseDurationMinutes('0分')).toBeNull()
  })
})

describe('findCookingTime', () => {
  it('専用の行と文中の記述の両方から拾う', () => {
    expect(findCookingTime('調理時間: 20分')).toEqual({ found: true, minutes: 20, raw: '20分' })
    expect(findCookingTime('調理時間：約25分')).toEqual({ found: true, minutes: 25, raw: '25分' })
    expect(findCookingTime('冷蔵で2日。調理時間20分')).toEqual({ found: true, minutes: 20, raw: '20分' })
  })

  it('記述はあるが読めないときは minutes が null', () => {
    expect(findCookingTime('調理時間: すぐ')).toEqual({ found: true, minutes: null, raw: 'すぐ' })
  })

  it('記述が無ければ found: false', () => {
    expect(findCookingTime('冷蔵で2日')).toEqual({ found: false })
  })
})

describe('findServings', () => {
  it('人数・分量の行から取る', () => {
    expect(findServings('人数: 2人分')).toBe('2人分')
    expect(findServings('分量：作りやすい分量')).toBe('作りやすい分量')
    expect(findServings('2人分')).toBeNull()
  })
})
