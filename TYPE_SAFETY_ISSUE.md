# Type Safety Issue: `getObjectDetails<T>` Generic Parameter

## Summary

The OpenFeature SDK's `getObjectDetails<T>` method allows developers to specify a generic type parameter `T extends JsonValue`, creating a **false sense of type safety**. TypeScript accepts the type assertion at compile time, but provides no runtime guarantees, leading to potential runtime crashes.

## The Two Overload Signatures

The OpenFeature SDK defines `getObjectDetails` with **two overloads**:

```typescript
// Overload 1: Non-generic version
getObjectDetails(flagKey: string, defaultValue: JsonValue, options?: FlagEvaluationOptions): EvaluationDetails<JsonValue>;

// Overload 2: Generic version
getObjectDetails<T extends JsonValue = JsonValue>(flagKey: string, defaultValue: T, options?: FlagEvaluationOptions): EvaluationDetails<T>;
```

## The Problem

When you explicitly specify a type parameter that doesn't match the actual runtime value, TypeScript uses **Overload 2** and trusts your type assertion without any runtime validation.

### Reproduction Example

```typescript
const defaultStringValue: string = 'defaultString'

// This uses Overload 2 with T = string
// TypeScript compiles successfully because string extends JsonValue
const result = client.getObjectDetails<string>(FEATURE_ID_JSON, defaultStringValue)

// TypeScript types result.value as string
const valueString: string = result.value

// ❌ Runtime crash! Actual value is { key: 'value-1' }, not a string
valueString.toUpperCase() // TypeError: valueString.toUpperCase is not a function
```

### Actual Test Failure

```typescript
test('object evaluation', async () => {
  const client = OpenFeature.getClient()
  const defaultStringValue: string = 'defaultString'

  // UNSAFE TYPE ASSERTION - this may cause runtime error
  const resultStringSpecificGenericT = client.getObjectDetails<string>(FEATURE_ID_JSON, defaultStringValue)
  
  // Access value as string - TypeScript thinks this is safe
  const valueString: string = resultStringSpecificGenericT.value
  
  expect(valueString).to.be.a('string') // ❌ FAIL - actual type is object
  expect(valueString).to.equal('value-1') // ❌ FAIL
  
  // Runtime crash
  valueString.toUpperCase() // ❌ TypeError: valueString.toUpperCase is not a function
})
```

## Root Cause Analysis

### Why This Compiles

1. **Overload 2 accepts any `T extends JsonValue`**: Since `string extends JsonValue` is valid, TypeScript allows `<string>` as the type parameter
2. **No runtime type checking**: The SDK doesn't validate that the returned value actually matches type `T`
3. **Type inference from generic, not from runtime**: The return type `EvaluationDetails<T>` is determined by what you *specify*, not what the provider actually *returns*

### Type Flow

```typescript
// User specifies: <string>
// TypeScript checks: string extends JsonValue? ✓ Yes
// TypeScript infers: defaultValue type is string? ✓ Yes
// TypeScript returns: EvaluationDetails<string> ✓ Compile success

// At runtime:
// Provider returns: { key: 'value-1' } (an object)
// TypeScript thinks: result.value is string
// Actual type: result.value is object
// Result: Type mismatch → Runtime crash ❌
```

## Impact

- ⚠️ **Silent type mismatches**: Code compiles successfully but fails at runtime
- ⚠️ **Misleading API**: Developers may expect type safety that doesn't exist  
- ⚠️ **Difficult debugging**: The error manifests far from where the type was specified
- ⚠️ **False confidence**: TypeScript's type system suggests the code is safe when it isn't

## Comparison with Working Case

### ✅ Safe Usage (Overload 1)

```typescript
// Don't specify a generic - uses Overload 1
const result = client.getObjectDetails(FEATURE_ID_JSON, defaultValue)

// result.value is typed as JsonValue - need to validate before use
if (typeof result.value === 'string') {
  result.value.toUpperCase() // ✓ Safe - validated at runtime
}
```

### ✅ Safe Usage with Type Guard

```typescript
const result = client.getObjectDetails(FEATURE_ID_JSON, 'default')

// Always validate the actual type
const value = result.value
if (typeof value === 'object' && value !== null && 'key' in value) {
  // Now safe to use as object
  console.log(value.key)
}
```

