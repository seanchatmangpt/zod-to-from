# Declarative Transforms

**Status**: Agent 9 Feature
**Version**: v2.0.0
**Category**: Data Transformation

## Overview

The Declarative Transforms system enables powerful data transformation rules with built-in validation. Transform data during conversion using a simple JSON/YAML-based DSL that supports field mapping, value transformations, and conditional logic.

## Key Features

- **Field Mapping**: Rename and restructure fields using dot notation
- **Value Transforms**: 80+ built-in transform functions
- **Conditional Logic**: Apply transforms based on data conditions
- **Schema Validation**: Ensure output matches your Zod schema
- **Transform Composition**: Chain and combine transform rules
- **Bidirectional**: Automatic reverse mapping generation
- **Custom Functions**: Register your own transform functions
- **Testing Tools**: Dry-run transforms with sample data

## Basic Usage

```javascript
import { fromJson } from 'zod-to-from';
import { z } from 'zod';

const InputSchema = z.object({
  user_name: z.string(),
  user_email: z.string(),
});

const OutputSchema = z.object({
  userName: z.string(),
  email: z.string().email(),
});

const transformRules = {
  mapping: {
    'user_name': 'userName',
    'user_email': 'email'
  },
  transforms: [
    { field: 'userName', fn: 'titleCase' },
    { field: 'email', fn: 'lowercase' }
  ],
  validate: OutputSchema
};

const result = await fromJson(InputSchema, jsonData, {
  transform: transformRules
});
```

## Transform Configuration

### Field Mappings

Rename and restructure fields using simple key-value pairs:

```javascript
const config = {
  mapping: {
    // Simple rename
    'oldName': 'newName',

    // Nested source → flat target
    'user.firstName': 'first_name',

    // Flat source → nested target
    'email': 'contact.email',

    // Deep nesting
    'data.user.profile.age': 'userAge'
  }
};
```

### Transform Rules

Apply transformations to field values:

```javascript
const config = {
  transforms: [
    // String transforms
    { field: 'name', fn: 'uppercase' },
    { field: 'title', fn: 'titleCase' },
    { field: 'slug', fn: 'kebabCase' },

    // Number transforms
    { field: 'price', fn: 'multiply', value: 1.1 },
    { field: 'rating', fn: 'round', value: 2 },
    { field: 'age', fn: 'clamp', value: 0, options: { max: 120 } },

    // Date transforms
    { field: 'createdAt', fn: 'toISO' },
    { field: 'expiresAt', fn: 'addTime', value: 7, options: { unit: 'days' } },

    // Array transforms
    { field: 'tags', fn: 'unique' },
    { field: 'items', fn: 'chunk', value: 10 },

    // Object transforms
    { field: 'user', fn: 'pick', value: ['name', 'email'] },
    { field: 'data', fn: 'flattenObject' }
  ]
};
```

### Conditional Transforms

Apply transforms based on conditions:

```javascript
const config = {
  conditionals: [
    {
      // Function-based condition
      if: (data) => data.status === 'active',
      then: [
        { field: 'priority', fn: 'multiply', value: 2 }
      ],
      else: [
        { field: 'priority', fn: 'multiply', value: 0.5 }
      ]
    },
    {
      // String expression (evaluated safely)
      if: 'type === "premium"',
      then: [
        { field: 'discount', fn: 'multiply', value: 0.2 }
      ]
    }
  ]
};
```

## Built-in Transforms

### String Transforms

| Function | Description | Example |
|----------|-------------|---------|
| `uppercase` | Convert to UPPERCASE | `'hello'` → `'HELLO'` |
| `lowercase` | Convert to lowercase | `'HELLO'` → `'hello'` |
| `capitalize` | Capitalize first letter | `'hello'` → `'Hello'` |
| `titleCase` | Title Case Words | `'hello world'` → `'Hello World'` |
| `camelCase` | Convert to camelCase | `'user_name'` → `'userName'` |
| `snakeCase` | Convert to snake_case | `'userName'` → `'user_name'` |
| `kebabCase` | Convert to kebab-case | `'userName'` → `'user-name'` |
| `trim` | Remove whitespace | `' hello '` → `'hello'` |
| `truncate` | Limit length | `truncate('long text', 5)` → `'lo...'` |
| `pad` | Pad to length | `pad('5', 3, {char: '0'})` → `'005'` |
| `reverse` | Reverse string | `'hello'` → `'olleh'` |
| `alphanumeric` | Remove special chars | `'he!!o'` → `'heo'` |

