import { EvaluationContext, TargetingKeyMissingError } from '@openfeature/server-sdk'
import { convertContextValueToString, evaluationContextToBKTUser } from '../src/internal/EvaluationContext'

describe('convertContextValueToString', () => {
  it('returns empty string for null and undefined', () => {
    expect(convertContextValueToString(null)).toBe('')
    expect(convertContextValueToString(undefined)).toBe('')
  })

  it('converts Date objects to ISO string', () => {
    const date = new Date('2023-01-01T00:00:00Z')
    expect(convertContextValueToString(date)).toBe('2023-01-01T00:00:00.000Z')
  })

  it('converts arrays to JSON strings', () => {
    const arr = ['a', 'b', 'c']
    expect(convertContextValueToString(arr)).toBe(JSON.stringify(arr))
  })

  it('converts objects to JSON strings', () => {
    const obj = { key: 'value', num: 123 }
    expect(convertContextValueToString(obj)).toBe(JSON.stringify(obj))
  })

  it('converts primitive values to strings', () => {
    expect(convertContextValueToString(123)).toBe('123')
    expect(convertContextValueToString(true)).toBe('true')
    expect(convertContextValueToString(false)).toBe('false')
    expect(convertContextValueToString('already a string')).toBe('already a string')
  })

  it('handles nested objects and arrays', () => {
    const complex = { 
      arr: [1, 2, 3],
      nested: { a: 1, b: true }
    }
    expect(convertContextValueToString(complex)).toBe(JSON.stringify(complex))
  })
})

describe('evaluationContextToBKTUser', () => {
  it('throws an error when targetingKey is missing', () => {
    const evaluationContext: EvaluationContext = {}
    expect(() => evaluationContextToBKTUser(evaluationContext)).toThrow(TargetingKeyMissingError)
    expect(() => evaluationContextToBKTUser(evaluationContext)).toThrow('targetingKey is required')
  })

  it('converts basic evaluationContext to BKTUser', () => {
    const evaluationContext: EvaluationContext = {
      targetingKey: 'user-123',
      email: 'user@example.com',
      age: 30,
      isPremium: true
    }

    const result = evaluationContextToBKTUser(evaluationContext)

    expect(result.id).toBe('user-123')
    expect(result.data).toEqual({
      email: 'user@example.com',
      age: '30',
      isPremium: 'true'
    })
  })

  it('handles Date objects', () => {
    const date = new Date('2023-01-01T00:00:00Z')
    const evaluationContext: EvaluationContext = {
      targetingKey: 'user-123',
      registeredAt: date
    }

    const result = evaluationContextToBKTUser(evaluationContext)

    expect(result.data).toEqual({
      registeredAt: '2023-01-01T00:00:00.000Z'
    })
  })

  it('handles arrays', () => {
    const evaluationContext: EvaluationContext = {
      targetingKey: 'user-123',
      interests: ['sports', 'music', 'books']
    }

    const result = evaluationContextToBKTUser(evaluationContext)

    expect(result.data).toEqual({
      interests: JSON.stringify(['sports', 'music', 'books'])
    })
  })

  it('handles nested objects', () => {
    const evaluationContext: EvaluationContext = {
      targetingKey: 'user-123',
      address: {
        city: 'San Francisco',
        country: 'USA'
      }
    }

    const result = evaluationContextToBKTUser(evaluationContext)

    expect(result.data).toEqual({
      address: JSON.stringify({
        city: 'San Francisco',
        country: 'USA'
      })
    })
  })

  it('handles null and undefined values', () => {
    const evaluationContext: EvaluationContext = {
      targetingKey: 'user-123',
      nullValue: null,
      undefinedValue: undefined
    }

    const result = evaluationContextToBKTUser(evaluationContext)

    expect(result.data).toEqual({
      nullValue: '',
      undefinedValue: ''
    })
  })

  it('handles complex nested structures', () => {
    const evaluationContext: EvaluationContext = {
      targetingKey: 'user-123',
      profile: {
        details: {
          preferences: ['dark mode', 'notifications'],
          settings: {
            theme: 'dark',
            notifications: true
          }
        },
        lastLogin: new Date('2023-01-01T00:00:00Z')
      }
    }

    const result = evaluationContextToBKTUser(evaluationContext)

    expect(result.data).toEqual({
      profile: JSON.stringify({
        details: {
          preferences: ['dark mode', 'notifications'],
          settings: {
            theme: 'dark',
            notifications: true
          }
        },
        lastLogin: '2023-01-01T00:00:00.000Z'
      })
    })
  })
})
