/**
 * Provenance Query System - Query language and aggregations
 * @fileoverview Powerful query language for provenance data with aggregations and filtering
 */

import { getAllProvenance } from './provenance.mjs';

/**
 * Query builder for provenance data
 */
class ProvenanceQuery {
  constructor() {
    this.filters = [];
    this.aggregations = [];
    this.sortOptions = null;
    this.limitValue = null;
    this.offsetValue = 0;
  }

  /**
   * Filter by field value
   * @param {string} field - Field name
   * @param {any} value - Field value
   * @returns {ProvenanceQuery} This query for chaining
   */
  where(field, value) {
    this.filters.push({ type: 'equals', field, value });
    return this;
  }

  /**
   * Filter by field containing value
   * @param {string} field - Field name
   * @param {any} value - Value to search for
   * @returns {ProvenanceQuery} This query for chaining
   */
  contains(field, value) {
    this.filters.push({ type: 'contains', field, value });
    return this;
  }

  /**
   * Filter by date range
   * @param {Date|string} start - Start date
   * @param {Date|string} end - End date
   * @returns {ProvenanceQuery} This query for chaining
   */
  between(start, end) {
    const startDate = typeof start === 'string' ? new Date(start) : start;
    const endDate = typeof end === 'string' ? new Date(end) : end;
    this.filters.push({ type: 'dateRange', start: startDate, end: endDate });
    return this;
  }

  /**
   * Filter by records after a date
   * @param {Date|string} date - Date threshold
   * @returns {ProvenanceQuery} This query for chaining
   */
  after(date) {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    this.filters.push({ type: 'after', date: dateObj });
    return this;
  }

  /**
   * Filter by records before a date
   * @param {Date|string} date - Date threshold
   * @returns {ProvenanceQuery} This query for chaining
   */
  before(date) {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    this.filters.push({ type: 'before', date: dateObj });
    return this;
  }

  /**
   * Filter by adapter type
   * @param {string} adapter - Adapter name
   * @returns {ProvenanceQuery} This query for chaining
   */
  adapter(adapter) {
    return this.where('adapter', adapter);
  }

  /**
   * Filter by user
   * @param {string} userId - User ID
   * @returns {ProvenanceQuery} This query for chaining
   */
  user(userId) {
    this.filters.push({ type: 'user', userId });
    return this;
  }

  /**
   * Filter by AI model
   * @param {string} model - AI model name
   * @returns {ProvenanceQuery} This query for chaining
   */
  aiModel(model) {
    this.filters.push({ type: 'aiModel', model });
    return this;
  }

  /**
   * Filter by performance criteria
   * @param {Object} criteria - Performance criteria
   * @param {number} [criteria.minDuration] - Minimum duration
   * @param {number} [criteria.maxDuration] - Maximum duration
   * @param {number} [criteria.minMemory] - Minimum memory
   * @param {number} [criteria.maxMemory] - Maximum memory
   * @returns {ProvenanceQuery} This query for chaining
   */
  performance(criteria) {
    this.filters.push({ type: 'performance', criteria });
    return this;
  }

  /**
   * Group results by field
   * @param {string} field - Field to group by
   * @returns {ProvenanceQuery} This query for chaining
   */
  groupBy(field) {
    this.aggregations.push({ type: 'groupBy', field });
    return this;
  }

  /**
   * Add aggregation function
   * @param {Object} aggregations - Aggregation functions
   * @returns {ProvenanceQuery} This query for chaining
   */
  aggregate(aggregations) {
    this.aggregations.push({ type: 'aggregate', functions: aggregations });
    return this;
  }

  /**
   * Sort results
   * @param {string} field - Field to sort by
   * @param {string} [order='asc'] - Sort order ('asc' or 'desc')
   * @returns {ProvenanceQuery} This query for chaining
   */
  sort(field, order = 'asc') {
    this.sortOptions = { field, order };
    return this;
  }

