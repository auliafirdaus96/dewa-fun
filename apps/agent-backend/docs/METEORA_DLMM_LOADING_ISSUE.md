# @meteora-ag/dlmm Loading Issue Investigation

**Date:** March 31, 2026  
**Status:** ⚠️ **ROOT CAUSE IDENTIFIED - PACKAGE COMPATIBILITY ISSUE**

---

## 🔍 Investigation Summary

### Problem Discovered

During the root folder cleanup and modernization, the `@meteora-ag/dlmm` dependency was **accidentally removed** from `package.json`.

**Timeline:**
1. ✅ Package was originally in old `package.json.25253427` (version ^1.2.0)
2. ❌ Removed during dependency audit (not in current package.json)
3. ✅ Reinstalled via `pnpm add @meteora-ag/dlmm`
4. ❌ Tests still failing due to ES module resolution issue

---

## 📊 Current Status

### Installation: ✅ FIXED
```bash
pnpm add @meteora-ag/dlmm
# Successfully installed version ^1.2.0
```

**Package.json Updated:** ✅ Line 28
```json
"dependencies": {
  "@meteora-ag/dlmm": "^1.2.0",
  // ... other dependencies
}
```

### Test Loading: ❌ STILL FAILING

**Error Message:**
```
Error: Directory import '...\node_modules\@coral-xyz\anchor\dist\cjs\utils\bytes' 
is not supported resolving ES modules imported from 
...\node_modules\@meteora-ag\dlmm\dist\index.mjs

Did you mean to import "@coral-xyz/anchor/dist/cjs/utils/bytes/index.js"?
```

**Root Cause:** The `@meteora-ag/dlmm` package has a transitive dependency on `@coral-xyz/anchor`, which has ES module resolution issues.

---

## 🔬 Technical Analysis

### Dependency Chain

```
agent-backend
├── @meteora-ag/dlmm@^1.2.0 (direct dependency)
│   └── @coral-xyz/anchor (transitive dependency)
│       └── ./dist/cjs/utils/bytes (directory import - NOT SUPPORTED in ESM)
```

### The Problem

1. **ES Module Format:** `@meteora-ag/dlmm` ships as ES modules (`.mjs`)
2. **Anchor's Structure:** `@coral-xyz/anchor` uses CommonJS structure
3. **Directory Import Issue:** The package tries to import from a directory without specifying the entry file
   ```javascript
   // In @meteora-ag/dlmm/dist/index.mjs
   import something from '@coral-xyz/anchor/dist/cjs/utils/bytes';
   //                                                        ^^^^^^^
   //                                           Missing: /index.js
   ```

4. **Node.js ESM Strictness:** Node.js ESM requires explicit file paths, not directory imports

---

## 🎯 Attempted Solutions

### ✅ Solution 1: Install Package
**Status:** COMPLETED  
**Result:** Package now installed correctly

### ❌ Solution 2: Vitest optimizeDeps
**Attempted:**
```typescript
optimizeDeps: {
  include: ['@meteora-ag/dlmm'],
  exclude: ['@coral-xyz/anchor'],
}
```

**Result:** No effect - this is a Node.js module resolution issue, not a bundler optimization issue

---

## 💡 Recommended Solutions

### Option A: Use Alternative Package Version (RECOMMENDED)

**Try the version that was working before:**
```bash
# Remove current version
pnpm remove @meteora-ag/dlmm

# Install specific version that was in lockfile
pnpm add @meteora-ag/dlmm@1.9.4
```

**Rationale:** The lockfile showed version 1.9.4 was previously installed and working. The current install pulled 1.2.0 which may have different module formats.

---

### Option B: Configure Vite Resolver

**Update `vitest.config.ts`:**
```typescript
export default defineConfig({
  test: {
    // ... existing config
  },
  resolve: {
    // ... existing aliases
    mainFields: ['module', 'main'],
    extensions: ['.js', '.mjs', '.cjs', '.ts', '.cts', '.mts'],
  },
  // Add custom resolver
  define: {
    'process.env.NODE_ENV': '"test"',
  },
});
```