### Number Transforms

| Function | Description | Example |
|----------|-------------|---------|
| `multiply` | Multiply by value | `multiply(10, 2)` → `20` |
| `divide` | Divide by value | `divide(10, 2)` → `5` |
| `add` | Add value | `add(10, 5)` → `15` |
| `subtract` | Subtract value | `subtract(10, 3)` → `7` |
| `round` | Round to decimals | `round(3.14159, 2)` → `3.14` |
| `ceil` | Round up | `ceil(3.2)` → `4` |
| `floor` | Round down | `floor(3.8)` → `3` |
| `abs` | Absolute value | `abs(-5)` → `5` |
| `clamp` | Clamp to range | `clamp(10, 0, {max: 5})` → `5` |
| `power` | Raise to power | `power(2, 3)` → `8` |
| `sqrt` | Square root | `sqrt(16)` → `4` |
| `toPercent` | Convert to % | `toPercent(0.5, _, {asDecimal: true})` → `50` |
| `mapRange` | Map to range | `mapRange(5, 0, {fromMax: 10, toMin: 0, toMax: 100})` → `50` |

### Date Transforms

| Function | Description | Example |
|----------|-------------|---------|
| `toISO` | ISO 8601 format | `toISO(date)` → `'2024-01-01T00:00:00.000Z'` |
| `formatDate` | Locale date string | `formatDate(date, _, {locale: 'en-US'})` |
| `formatTime` | Locale time string | `formatTime(date)` |
| `toUnix` | Unix timestamp (sec) | `toUnix(date)` → `1704067200` |
| `fromUnix` | Parse Unix timestamp | `fromUnix(1704067200)` |
| `addTime` | Add duration | `addTime(date, 7, {unit: 'days'})` |
| `subtractTime` | Subtract duration | `subtractTime(date, 1, {unit: 'hours'})` |
| `startOf` | Start of period | `startOf(date, 'day')` |
| `endOf` | End of period | `endOf(date, 'month')` |
| `dateDiff` | Date difference | `dateDiff(date1, date2, {unit: 'days'})` |

### Array Transforms

| Function | Description | Example |
|----------|-------------|---------|
| `map` | Map elements | `map([1,2,3], x => x*2)` → `[2,4,6]` |
| `filter` | Filter elements | `filter([1,2,3], x => x > 1)` → `[2,3]` |
| `unique` | Remove duplicates | `unique([1,2,2,3])` → `[1,2,3]` |
| `sort` | Sort array | `sort([3,1,2])` → `[1,2,3]` |
| `reverse` | Reverse array | `reverse([1,2,3])` → `[3,2,1]` |
| `chunk` | Split into chunks | `chunk([1,2,3,4], 2)` → `[[1,2],[3,4]]` |
| `take` | Take first N | `take([1,2,3], 2)` → `[1,2]` |
| `skip` | Skip first N | `skip([1,2,3], 1)` → `[2,3]` |
| `flatten` | Flatten nested | `flatten([[1,2],[3,4]])` → `[1,2,3,4]` |
| `compact` | Remove falsy | `compact([1,0,2,null])` → `[1,2]` |
| `groupBy` | Group by key | `groupBy(users, 'role')` |

### Object Transforms