  /**
   * Limit number of results
   * @param {number} limit - Maximum number of results
   * @returns {ProvenanceQuery} This query for chaining
   */
  limit(limit) {
    this.limitValue = limit;
    return this;
  }

  /**
   * Offset results
   * @param {number} offset - Number of results to skip
   * @returns {ProvenanceQuery} This query for chaining
   */
  offset(offset) {
    this.offsetValue = offset;
    return this;
  }

  /**
   * Apply filters to provenance entries
   * @param {Array} entries - Provenance entries
   * @returns {Array} Filtered entries
   */
  applyFilters(entries) {
    let filtered = entries;

    for (const filter of this.filters) {
      switch (filter.type) {
        case 'equals': {
          filtered = filtered.filter((entry) => {
            const value = this.getNestedValue(entry, filter.field);
            return value === filter.value;
          });
          break;
        }
        case 'contains': {
          filtered = filtered.filter((entry) => {
            const value = this.getNestedValue(entry, filter.field);
            if (typeof value === 'string') {
              return value.includes(filter.value);
            }
            if (Array.isArray(value)) {
              return value.includes(filter.value);
            }
            return false;
          });
          break;
        }
        case 'dateRange': {
          filtered = filtered.filter((entry) => {
            const date = new Date(entry.timestamp);
            return date >= filter.start && date <= filter.end;
          });
          break;
        }
        case 'after': {
          filtered = filtered.filter((entry) => {
            const date = new Date(entry.timestamp);
            return date > filter.date;
          });
          break;
        }
        case 'before': {
          filtered = filtered.filter((entry) => {
            const date = new Date(entry.timestamp);
            return date < filter.date;
          });
          break;
        }
        case 'user': {
          filtered = filtered.filter((entry) => entry.user?.id === filter.userId);
          break;
        }
        case 'aiModel': {
          filtered = filtered.filter((entry) => entry.ai?.model === filter.model);
          break;
        }
        case 'performance': {
          filtered = filtered.filter((entry) => {
            if (!entry.performance) return false;

            const { minDuration, maxDuration, minMemory, maxMemory } = filter.criteria;

            if (minDuration && entry.performance.duration < minDuration) return false;
            if (maxDuration && entry.performance.duration > maxDuration) return false;
            if (minMemory && entry.performance.memory < minMemory) return false;
            if (maxMemory && entry.performance.memory > maxMemory) return false;

            return true;
          });
          break;
        }
      }
    }

    return filtered;
  }

  /**
   * Apply sorting to entries
   * @param {Array} entries - Entries to sort
   * @returns {Array} Sorted entries
   */
  applySorting(entries) {
    if (!this.sortOptions) {
      return entries;
    }

    const { field, order } = this.sortOptions;

    return [...entries].sort((a, b) => {
      const aVal = this.getNestedValue(a, field);
      const bVal = this.getNestedValue(b, field);

      let comparison = 0;
      if (aVal < bVal) comparison = -1;
      if (aVal > bVal) comparison = 1;

      return order === 'desc' ? -comparison : comparison;
    });
  }

  /**
   * Apply aggregations to entries
   * @param {Array} entries - Entries to aggregate
   * @returns {Object|Array} Aggregated results
   */
  applyAggregations(entries) {
    if (this.aggregations.length === 0) {
      return entries;
    }

    let result = entries;

    for (const agg of this.aggregations) {
      if (agg.type === 'groupBy') {
        result = this.groupByField(result, agg.field);
      } else if (agg.type === 'aggregate') {
        result = this.applyAggregateFunctions(result, agg.functions);
      }
    }

    return result;
  }

  /**
   * Group entries by field
   * @param {Array} entries - Entries to group
   * @param {string} field - Field to group by
   * @returns {Object} Grouped entries
   */
  groupByField(entries, field) {
    const groups = {};

    for (const entry of entries) {
      const key = this.getNestedValue(entry, field) || 'undefined';
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(entry);
    }

    return groups;
  }

