/**
 * Provenance Export Formats - RDF and W3C PROV exports
 * @fileoverview Export provenance to JSON-LD, Turtle RDF, and W3C PROV formats
 */

import jsonld from 'jsonld';
import N3 from 'n3';

const { DataFactory } = N3;
const { namedNode, literal, quad } = DataFactory;

/**
 * Export provenance to JSON-LD format
 * @param {Object|Array} provenance - Provenance entry or array of entries
 * @param {Object} [options] - Export options
 * @returns {Promise<string>} JSON-LD string
 */
export async function exportToJSONLD(provenance, options = {}) {
  const entries = Array.isArray(provenance) ? provenance : [provenance];

  const context = {
    '@vocab': 'http://www.w3.org/ns/prov#',
    prov: 'http://www.w3.org/ns/prov#',
    ztf: 'http://zod-to-from.org/provenance#',
    xsd: 'http://www.w3.org/2001/XMLSchema#',
    id: '@id',
    type: '@type',
    Activity: 'prov:Activity',
    Entity: 'prov:Entity',
    Agent: 'prov:Agent',
    wasGeneratedBy: 'prov:wasGeneratedBy',
    used: 'prov:used',
    wasAssociatedWith: 'prov:wasAssociatedWith',
    startedAtTime: {
      '@id': 'prov:startedAtTime',
      '@type': 'xsd:dateTime',
    },
    endedAtTime: {
      '@id': 'prov:endedAtTime',
      '@type': 'xsd:dateTime',
    },
  };

  const graph = entries.flatMap((entry) => {
    const activityId = `ztf:activity/${entry.id}`;
    const entityId = `ztf:entity/${entry.id}`;

    const activity = {
      '@id': activityId,
      '@type': 'Activity',
      'prov:startedAtTime': entry.timestamp,
      'ztf:adapter': entry.adapter,
      'ztf:version': entry.version,
    };

    if (entry.sourceFormat) {
      activity['ztf:sourceFormat'] = entry.sourceFormat;
    }

    if (entry.targetFormat) {
      activity['ztf:targetFormat'] = entry.targetFormat;
    }

    if (entry.performance) {
      activity['ztf:duration'] = entry.performance.duration;
      if (entry.performance.memory) {
        activity['ztf:memoryUsed'] = entry.performance.memory;
      }
    }

    if (entry.ai) {
      activity['ztf:aiModel'] = entry.ai.model;
      if (entry.ai.cost) {
        activity['ztf:aiCost'] = entry.ai.cost;
      }
      if (entry.ai.tokens) {
        activity['ztf:aiTokens'] = entry.ai.tokens;
      }
    }

    if (entry.user) {
      activity['prov:wasAssociatedWith'] = {
        '@id': `ztf:agent/${entry.user.id}`,
        '@type': 'Agent',
        'ztf:userName': entry.user.name || entry.user.id,
      };
    }

    if (entry.environment) {
      activity['ztf:environment'] = {
        'ztf:os': entry.environment.os,
        'ztf:runtime': entry.environment.runtime,
        'ztf:platform': entry.environment.platform,
      };
    }

    const entity = {
      '@id': entityId,
      '@type': 'Entity',
      'prov:wasGeneratedBy': activityId,
    };

    if (entry.dataHash) {
      entity['ztf:dataHash'] = entry.dataHash;
    }

    if (entry.schemaHash) {
      entity['ztf:schemaHash'] = entry.schemaHash;
    }

    if (entry.signature) {
      entity['ztf:signature'] = entry.signature;
    }

    return [activity, entity];
  });

  const document = {
    '@context': context,
    '@graph': graph,
  };

  if (options.compact !== false) {
    const compacted = await jsonld.compact(document, context);
    return JSON.stringify(compacted, null, 2);
  }

  return JSON.stringify(document, null, 2);
}

/**
 * Export provenance to Turtle RDF format
 * @param {Object|Array} provenance - Provenance entry or array of entries
 * @returns {Promise<string>} Turtle RDF string
 */
