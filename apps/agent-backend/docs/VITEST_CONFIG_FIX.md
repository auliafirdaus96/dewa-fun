# Vitest Config TypeScript Error Fix

**Date:** March 31, 2026  
**Status:** ✅ **FIXED**

---

## Issues Identified & Resolved

### Issue #1: `threshold` → `thresholds`

**Error:**
```
No overload matches this call.
Object literal may only specify known properties, but 'threshold' does not exist 
in type '{ provider: "v8"; } & CoverageV8Options'. Did you mean to write 'thresholds'?
```

**Location:** Line 65 in `vitest.config.ts`

**Fix:**
```typescript
// BEFORE ❌
coverage: {
  threshold: {  // Wrong - singular
    lines: 70,
    functions: 70,
    branches: 70,
    statements: 70,
  },
}

// AFTER ✅
coverage: {
  thresholds: {  // Correct - plural
    lines: 70,
    functions: 70,
    branches: 70,
    statements: 70,
  },
}
```

**Reason:** Vitest uses the plural form `thresholds` for coverage configuration.

---

### Issue #2: `timeout` → `testTimeout`

**Error:**
```
No overload matches this call.
The last overload gave the following error.
Object literal may only specify known properties, and 'timeout' does not exist 
in type 'InlineConfig'.
```

**Location:** Line 19 in `vitest.config.ts`

**Fix:**
```typescript
// BEFORE ❌
test: {
  timeout: 30000,  // Wrong property name
}

// AFTER ✅
test: {
  testTimeout: 30000,  // Correct property name
}
```

**Reason:** Vitest uses `testTimeout` instead of `timeout` for the global test timeout setting.

---

## Verification

After applying both fixes:
- ✅ No TypeScript errors
- ✅ Configuration loads correctly
- ✅ All properties match Vitest API

---

## Lessons Learned

### Property Naming Conventions

Vitest configuration uses specific property names that may differ from other test frameworks:

| Framework | Timeout Property | Threshold Property |
|-----------|-----------------|-------------------|
| Vitest | `testTimeout` | `thresholds` (plural) |
| Jest | `testTimeout` | N/A (uses reporters) |
| Mocha | `timeout` | N/A |

### Best Practices

1. **Always check the official docs** when migrating configs
2. **Use TypeScript intellisense** to catch these errors early
3. **Read the error messages carefully** - they often suggest the correct name

---

## References

- [Vitest Config Documentation](https://vitest.dev/config/)
- [Vitest Coverage Options](https://vitest.dev/guide/coverage.html)

---

*Fix applied during agent-backend root folder cleanup and modernization*