  /**
   * Apply aggregate functions
   * @param {Object|Array} data - Data to aggregate
   * @param {Object} functions - Aggregate functions
   * @returns {Object} Aggregated results
   */
  applyAggregateFunctions(data, functions) {
    const isGrouped = !Array.isArray(data);

    if (isGrouped) {
      const result = {};
      for (const [key, entries] of Object.entries(data)) {
        result[key] = this.computeAggregates(entries, functions);
      }
      return result;
    }

    return this.computeAggregates(data, functions);
  }

  /**
   * Compute aggregate values
   * @param {Array} entries - Entries to aggregate
   * @param {Object} functions - Aggregate functions
   * @returns {Object} Computed aggregates
   */
  computeAggregates(entries, functions) {
    const result = {};

    for (const [name, func] of Object.entries(functions)) {
      result[name] = func(entries);
    }

    return result;
  }

  /**
   * Get nested value from object
   * @param {Object} obj - Object to get value from
   * @param {string} path - Dot-separated path
   * @returns {any} Value at path
   */
  getNestedValue(obj, path) {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  /**
   * Execute query and return results as array
   * @returns {Array} Query results
   */
  toArray() {
    let entries = getAllProvenance();

    // Apply filters
    entries = this.applyFilters(entries);

    // Apply sorting
    entries = this.applySorting(entries);

    // Apply aggregations
    const result = this.applyAggregations(entries);

    // If aggregated, return as-is
    if (!Array.isArray(result)) {
      return result;
    }

    // Apply offset and limit
    const start = this.offsetValue;
    const end = this.limitValue ? start + this.limitValue : undefined;

    return result.slice(start, end);
  }

  /**
   * Execute query and return count
   * @returns {number} Number of matching entries
   */
  count() {
    const entries = getAllProvenance();
    const filtered = this.applyFilters(entries);
    return filtered.length;
  }

  /**
   * Execute query and return first result
   * @returns {Object|null} First matching entry
   */
  first() {
    const results = this.limit(1).toArray();
    return results.length > 0 ? results[0] : null;
  }
}

/**
 * Create a new provenance query
 * @returns {ProvenanceQuery} New query instance
 */
export function query() {
  return new ProvenanceQuery();
}

/**
 * Aggregation functions
 */
export const agg = {
  /**
   * Count entries
   * @returns {Function} Aggregation function
   */
  count() {
    return (entries) => entries.length;
  },

  /**
   * Sum field values
   * @param {string} field - Field to sum
   * @returns {Function} Aggregation function
   */
  sum(field) {
    return (entries) => {
      return entries.reduce((sum, entry) => {
        const value = field.split('.').reduce((current, key) => current?.[key], entry);
        return sum + (Number(value) || 0);
      }, 0);
    };
  },

  /**
   * Average field values
   * @param {string} field - Field to average
   * @returns {Function} Aggregation function
   */
  avg(field) {
    return (entries) => {
      const total = agg.sum(field)(entries);
      return entries.length > 0 ? total / entries.length : 0;
    };
  },

  /**
   * Minimum field value
   * @param {string} field - Field to find minimum
   * @returns {Function} Aggregation function
   */
  min(field) {
    return (entries) => {
      const values = entries
        .map((entry) => field.split('.').reduce((current, key) => current?.[key], entry))
        .filter((v) => v !== undefined);
      return values.length > 0 ? Math.min(...values) : undefined;
    };
  },

  /**
   * Maximum field value
   * @param {string} field - Field to find maximum
   * @returns {Function} Aggregation function
   */
  max(field) {
    return (entries) => {
      const values = entries
        .map((entry) => field.split('.').reduce((current, key) => current?.[key], entry))
        .filter((v) => v !== undefined);
      return values.length > 0 ? Math.max(...values) : undefined;
    };
  },

  /**
   * Collect unique values
   * @param {string} field - Field to collect
   * @returns {Function} Aggregation function
   */
  unique(field) {
    return (entries) => {
      const values = entries.map((entry) =>
        field.split('.').reduce((current, key) => current?.[key], entry)
      );
      return [...new Set(values)];
    };
  },
};

/**
 * Generate compliance report
 * @param {Object} options - Report options
 * @param {Date|string} [options.startDate] - Start date
 * @param {Date|string} [options.endDate] - End date
 * @param {string} [options.standard] - Compliance standard (GDPR, HIPAA, SOC2)
 * @returns {Object} Compliance report
 */
export async function generateComplianceReport(options = {}) {
  const { startDate, endDate, standard = 'GDPR' } = options;

  let q = query();

  if (startDate && endDate) {
    q = q.between(startDate, endDate);
  } else if (startDate) {
    q = q.after(startDate);
  }

  const entries = q.toArray();

  const report = {
    standard,
    period: {
      start: startDate || 'all',
      end: endDate || 'present',
    },
    totalOperations: entries.length,
    adapters: {},
    users: {},
    dataProcessing: {
      totalRecords: entries.length,
      aiProcessed: 0,
      signedEntries: 0,
      failedOperations: 0,
    },
    compliance: {},
  };

  // Analyze entries
  for (const entry of entries) {
    // Count by adapter
    report.adapters[entry.adapter] = (report.adapters[entry.adapter] || 0) + 1;

    // Count by user
    if (entry.user?.id) {
      report.users[entry.user.id] = (report.users[entry.user.id] || 0) + 1;
    }

    // AI processing
    if (entry.ai) {
      report.dataProcessing.aiProcessed++;
    }

    // Signed entries
    if (entry.signature) {
      report.dataProcessing.signedEntries++;
    }

    // Failed operations
    if (entry.metadata?.failed) {
      report.dataProcessing.failedOperations++;
    }
  }

  // Add standard-specific compliance info
  switch (standard) {
    case 'GDPR': {
      report.compliance = {
        dataMinimization: entries.length > 0,
        purposeLimitation: true,
        accuracyMaintained: report.dataProcessing.failedOperations === 0,
        storageWithAuditTrail: report.dataProcessing.signedEntries > 0,
      };
      break;
    }
    case 'HIPAA': {
      report.compliance = {
        auditControls: entries.length > 0,
        integrityControls: report.dataProcessing.signedEntries > 0,
        transmissionSecurity: true,
        accessControls: Object.keys(report.users).length > 0,
      };
      break;
    }
    case 'SOC2': {
      report.compliance = {
        logicalAndPhysicalAccess: true,
        systemOperations: report.dataProcessing.failedOperations < entries.length * 0.01,
        changeManagement: entries.length > 0,
        riskMitigation: report.dataProcessing.signedEntries > entries.length * 0.5,
      };
      break;
    }
  }

  return report;
}

/**
 * Generate visualization data for charts
 * @param {string} type - Chart type (timeline, adapter, performance)
 * @param {Object} [options] - Chart options
 * @returns {Object} Chart data
 */
export function generateVisualizationData(type, options = {}) {
  const entries = getAllProvenance();

  switch (type) {
    case 'timeline': {
      const grouped = {};
      for (const entry of entries) {
        const date = entry.timestamp.split('T')[0];
        grouped[date] = (grouped[date] || 0) + 1;
      }
      return {
        labels: Object.keys(grouped).sort(),
        data: Object.keys(grouped)
          .sort()
          .map((key) => grouped[key]),
      };
    }

    case 'adapter': {
      const counts = {};
      for (const entry of entries) {
        counts[entry.adapter] = (counts[entry.adapter] || 0) + 1;
      }
      return {
        labels: Object.keys(counts),
        data: Object.values(counts),
      };
    }

    case 'performance': {
      const durations = entries
        .filter((e) => e.performance?.duration)
        .map((e) => e.performance.duration);

      return {
        min: Math.min(...durations),
        max: Math.max(...durations),
        avg: durations.reduce((a, b) => a + b, 0) / durations.length,
        data: durations,
      };
    }

    default: {
      return {};
    }
  }
}
