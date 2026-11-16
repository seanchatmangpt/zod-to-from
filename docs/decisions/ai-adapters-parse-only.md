# AI Adapters: Parse-Only Implementation Decision

## Decision Date
2025-10-02

## Status
✅ Implemented

## Context
The AI adapters (`docx-ai`, `pptx-ai`, `xlsx-ai`) in `src/adapters/ai.mjs` had placeholder format methods that threw basic errors. The team needed to decide whether to:
1. Document as parse-only adapters (80/20 approach)
2. Implement basic AI-powered formatting

## Decision
**Option 1: Enhanced Parse-Only Documentation** (80/20 approach)

## Rationale

### Why Parse-Only?
1. **Non-Determinism**: AI output is inherently non-deterministic, violating the library's predictability contract
2. **Existing Alternatives**: Deterministic adapters already exist for document creation (`docx`, `xlsx`, `pptx`)
3. **Value Proposition**: 80% of AI adapter value comes from intelligent parsing, not creation
4. **Reliability**: Document creation requires precise formatting that AI struggles with

### Why Enhanced Error Messages?
1. **User Guidance**: Clearly explain why formatting isn't supported
2. **Actionable Alternatives**: Direct users to working solutions
3. **Developer Experience**: Reduce confusion and support requests

## Implementation

### Enhanced Error Messages
Each AI adapter now throws informative errors with:
- ❌ Clear rejection message
- 📝 Explanation of why it's not supported
- ✅ 3 recommended alternatives
- 💡 Practical example code

### Updated Documentation
- JSDoc comments clearly mark adapters as "Parse-Only"
- Use cases explicitly listed
- Alternative adapters documented
- Pack manifest updated with warning

### Example Error Output
```
❌ AI-assisted formatting (to:docx-ai) is not supported.

📝 Reason: AI output is non-deterministic and unsuitable for document creation.

✅ Recommended alternatives:
  • Use "docx" adapter for tables and structured documents
  • Use "docx-table" for tabular data
  • Use "html" → Word conversion for rich formatting

💡 Example: .to("docx", { content: data })
```

## Benefits

### 80/20 Value Delivery
- **20% Effort**: Enhanced error messages and documentation
- **80% Value**: Clear guidance prevents user confusion and support burden

### Developer Experience
- Immediate understanding of limitation
- Clear path to working solution
- No time wasted trying to make it work

### Code Quality
- Maintains deterministic contract
- Prevents non-deterministic behavior
- Preserves library reliability

## Alternatives Considered

### Option 2: Implement AI-Powered Formatting
**Rejected because:**
- Non-deterministic output unsuitable for production
- High complexity for marginal benefit
- Existing deterministic adapters already cover use cases
- Would require extensive disclaimers and error handling

## Files Modified
- `/Users/sac/zod-to-from/src/adapters/ai.mjs`
  - Enhanced error messages for all 3 format methods
  - Updated JSDoc documentation
  - Updated pack manifest description

## Testing Recommendations
1. Verify error messages display correctly
2. Test that parse methods still work
3. Validate alternative adapter recommendations
4. Check that examples in errors are accurate

## Future Considerations
If AI formatting becomes a requirement:
1. Add explicit `isExperimental: true` flag
2. Require user opt-in via options
3. Include disclaimers in output
4. Focus on 80% use cases (simple templates)
5. Always provide deterministic fallback

## Metrics
- **Lines Changed**: ~50
- **Adapters Affected**: 3 (docx-ai, pptx-ai, xlsx-ai)
- **Implementation Time**: ~15 minutes
- **Complexity**: Low

## Related
- Main implementation: `/Users/sac/zod-to-from/src/adapters/ai.mjs`
- Alternative adapters: `/Users/sac/zod-to-from/src/adapters/data.mjs`
- Pack system: `/Users/sac/zod-to-from/src/core/index.mjs`
