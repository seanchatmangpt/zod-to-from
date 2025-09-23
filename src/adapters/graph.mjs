/**
 * @typedef {import('../core/index.mjs').Adapter} Adapter
 */

import { createPackManifest, registerPack } from '../core/index.mjs';

/**
 * JSON-LD adapter for parsing and formatting JSON-LD data
 */
const jsonldAdapter = {
  async parse(input, opts = {}) {
    try {
      const jsonld = await import('jsonld');
      const data = JSON.parse(input);
      
      // Expand the JSON-LD to get normalized form
      const expanded = await jsonld.expand(data);
      
      return {
        data: expanded,
        metadata: {
          format: 'jsonld',
        context: data['@context'] || undefined,
        type: data['@type'] || undefined,
        id: data['@id'] || undefined,
          ...opts,
        },
      };
    } catch (error) {
      throw new Error(`Invalid JSON-LD: ${error.message}`);
    }
  },

  async format(data, opts = {}) {
    try {
      const jsonld = await import('jsonld');
      const { context = undefined, compact = true } = opts;
      
      let result;
      result = compact && context ? (await jsonld.compact(data, context)) : data;
      
      const json = JSON.stringify(result, null, 2);
      
      return {
        data: json,
        metadata: {
          format: 'jsonld',
          outputSize: json.length,
          compacted: compact && Boolean(context),
          ...opts,
        },
      };
    } catch (error) {
      throw new Error(`JSON-LD formatting failed: ${error.message}`);
    }
  },

  supportsStreaming: false,
  isAI: false,
  version: '1.0.0',
};

/**
 * N-Quads adapter for parsing and formatting N-Quads data
 */
const nqAdapter = {
  async parse(input, opts = {}) {
    try {
      const { Parser } = await import('n3');
      const parser = new Parser({ format: 'N-Quads' });
      const quads = [];
      
      parser.on('data', quad => quads.push(quad));
      
      return new Promise((resolve, reject) => {
        parser.on('end', () => {
          const data = quads.map(quad => ({
            subject: quad.subject.value,
            predicate: quad.predicate.value,
            object: quad.object.value,
            graph: quad.graph ? quad.graph.value : undefined,
          }));
          
          resolve({
            data,
            metadata: {
              format: 'nq',
              quadCount: quads.length,
              ...opts,
            },
          });
        });
        
        parser.on('error', reject);
        parser.write(input);
        parser.end();
      });
    } catch (error) {
      throw new Error(`Invalid N-Quads: ${error.message}`);
    }
  },

  async format(data, opts = {}) {
    try {
      const { Writer } = await import('n3');
      const writer = new Writer({ format: 'N-Quads' });
      
      for (const quad of data) {
        writer.addQuad(
          writer.blankNode(quad.subject) || writer.namedNode(quad.subject),
          writer.namedNode(quad.predicate),
          writer.blankNode(quad.object) || writer.namedNode(quad.object) || writer.literal(quad.object),
          quad.graph ? writer.namedNode(quad.graph) : undefined
        );
      }
      
      const nquads = await writer.end();
      
      return {
        data: nquads,
        metadata: {
          format: 'nq',
          outputSize: nquads.length,
          quadCount: data.length,
          ...opts,
        },
      };
    } catch (error) {
      throw new Error(`N-Quads formatting failed: ${error.message}`);
    }
  },

  supportsStreaming: true,
  isAI: false,
  version: '1.0.0',
};

/**
 * PlantUML adapter for parsing and formatting PlantUML diagrams
 */