| Function | Description | Example |
|----------|-------------|---------|
| `pick` | Pick properties | `pick(obj, ['name', 'email'])` |
| `omit` | Omit properties | `omit(obj, ['password'])` |
| `flattenObject` | Flatten nested | `{a: {b: 1}}` → `{'a.b': 1}` |
| `unflattenObject` | Unflatten | `{'a.b': 1}` → `{a: {b: 1}}` |
| `merge` | Merge objects | `merge(obj1, obj2, {deep: true})` |
| `renameKeys` | Rename keys | `renameKeys(obj, {old: 'new'})` |
| `mapValues` | Map values | `mapValues(obj, v => v * 2)` |
| `mapKeys` | Map keys | `mapKeys(obj, k => k.toUpperCase())` |
| `clone` | Deep clone | `clone(obj)` |
| `restructure` | Restructure | `restructure(obj, template)` |

## Advanced Features

### Transform Composition

Combine multiple transform configurations:

```javascript
import { transforms } from 'zod-to-from/core/transforms';

const baseTransform = {
  mapping: { old_field: 'newField' }
};

const stringTransform = {
  transforms: [
    { field: 'newField', fn: 'uppercase' }
  ]
};

const composed = transforms.compose(baseTransform, stringTransform);
```

### Transform Templates

Create reusable transform configurations:

```javascript
import { transforms } from 'zod-to-from/core/transforms';

const userTransform = transforms.createTemplate('user', {
  mapping: {
    'first_name': 'firstName',
    'last_name': 'lastName'
  },
  transforms: [
    { field: 'firstName', fn: 'capitalize' },
    { field: 'lastName', fn: 'capitalize' }
  ]
});

// Use template
const result = await userTransform.apply(userData);
```

### Transform Testing

Test transforms with sample data before deploying:

```javascript
import { transforms } from 'zod-to-from/core/transforms';

const config = {
  transforms: [
    { field: 'age', fn: 'multiply', value: 2 }
  ],
  validate: z.object({ age: z.number().max(100) })
};

const samples = [
  { age: 20 }, // Valid: 20 * 2 = 40
  { age: 30 }, // Valid: 30 * 2 = 60
  { age: 60 }, // Invalid: 60 * 2 = 120
];

const testResult = await transforms.test(config, samples);

console.log(testResult.summary);
// {
//   total: 3,
//   success: 2,
//   failure: 1,
//   successRate: 66.67
// }
```

### Custom Transforms

Register your own transform functions:

```javascript
import { transforms } from 'zod-to-from/core/transforms';

// Register globally
transforms.register('double', (value) => value * 2);
transforms.register('addPrefix', (value, prefix) => `${prefix}${value}`);

// Use in config
const config = {
  transforms: [
    { field: 'count', fn: 'double' },
    { field: 'name', fn: 'addPrefix', value: 'Mr. ' }
  ]
};

// Or inline in config
const config = {
  custom: {
    triple: (value) => value * 3
  },
  transforms: [
    { field: 'value', fn: 'triple' }
  ]
};
```

### Bidirectional Transforms

Enable automatic reverse mapping:

```javascript
const config = {
  mapping: {
    'snake_case_field': 'camelCaseField',
    'old_name': 'newName'
  },
  bidirectional: true
};

const result = await applyTransform(data, config);

// result.reverseConfig contains:
// {
//   mapping: {
//     'camelCaseField': 'snake_case_field',
//     'newName': 'old_name'
//   }
// }
```

## Integration with zod-to-from

### With fromJson/toJson

```javascript
import { fromJson, toJson } from 'zod-to-from';

const transform = {
  mapping: { old_field: 'newField' },
  transforms: [{ field: 'newField', fn: 'uppercase' }]
};

// Apply during parsing
const data = await fromJson(schema, jsonString, { transform });

// Apply during formatting
const output = await toJson(schema, data, { transform });
```

### With convert()

```javascript
import { convert } from 'zod-to-from';

const result = await convert(
  schema,
  { from: 'json', to: 'yaml' },
  input,
  {
    transform: {
      mapping: { json_field: 'yaml_field' },
      transforms: [{ field: 'yaml_field', fn: 'lowercase' }]
    }
  }
);
```

## Real-World Examples

### API Response Transformation