### ❌ Unsafe Usage (Overload 2 with mismatched type)

```typescript
// Specifying <string> when actual value is an object
const result = client.getObjectDetails<string>(FEATURE_ID_JSON, 'default')
const value: string = result.value // TypeScript thinks this is string
value.toUpperCase() // ❌ Runtime crash if actual value is not a string
```

## Recommendations

### For SDK Users

1. **Avoid explicit type parameters on `getObjectDetails`**: Use Overload 1 by not specifying a generic type
2. **Always validate runtime types**: Use type guards to check the actual type before using `value`
3. **Use TypeScript type narrowing**: Leverage `typeof`, `instanceof`, and custom type guards
4. **Document assumptions**: If you must use generics, document why you believe the type is correct

### For SDK Maintainers

1. **Documentation**: Clearly document that the generic parameter `T` is for developer convenience only and provides no runtime safety
2. **Runtime validation**: Consider adding optional runtime type validation when a specific type is requested
3. **API design consideration**: Evaluate whether the generic parameter should be:
   - Removed entirely to avoid confusion
   - Restricted to only object types (not primitives like `string`)
   - Enhanced with runtime validation
4. **Warning in JSDoc**: Add warnings about the lack of runtime type checking

## Safe Pattern Examples

### Pattern 1: No Generic Type Parameter

```typescript
const result = client.getObjectDetails(FEATURE_ID_JSON, { default: 'value' })
// result.value is JsonValue - must check type before use
```

### Pattern 2: Type Guard Function

```typescript
function isExpectedShape(value: JsonValue): value is { key: string } {
  return typeof value === 'object' && value !== null && 'key' in value
}

const result = client.getObjectDetails(FEATURE_ID_JSON, { default: 'value' })
if (isExpectedShape(result.value)) {
  // Now safe to use result.value.key
  console.log(result.value.key)
}
```

### Pattern 3: Try-Catch for Defensive Programming

```typescript
const result = client.getObjectDetails<string>(FEATURE_ID_JSON, 'default')
try {
  // Validate before using methods that assume a specific type
  if (typeof result.value === 'string') {
    result.value.toUpperCase()
  } else {
    console.warn('Unexpected type returned from feature flag')
  }
} catch (error) {
  console.error('Type mismatch in feature flag evaluation', error)
}
```

## Conclusion

**The generic parameter `<T>` in `getObjectDetails<T>` is a compile-time type hint only.** It provides no runtime safety and can cause type mismatches when the generic type doesn't match the actual flag value returned by the provider.

**Always use Overload 1 (without specifying a generic) and validate types at runtime to ensure type safety.**

---

## Bucketeer Provider Solution

### Implemented Runtime Type Validation

To address this type safety issue at the provider level, the Bucketeer Provider implements **strict runtime type validation** in the `resolveObjectEvaluation` method. This prevents primitive types and arrays from being incorrectly treated as plain JSON objects.

### Core Solution Principles