export async function exportToTurtle(provenance) {
  const entries = Array.isArray(provenance) ? provenance : [provenance];
  const writer = new N3.Writer({
    prefixes: {
      prov: 'http://www.w3.org/ns/prov#',
      ztf: 'http://zod-to-from.org/provenance#',
      xsd: 'http://www.w3.org/2001/XMLSchema#',
    },
  });

  for (const entry of entries) {
    const activityNode = namedNode(`ztf:activity/${entry.id}`);
    const entityNode = namedNode(`ztf:entity/${entry.id}`);

    // Activity triples
    writer.addQuad(quad(activityNode, namedNode('http://www.w3.org/1999/02/22-rdf-syntax-ns#type'), namedNode('prov:Activity')));
    writer.addQuad(quad(activityNode, namedNode('prov:startedAtTime'), literal(entry.timestamp, namedNode('xsd:dateTime'))));
    writer.addQuad(quad(activityNode, namedNode('ztf:adapter'), literal(entry.adapter)));
    writer.addQuad(quad(activityNode, namedNode('ztf:version'), literal(entry.version)));

    if (entry.sourceFormat) {
      writer.addQuad(quad(activityNode, namedNode('ztf:sourceFormat'), literal(entry.sourceFormat)));
    }

    if (entry.targetFormat) {
      writer.addQuad(quad(activityNode, namedNode('ztf:targetFormat'), literal(entry.targetFormat)));
    }

    if (entry.performance) {
      writer.addQuad(quad(activityNode, namedNode('ztf:duration'), literal(entry.performance.duration.toString(), namedNode('xsd:integer'))));
      if (entry.performance.memory) {
        writer.addQuad(quad(activityNode, namedNode('ztf:memoryUsed'), literal(entry.performance.memory.toString(), namedNode('xsd:integer'))));
      }
    }

    if (entry.ai) {
      writer.addQuad(quad(activityNode, namedNode('ztf:aiModel'), literal(entry.ai.model)));
      if (entry.ai.cost) {
        writer.addQuad(quad(activityNode, namedNode('ztf:aiCost'), literal(entry.ai.cost.toString(), namedNode('xsd:decimal'))));
      }
      if (entry.ai.tokens) {
        writer.addQuad(quad(activityNode, namedNode('ztf:aiTokens'), literal(entry.ai.tokens.toString(), namedNode('xsd:integer'))));
      }
    }

    if (entry.user) {
      const agentNode = namedNode(`ztf:agent/${entry.user.id}`);
      writer.addQuad(quad(agentNode, namedNode('http://www.w3.org/1999/02/22-rdf-syntax-ns#type'), namedNode('prov:Agent')));
      writer.addQuad(quad(agentNode, namedNode('ztf:userName'), literal(entry.user.name || entry.user.id)));
      writer.addQuad(quad(activityNode, namedNode('prov:wasAssociatedWith'), agentNode));
    }

    // Entity triples
    writer.addQuad(quad(entityNode, namedNode('http://www.w3.org/1999/02/22-rdf-syntax-ns#type'), namedNode('prov:Entity')));
    writer.addQuad(quad(entityNode, namedNode('prov:wasGeneratedBy'), activityNode));

    if (entry.dataHash) {
      writer.addQuad(quad(entityNode, namedNode('ztf:dataHash'), literal(entry.dataHash)));
    }

    if (entry.schemaHash) {
      writer.addQuad(quad(entityNode, namedNode('ztf:schemaHash'), literal(entry.schemaHash)));
    }

    if (entry.signature) {
      writer.addQuad(quad(entityNode, namedNode('ztf:signature'), literal(entry.signature)));
    }
  }

  return new Promise((resolve, reject) => {
    writer.end((error, result) => {
      if (error) {
        reject(error);
      } else {
        resolve(result);
      }
    });
  });
}

/**
 * Export provenance to W3C PROV-JSON format
 * @param {Object|Array} provenance - Provenance entry or array of entries
 * @returns {Object} PROV-JSON object
 */