**Rationale:** Force Node.js to use different resolution strategy

---

### Option C: Mock the Package in Tests

**Create mock for tests that need DLMM:**
```typescript
// tests/__mocks__/@meteora-ag/dlmm.ts
vi.mock('@meteora-ag/dlmm', () => ({
  default: {
    create: vi.fn(),
    getActiveBin: vi.fn(),
    // ... other methods
  },
}));
```

**Rationale:** Avoid loading the actual package during tests

---

### Option D: Use Dynamic Import

**In source files using DLMM:**
```typescript
// Instead of static import
// import DLMM from '@meteora-ag/dlmm';

// Use dynamic import
async function getDlmmInstance(poolAddress: string) {
  const DLMM = await import('@meteora-ag/dlmm');
  return DLMM.default.create(connection, poolPubkey);
}
```

**Rationale:** Dynamic imports handle ESM/CJS interop better

---

### Option E: Switch to tsx/esm Loader

**Add to `package.json`:**
```json
{
  "scripts": {
    "test": "node --loader tsx/esm node_modules/vitest/vitest.mjs run"
  }
}
```

**Rationale:** Use a loader that handles mixed ESM/CJS better

---

## 🎯 Immediate Action Plan

### High Priority (Today)

1. **Try Version 1.9.4**
   ```bash
   pnpm remove @meteora-ag/dlmm
   pnpm add @meteora-ag/dlmm@1.9.4
   pnpm test -- auth.test.ts dlmmSdk.test.ts
   ```

2. **If Still Failing - Mock for Tests**
   - Create mock in `tests/__mocks__/`
   - Update affected test files
   - Run tests to verify

### Medium Priority (This Week)

3. **Contact Meteora Team**
   - Report the ES module issue
   - Ask for recommended workaround
   - Check if newer version fixes it

4. **Evaluate Alternative Approaches**
   - Use REST API instead of SDK
   - Wrap SDK in isolated service
   - Consider community forks

---

## 📝 Impact Assessment

### Affected Files

**Direct Imports:**
- `src/services/meteoraService.ts` (line 8)

**Test Files Blocked:**
- `tests/auth.test.ts`
- `tests/dlmmSdk.test.ts`
- `tests/testMain.test.ts`

**Workaround Available:**
- Can mock the package for testing
- Can use REST API fallback
- Can skip these tests temporarily

---

## 🔗 Related Issues

### Known Similar Issues

1. **Anchor ESM Compatibility:** https://github.com/coral-xyz/anchor/issues/...
2. **Solana Packages ESM:** Various Solana ecosystem packages have similar issues

### Community Workarounds

- Use `createRequire` from Node.js `module`
- Wrap in CommonJS shim
- Use esbuild bundler before testing

---

## 🎯 Success Criteria

### Short-term
- [ ] Get tests running (even with mocks)
- [ ] Verify meteoraService functionality
- [ ] Document workaround

### Long-term
- [ ] Find permanent solution
- [ ] Update to latest compatible version
- [ ] Contribute fix to upstream if possible

---

## 📞 Next Steps

### For Developer

1. **Immediate:** Try installing version 1.9.4
2. **If fails:** Implement mocking strategy
3. **Long-term:** Reach out to Meteora maintainers

### For Team

1. **Decision:** Do we need full SDK integration or is REST API sufficient?
2. **Priority:** How critical is DLMM testing vs other features?
3. **Resources:** Allocate time for proper fix if needed

---

## 🎉 Conclusion

**Current State:**
- ✅ Package installation issue FIXED
- ❌ ES module compatibility issue IDENTIFIED
- ⚠️ Tests blocked but workarounds available

**Confidence Level:** 🟡 **MEDIUM-HIGH**

The root cause is well-understood and multiple solutions are available. This is a known ecosystem issue with established workarounds.

**Recommendation:** Try version 1.9.4 first (quick win), then implement mocking if needed while waiting for upstream fix.

---

*Investigation performed during agent-backend modernization*  
*Issue: ES module resolution in @meteora-ag/dlmm → @coral-xyz/anchor dependency chain*
