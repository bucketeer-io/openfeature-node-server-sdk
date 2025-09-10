import { User } from 'bkt-node-server-sdk'
import { EvaluationContext, EvaluationContextValue, TargetingKeyMissingError } from '@openfeature/server-sdk'

function evaluationContextToBKTUser(
  evaluationContext: EvaluationContext,
): User {
  const targetingKey = evaluationContext.targetingKey
  if (!targetingKey) {
    throw new TargetingKeyMissingError('targetingKey is required')
  }
  
  // Create a customAttributes object by converting EvaluationContext to Record<string, string>
  const customAttributes: Record<string, string> = {}
  
  // Process all properties from evaluationContext
  Object.entries(evaluationContext).forEach(([key, value]) => {
    // Skip targetingKey as it's used as the user ID
    if (key === 'targetingKey') {
      return
    }
    
    // Convert the value to string based on its type
    customAttributes[key] = convertContextValueToString(value)
  })
  
  const user = {
    id: targetingKey,
    data: customAttributes,
  }
  return user
}

/**
 * Converts an EvaluationContextValue to a string
 */
function convertContextValueToString(value: EvaluationContextValue): string {
  if (value === null || value === undefined) {
    return ''
  }
  
  if (value instanceof Date) {
    return value.toISOString()
  }
  
  if (Array.isArray(value)) {
    return JSON.stringify(value)
  }
  
  if (typeof value === 'object') {
    return JSON.stringify(value)
  }
  
  // Handle primitive values
  return String(value)
}

export { evaluationContextToBKTUser, convertContextValueToString }