```javascript
const apiTransform = {
  mapping: {
    'user_id': 'userId',
    'first_name': 'firstName',
    'last_name': 'lastName',
    'created_at': 'createdAt',
    'updated_at': 'updatedAt'
  },
  transforms: [
    { field: 'firstName', fn: 'titleCase' },
    { field: 'lastName', fn: 'titleCase' },
    { field: 'createdAt', fn: 'toISO' },
    { field: 'updatedAt', fn: 'toISO' }
  ],
  validate: z.object({
    userId: z.number(),
    firstName: z.string(),
    lastName: z.string(),
    createdAt: z.string(),
    updatedAt: z.string()
  })
};
```

### E-commerce Price Conversion

```javascript
const priceTransform = {
  conditionals: [
    {
      if: (data) => data.currency === 'USD',
      then: [
        { field: 'price', fn: 'multiply', value: 1.0 }
      ]
    },
    {
      if: (data) => data.currency === 'EUR',
      then: [
        { field: 'price', fn: 'multiply', value: 0.85 }
      ]
    }
  ],
  transforms: [
    { field: 'price', fn: 'round', value: 2 },
    { field: 'currency', fn: 'uppercase' }
  ]
};
```

### Data Sanitization

```javascript
const sanitizeTransform = {
  transforms: [
    // Clean strings
    { field: 'email', fn: 'lowercase' },
    { field: 'email', fn: 'trim' },
    { field: 'phone', fn: 'alphanumeric' },

    // Normalize numbers
    { field: 'price', fn: 'abs' },
    { field: 'quantity', fn: 'floor' },

    // Remove sensitive data
    { field: 'user', fn: 'omit', value: ['password', 'ssn'] }
  ]
};
```

## Performance Considerations

- **Lazy Evaluation**: Transforms are applied in order, one at a time
- **Immutability**: Original data is never modified
- **Error Handling**: Errors are collected, not thrown
- **Validation**: Schema validation happens after all transforms

## Best Practices

1. **Order Matters**: Transforms execute in sequence
2. **Test First**: Use `transforms.test()` before production
3. **Validate Output**: Always include schema validation
4. **Compose Configs**: Break complex transforms into reusable pieces
5. **Custom Functions**: Register frequently used transforms globally
6. **Error Handling**: Check `result.errors` for issues

## API Reference

### Core Functions

```typescript
// Apply transform configuration
applyTransform(data: any, config: TransformConfig): Promise<TransformResult>

// Test transforms with samples
testTransform(config: TransformConfig, samples: any[]): Promise<TestResult>

// Compose multiple configs
composeTransforms(...configs: TransformConfig[]): TransformConfig

// Create reusable template
createTransformTemplate(name: string, config: TransformConfig): Template

// Register custom function
registerTransform(name: string, fn: Function): void

// List available transforms
listTransforms(): string[]
```

### Type Definitions

```typescript
interface TransformConfig {
  mapping?: { [source: string]: string };
  transforms?: TransformRule[];
  conditionals?: ConditionalTransform[];
  custom?: { [name: string]: Function };
  validate?: ZodSchema;
  bidirectional?: boolean;
}

interface TransformRule {
  field: string;
  fn: string;
  value?: any;
  options?: any;
}

interface TransformResult {
  data: any;
  metadata?: {
    appliedRules: number;
    appliedMappings: number;
    hasErrors: boolean;
  };
  errors?: string[];
  reverseConfig?: TransformConfig;
}
```

## Related Features

- **Schema Validation**: All transforms support Zod validation
- **Adapters**: Works with all 47 data format adapters
- **Provenance**: Track transform metadata with `includeProvenance`
- **Streaming**: Compatible with streaming adapters

## Support

For questions or issues:
- GitHub Issues: https://github.com/seanchatmangpt/zod-to-from/issues
- Documentation: https://github.com/seanchatmangpt/zod-to-from#readme

---

**Implemented by**: Agent 9 - Declarative Transforms Specialist
**Version**: v2.0.0
**Last Updated**: 2025-12-27