export function exportToProvJSON(provenance) {
  const entries = Array.isArray(provenance) ? provenance : [provenance];

  const doc = {
    prefix: {
      prov: 'http://www.w3.org/ns/prov#',
      ztf: 'http://zod-to-from.org/provenance#',
      xsd: 'http://www.w3.org/2001/XMLSchema#',
    },
    entity: {},
    activity: {},
    agent: {},
    wasGeneratedBy: {},
    used: {},
    wasAssociatedWith: {},
  };

  for (const entry of entries) {
    const activityId = `ztf:activity/${entry.id}`;
    const entityId = `ztf:entity/${entry.id}`;

    // Activity
    doc.activity[activityId] = {
      'prov:startTime': entry.timestamp,
      'ztf:adapter': entry.adapter,
      'ztf:version': entry.version,
    };

    if (entry.sourceFormat) {
      doc.activity[activityId]['ztf:sourceFormat'] = entry.sourceFormat;
    }

    if (entry.targetFormat) {
      doc.activity[activityId]['ztf:targetFormat'] = entry.targetFormat;
    }

    if (entry.performance) {
      doc.activity[activityId]['ztf:duration'] = entry.performance.duration;
      if (entry.performance.memory) {
        doc.activity[activityId]['ztf:memoryUsed'] = entry.performance.memory;
      }
    }

    if (entry.ai) {
      doc.activity[activityId]['ztf:aiModel'] = entry.ai.model;
      if (entry.ai.cost) {
        doc.activity[activityId]['ztf:aiCost'] = entry.ai.cost;
      }
      if (entry.ai.tokens) {
        doc.activity[activityId]['ztf:aiTokens'] = entry.ai.tokens;
      }
    }

    // Entity
    doc.entity[entityId] = {};

    if (entry.dataHash) {
      doc.entity[entityId]['ztf:dataHash'] = entry.dataHash;
    }

    if (entry.schemaHash) {
      doc.entity[entityId]['ztf:schemaHash'] = entry.schemaHash;
    }

    if (entry.signature) {
      doc.entity[entityId]['ztf:signature'] = entry.signature;
    }

    // Relations
    doc.wasGeneratedBy[`${entityId}_gen`] = {
      'prov:entity': entityId,
      'prov:activity': activityId,
      'prov:time': entry.timestamp,
    };

    // Agent
    if (entry.user) {
      const agentId = `ztf:agent/${entry.user.id}`;
      doc.agent[agentId] = {
        'ztf:userName': entry.user.name || entry.user.id,
      };

      doc.wasAssociatedWith[`${activityId}_assoc`] = {
        'prov:activity': activityId,
        'prov:agent': agentId,
      };
    }
  }

  return doc;
}

/**
 * Export provenance to W3C PROV-N format
 * @param {Object|Array} provenance - Provenance entry or array of entries
 * @returns {string} PROV-N notation string
 */
export function exportToProvN(provenance) {
  const entries = Array.isArray(provenance) ? provenance : [provenance];
  const lines = [];

  lines.push('document', '  prefix prov <http://www.w3.org/ns/prov#>', '  prefix ztf <http://zod-to-from.org/provenance#>', '  prefix xsd <http://www.w3.org/2001/XMLSchema#>', '');

  for (const entry of entries) {
    const activityId = `ztf:activity/${entry.id}`;
    const entityId = `ztf:entity/${entry.id}`;

    // Activity
    lines.push(`  activity(${activityId}, ${entry.timestamp}, -, [ztf:adapter="${entry.adapter}", ztf:version="${entry.version}"])`);

    // Entity
    const entityAttrs = [];
    if (entry.dataHash) {
      entityAttrs.push(`ztf:dataHash="${entry.dataHash}"`);
    }
    if (entry.schemaHash) {
      entityAttrs.push(`ztf:schemaHash="${entry.schemaHash}"`);
    }
    if (entry.signature) {
      entityAttrs.push(`ztf:signature="${entry.signature}"`);
    }

    lines.push(`  entity(${entityId}, [${entityAttrs.join(', ')}])`, `  wasGeneratedBy(${entityId}, ${activityId}, ${entry.timestamp})`);

    // Agent
    if (entry.user) {
      const agentId = `ztf:agent/${entry.user.id}`;
      lines.push(`  agent(${agentId}, [ztf:userName="${entry.user.name || entry.user.id}"])`, `  wasAssociatedWith(${activityId}, ${agentId})`);
    }

    lines.push('');
  }

  lines.push('endDocument');

  return lines.join('\n');
}

/**
 * Export provenance to specified format
 * @param {Object|Array} provenance - Provenance entry or array of entries
 * @param {string} format - Export format (jsonld, turtle, prov-json, prov-n)
 * @param {Object} [options] - Export options
 * @returns {Promise<string|Object>} Exported provenance
 */
export async function exportProvenance(provenance, format, options = {}) {
  switch (format.toLowerCase()) {
    case 'jsonld':
    case 'json-ld': {
      return exportToJSONLD(provenance, options);
    }
    case 'turtle':
    case 'ttl': {
      return exportToTurtle(provenance);
    }
    case 'prov-json':
    case 'provJson': {
      return exportToProvJSON(provenance);
    }
    case 'prov-n':
    case 'provN': {
      return exportToProvN(provenance);
    }
    default: {
      throw new Error(`Unsupported export format: ${format}`);
    }
  }
}