const plantumlAdapter = {
  async parse(input, opts = {}) {
    // Simple PlantUML parsing - extract basic structure
    const lines = input.split('\n');
    const data = {
      type: 'unknown',
      title: '',
      participants: [],
      relationships: [],
      notes: [],
      raw: input,
    };

    for (const line of lines) {
      const trimmed = line.trim();
      
      if (trimmed.startsWith('@startuml')) {
        data.type = 'diagram';
        continue;
      }
      
      if (trimmed.startsWith('@enduml')) {
        break;
      }
      
      if (trimmed.startsWith('title')) {
        data.title = trimmed.replace(/^title\s+/, '');
        continue;
      }
      
      if (trimmed.includes('->') || trimmed.includes('-->')) {
        data.relationships.push(trimmed);
        continue;
      }
      
      if (trimmed.startsWith('participant') || trimmed.startsWith('actor')) {
        const match = trimmed.match(/(participant|actor)\s+(\w+)/);
        if (match) {
          data.participants.push({ type: match[1], name: match[2] });
        }
        continue;
      }
      
      if (trimmed.startsWith('note')) {
        data.notes.push(trimmed);
        continue;
      }
    }

    return {
      data,
      metadata: {
        format: 'plantuml',
        type: data.type,
        participantCount: data.participants.length,
        relationshipCount: data.relationships.length,
        ...opts,
      },
    };
  },

  async format(data, opts = {}) {
    const { type = 'diagram', title = '', participants = [], relationships = [], notes = [] } = data;
    
    let plantuml = '@startuml\n';
    
    if (title) {
      plantuml += `title ${title}\n`;
    }
    
    for (const participant of participants) {
      plantuml += `${participant.type} ${participant.name}\n`;
    }
    
    for (const relationship of relationships) {
      plantuml += `${relationship}\n`;
    }
    
    for (const note of notes) {
      plantuml += `${note}\n`;
    }
    
    plantuml += '@enduml';
    
    return {
      data: plantuml,
      metadata: {
        format: 'plantuml',
        outputSize: plantuml.length,
        type,
        ...opts,
      },
    };
  },

  supportsStreaming: false,
  isAI: false,
  version: '1.0.0',
};

/**
 * RDF/XML adapter placeholder
 * Note: Would require rdfxml-streaming-parser library
 */
const rdfxmlAdapter = {
  async parse(input, opts = {}) {
    throw new Error('RDF/XML support requires additional dependencies (rdfxml-streaming-parser)');
  },

  async format(data, opts = {}) {
    throw new Error('RDF/XML support requires additional dependencies (rdfxml-streaming-parser)');
  },

  supportsStreaming: true,
  isAI: false,
  version: '1.0.0',
};

/**
 * Turtle adapter for parsing and formatting Turtle data
 */
const ttlAdapter = {
  async parse(input, opts = {}) {
    try {
      const { Parser } = await import('n3');
      const parser = new Parser({ format: 'Turtle' });
      const quads = [];
      
      parser.on('data', quad => quads.push(quad));
      
      return new Promise((resolve, reject) => {
        parser.on('end', () => {
          const data = quads.map(quad => ({
            subject: quad.subject.value,
            predicate: quad.predicate.value,
            object: quad.object.value,
            graph: quad.graph ? quad.graph.value : undefined,
          }));
          
          resolve({
            data,
            metadata: {
              format: 'ttl',
              quadCount: quads.length,
              ...opts,
            },
          });
        });
        
        parser.on('error', reject);
        parser.write(input);
        parser.end();
      });
    } catch (error) {
      throw new Error(`Invalid Turtle: ${error.message}`);
    }
  },

  async format(data, opts = {}) {
    try {
      const { Writer } = await import('n3');
      const writer = new Writer({ format: 'Turtle' });
      
      for (const quad of data) {
        writer.addQuad(
          writer.blankNode(quad.subject) || writer.namedNode(quad.subject),
          writer.namedNode(quad.predicate),
          writer.blankNode(quad.object) || writer.namedNode(quad.object) || writer.literal(quad.object),
          quad.graph ? writer.namedNode(quad.graph) : undefined
        );
      }
      
      const turtle = await writer.end();
      
      return {
        data: turtle,
        metadata: {
          format: 'ttl',
          outputSize: turtle.length,
          quadCount: data.length,
          ...opts,
        },
      };
    } catch (error) {
      throw new Error(`Turtle formatting failed: ${error.message}`);
    }
  },

  supportsStreaming: true,
  isAI: false,
  version: '1.0.0',
};

// Create pack manifest
const packManifest = createPackManifest(
  'ztf-pack-graph',
  ['jsonld', 'nq', 'plantuml', 'rdfxml', 'ttl'],
  {
    version: '1.0.0',
    description: 'Graph & Knowledge format adapters for ZTF',
    dependencies: ['jsonld', 'n3'],
  }
);

// Register all adapters
const adapters = {
  jsonld: jsonldAdapter,
  nq: nqAdapter,
  plantuml: plantumlAdapter,
  rdfxml: rdfxmlAdapter,
  ttl: ttlAdapter,
};

registerPack(packManifest, adapters);

export {
  jsonldAdapter,
  nqAdapter,
  plantumlAdapter,
  rdfxmlAdapter,
  ttlAdapter,
};