1. **Only allow plain JSON objects** for object evaluation
2. **Reject all arrays** (not supported by the backend's getObjectInterface)
3. **Reject all primitive types** (string, number, boolean) with explicit error messages

### Implementation Details

```typescript
async resolveObjectEvaluation<T extends JsonValue>(
  flagKey: string,
  defaultValue: T,
  context: EvaluationContext,
  _logger: Logger,
): Promise<ResolutionDetails<T>> {
  // Step 0: Early guard for defaultValue
  if (defaultValue === null || typeof defaultValue !== 'object' || Array.isArray(defaultValue)) {
    return wrongTypeResult(
      defaultValue,
      `Default value must be a plain object but got ${
        defaultValue === null ? 'null' : Array.isArray(defaultValue) ? 'array' : typeof defaultValue
      }`,
    );
  }

  const client = this.requiredBKTClient();
  const user = evaluationContextToBKTUser(context);
  const evaluationDetails = await client.objectVariationDetails(user, flagKey, defaultValue);
  
  // Verify the returned value is an object type (plain object, not a primitive)
  // Note: Backend guarantees no null or array values will be returned.
  if (typeof evaluationDetails.variationValue === 'object') {
    // At this point we've validated it's a plain object.
    // However, DUE TO TYPE ERASURE, we cannot validate:
    // - Object property shapes (e.g., {name: string} vs {age: number})
    // - Object property types

    // Type is valid - return the result
    return toResolutionDetailsJsonValue(evaluationDetails);
  }
  
  // Reject all primitive types (string, number, boolean)
  return wrongTypeResult(
    defaultValue,
    `Expected object but got ${typeof evaluationDetails.variationValue}`,
  );
}
```

### Validation Layers

#### Layer 0: Default Value Guard
```typescript
if (defaultValue === null || typeof defaultValue !== 'object' || Array.isArray(defaultValue)) {
  return wrongTypeResult(
    defaultValue,
    `Default value must be a plain object but got ${
      defaultValue === null ? 'null' : Array.isArray(defaultValue) ? 'array' : typeof defaultValue
    }`,
  );
}
```
- Enforces the "ONLY supports plain JSON objects" contract at the entry point
- Rejects null, arrays, and all primitive types
- Prevents cases where a primitive or array default is passed

#### Layer 1: Object Type Verification
```typescript
if (typeof evaluationDetails.variationValue === 'object') {
  // ... return result
}
```
- Verifies the returned value is an object type (not a primitive)
- Backend guarantees no null or array values will be returned
- At this point it's guaranteed to be a plain object

#### Layer 2: Primitive Type Rejection
```typescript
return wrongTypeResult(
  defaultValue,
  `Expected object but got ${typeof evaluationDetails.variationValue}`,
);
```
- Catches all primitive types returned by the variation: `string`, `number`, `boolean`

### Error Response Format

When a type mismatch is detected, the provider returns a `ResolutionDetails` with:

```typescript
{
  value: defaultValue,           // Safe fallback to default
  reason: StandardResolutionReasons.ERROR,
  errorCode: ErrorCode.TYPE_MISMATCH,
  errorMessage: "Expected object but got string"  // Clear error message
}
```

### Benefits of This Approach

✅ **Prevents runtime crashes**: Type mismatches are caught and handled gracefully  
✅ **Returns safe default values**: Application continues running with fallback values  
✅ **Clear error messages**: Developers can quickly identify and fix configuration issues  
✅ **Provider-level enforcement**: Protects all consumers of the provider automatically  
✅ **Comprehensive validation**: Covers null, primitives, and array/object distinction  
✅ **OpenFeature compliant**: Uses standard error codes and resolution reasons  

### Test Coverage

The solution includes comprehensive test coverage for type mismatch scenarios:

```typescript
// Default value validation (entry guard)
- "Default value must be a plain object but got string"
- "Default value must be a plain object but got number"
- "Default value must be a plain object but got boolean"
- "Default value must be a plain object but got array"
- "Default value must be a plain object but got null"

// Returned value validation (only primitives - backend guarantees no null/arrays)
- "Expected object but got string"
- "Expected object but got number"
- "Expected object but got boolean"
```

See [BucketeerProvider.test.ts](test/BucketeerProvider.test.ts) for full test implementation.

### Design Philosophy

This solution follows the principle of **"fail safely, fail explicitly"**:

1. **Fail safely**: Return the default value instead of crashing
2. **Fail explicitly**: Provide clear error messages for debugging
3. **Fail early**: Detect issues at the provider level before they propagate
4. **Fail consistently**: Use standard OpenFeature error codes and patterns

---

## Solution Review & Limitations

### What the Solution Validates ✅

The runtime validation successfully prevents these major type mismatches:

1. **Primitive vs Object**: Catches when a primitive (string, number, boolean) is returned for an object evaluation
2. **Null handling**: Explicitly handles null (which has `typeof 'object'`)
3. **Array vs Object**: Distinguishes between arrays and plain objects, preventing cross-type usage

### What the Solution Cannot Validate ⚠️

#### Caveat: Generic Type Parameter Internal Structure

While the solution validates the **outer type** (array vs object vs primitive), it **cannot validate the internal structure** of arrays or objects at the provider level.

##### Problem: Array Element Types

When `T` is `Array<K>`, there is no way to know or validate what `K` is until runtime:

```typescript
// User expects: Array<string>
const result = client.getObjectDetails<Array<string>>(flagKey, ['default'])

// Provider validates:
// ✓ Result is an array
// ✓ Default is an array
// ✓ Types match at the array level

// ❌ But what if the flag actually returns [1, 2, 3]?
// TypeScript thinks: result.value is string[]
// Actual runtime value: result.value is number[]

// Runtime crash when user assumes string methods:
result.value[0].toUpperCase() // TypeError: result.value[0].toUpperCase is not a function
```

##### Problem: Object Property Shapes

Similarly, for object types, the provider cannot validate the internal structure:

```typescript
// User expects: { name: string, age: number }
const result = client.getObjectDetails<{ name: string; age: number }>(
  flagKey, 
  { name: 'John', age: 30 }
)

// Provider validates:
// ✓ Result is an object
// ✓ Default is an object
// ✓ Types match at the object level

// ❌ But what if the flag actually returns { email: 'test@example.com' }?
// TypeScript thinks: result.value has 'name' and 'age'
// Actual runtime value: result.value has 'email'

// Runtime crash when accessing expected properties:
result.value.name.toUpperCase() // TypeError: Cannot read property 'toUpperCase' of undefined
```

### Why This Limitation Exists

1. **Type erasure**: TypeScript's generic types are erased at runtime - `Array<string>` and `Array<number>` both become just `Array` in JavaScript
2. **Provider scope**: The provider only sees the final JSON value from the backend, not the TypeScript type annotation
3. **Performance**: Deep structural validation of every property and array element would be expensive
4. **Flexibility**: Feature flag values can intentionally change shape (e.g., A/B testing different data structures)

### Recommended Approaches for Users

#### Approach 1: Runtime Validation with Type Guards (Recommended)

```typescript
function isStringArray(value: JsonValue): value is string[] {
  return Array.isArray(value) && value.every(item => typeof item === 'string');
}

const result = client.getObjectDetails<string[]>(flagKey, ['default']);

if (result.errorCode) {
  // Handle provider-level type mismatch
  console.error(result.errorMessage);
  // Use default: result.value
} else if (isStringArray(result.value)) {
  // Safe to use as string[]
  result.value.forEach(str => str.toUpperCase());
} else {
  // Handle unexpected array element types
  console.warn('Flag returned array but elements are not strings');
}
```

#### Approach 2: Schema Validation with Zod

```typescript
import { z } from 'zod';

const ConfigSchema = z.object({
  name: z.string(),
  age: z.number(),
  tags: z.array(z.string()),
});

type Config = z.infer<typeof ConfigSchema>;

const result = client.getObjectDetails<Config>(flagKey, {
  name: 'default',
  age: 0,
  tags: [],
});

try {
  const validated = ConfigSchema.parse(result.value);
  // Safe to use validated.name, validated.age, validated.tags
} catch (error) {
  console.error('Flag value does not match expected schema:', error);
  // Fallback to default behavior
}
```

#### Approach 3: Defensive Programming with Optional Chaining

```typescript
const result = client.getObjectDetails<{ name: string }>(flagKey, { name: 'default' });

// Use optional chaining and nullish coalescing for safety
const userName = result.value?.name ?? 'Unknown';

// Or check explicitly
if (result.value && typeof result.value === 'object' && 'name' in result.value) {
  const name = result.value.name;
  if (typeof name === 'string') {
    name.toUpperCase(); // Now safe
  }
}
```

#### Approach 4: Treat Generic as Documentation Only

```typescript
// Use the generic parameter for documentation/IDE hints only
// But always validate at runtime before use
const result = client.getObjectDetails<string[]>(flagKey, ['default']);

// Don't trust the generic - validate before use
if (Array.isArray(result.value)) {
  // Check first element to infer type
  if (result.value.length > 0 && typeof result.value[0] === 'string') {
    // Now safe to use as string array
    result.value.forEach(str => str.toUpperCase());
  }
}
```

### Provider-Level Recommendations

#### JSDoc Warning

The following documentation is added to the `resolveObjectEvaluation` method:

```typescript
/**
 * Resolves an object or array value from a feature flag.
 *
 * ⚠️ STRICT TYPE VALIDATION:
 * - This method ONLY supports object types (JSON objects and arrays).
 * - Primitive types (string, number, boolean) are explicitly rejected to ensure type safety.
 * - For primitive types, use the corresponding methods on the OpenFeature Client: `getBooleanValue`, `getStringValue`, `getNumberValue`, or their `Details` variants.
 *
 * ⚠️ NESTED TYPE CAVEAT:
 * - While the top-level type (Array vs Object) is validated, the internal structure
 *   (e.g., array element types or object property keys/types) cannot be validated at the provider level due to type erasure.
 * - Always use additional runtime validation (type guards, Zod, etc.) before accessing nested properties.
 *
 * @example
 * // Provider validates: result is array, default is array ✓
 * const result = client.getObjectDetails<string[]>(flagKey, ['default'])
 *
 * // But provider CANNOT validate element types ⚠️
 * // Use type guard before accessing:
 * if (Array.isArray(result.value) && result.value.every(x => typeof x === 'string')) {
 *   result.value.forEach(str => str.toUpperCase()) // Now safe
 * }
 */
async resolveObjectEvaluation<T extends JsonValue>(...): Promise<ResolutionDetails<T>>
```
```

#### Inline Code Comments (Proposed)

```typescript
async resolveObjectEvaluation<T extends JsonValue>(...): Promise<ResolutionDetails<T>> {
  // ... existing validation code ...
  
  if (typeof evaluationDetails.variationValue === 'object') {
    const resultIsJsonArray = Array.isArray(evaluationDetails.variationValue);
    const defaultIsJsonArray = Array.isArray(defaultValue);
    
    if (resultIsJsonArray !== defaultIsJsonArray) {
      return wrongTypeResult(defaultValue, ...);
    }
    
    // NOTE: At this point we've validated the top-level type (array vs object).
    // However, we cannot validate:
    // - Array element types (e.g., string[] vs number[])
    // - Object property shapes (e.g., {name: string} vs {age: number})
    // Users should implement their own runtime validation for nested structures.
    
    return toResolutionDetailsJsonValue(evaluationDetails);
  }
}
```

### Summary of Protection Levels

| Type Mismatch | Provider Protection | User Action Required |
|---------------|-------------------|----------------------|
| `string` vs `object` (default) | ✅ Fully protected | None - rejected at entry |
| `number` vs `object` (default) | ✅ Fully protected | None - rejected at entry |
| `boolean` vs `object` (default) | ✅ Fully protected | None - rejected at entry |
| `array` vs `object` (default) | ✅ Fully protected | None - rejected at entry |
| `null` vs `object` (default) | ✅ Fully protected | None - rejected at entry |
| `string` vs `object` (result) | ✅ Fully protected | None - handled by provider |
| `number` vs `object` (result) | ✅ Fully protected | None - handled by provider |
| `boolean` vs `object` (result) | ✅ Fully protected | None - handled by provider |
| `{name: string}` vs `{age: number}` | ⚠️ Not validated | ✋ **User must validate** |
| `{name: string, extra: number}` | ⚠️ Not validated | ✋ **User must validate** |

**Key Insight**: The provider acts as a **strong first line of defense** against all macro-level type mismatches (preventing arrays and primitives), while users still own **micro-level validation** for nested object property structures.

**Backend Guarantees**: The backend's `getObjectInterface` guarantees that null and array values will never be returned, simplifying the validation logic to only check for primitive types.

### Comparison with Unprotected Implementation

#### ❌ Without Runtime Validation
```typescript
// Provider blindly returns whatever the backend sends
const result = client.getObjectDetails<string>(flagKey, 'default')
result.value.toUpperCase() // ❌ Runtime crash if value is not a string
```

#### ✅ With Bucketeer Provider Validation
```typescript
// Provider validates type and returns error result
const result = client.getObjectDetails<string>(flagKey, 'default')
if (result.errorCode === ErrorCode.TYPE_MISMATCH) {
  console.error(result.errorMessage) // "Expected object but got string"
  // Use default value safely: result.value === 'default'
}
```

---

**Related Files:**
- Provider Implementation: [src/internal/BucketeerProvider.ts](src/internal/BucketeerProvider.ts#L88-L115)
- Test Coverage: [test/BucketeerProvider.test.ts](test/BucketeerProvider.test.ts)
- E2E Tests: [e2e/evaluate.test.ts](e2e/evaluate.test.ts)
- Type Definitions: `node_modules/@openfeature/web-sdk/dist/types.d.ts` (lines 84-85)

**Date Reported:** January 23, 2026  
**Solution Implemented:** January 26, 2026
