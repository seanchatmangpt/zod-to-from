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
      result = compact && context ? await jsonld.compact(data, context) : data;

      const json = JSON.stringify(result, undefined, 2);

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
      const n3 = await import('n3');
      const parser = new n3.Parser({ format: 'N-Quads' });
      const quads = parser.parse(input);

      const data = quads.map(quad => ({
        subject: quad.subject.value,
        predicate: quad.predicate.value,
        object: quad.object.value,
        graph: quad.graph ? quad.graph.value : undefined,
      }));

      return {
        data,
        metadata: {
          format: 'nq',
          quadCount: quads.length,
          ...opts,
        },
      };
    } catch (error) {
      throw new Error(`Invalid N-Quads: ${error.message}`);
    }
  },

  async format(data, opts = {}) {
    try {
      const n3 = await import('n3');
      const writer = new n3.Writer({ format: 'N-Quads' });

      for (const quad of data) {
        const subject = quad.subject.startsWith('_:')
          ? n3.DataFactory.blankNode(quad.subject.slice(2))
          : n3.DataFactory.namedNode(quad.subject);

        const predicate = n3.DataFactory.namedNode(quad.predicate);

        let object;
        if (quad.object.startsWith('_:')) {
          object = n3.DataFactory.blankNode(quad.object.slice(2));
        } else if (quad.object.startsWith('http')) {
          object = n3.DataFactory.namedNode(quad.object);
        } else {
          object = n3.DataFactory.literal(quad.object);
        }

        const graph = quad.graph ? n3.DataFactory.namedNode(quad.graph) : undefined;

        writer.addQuad(subject, predicate, object, graph);
      }

      return new Promise((resolve, reject) => {
        writer.end((error, result) => {
          if (error) {
            reject(new Error(`N-Quads formatting failed: ${error.message}`));
          } else {
            resolve({
              data: result,
              metadata: {
                format: 'nq',
                outputSize: result.length,
                quadCount: data.length,
                ...opts,
              },
            });
          }
        });
      });
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
    const {
      type = 'diagram',
      title = '',
      participants = [],
      relationships = [],
      notes = [],
    } = data;

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
 * RDF/XML adapter - lightweight implementation for common patterns
 * Handles basic RDF/XML parsing and formatting without external dependencies
 *
 * Supports:
 * - rdf:Description elements with rdf:about attributes
 * - Predicate properties with rdf:resource (URI refs) or text (literals)
 * - Basic namespace handling
 *
 * Limitations:
 * - No support for rdf:parseType="Collection" or complex structures
 * - No support for rdf:nodeID (blank nodes with explicit IDs)
 * - Limited datatype handling for literals
 */
const rdfxmlAdapter = {
  async parse(input, opts = {}) {
    try {
      // Basic XML parsing using regex patterns (80/20 approach)
      const triples = [];

      // Extract namespace declarations from rdf:RDF root
      const nsMatches = input.matchAll(/xmlns:(\w+)="([^"]+)"/g);
      const namespaces = {};
      for (const match of nsMatches) {
        namespaces[match[1]] = match[2];
      }

      // Find all rdf:Description blocks
      const descriptionRegex = /<rdf:Description[^>]*rdf:about="([^"]+)"[^>]*>([\s\S]*?)<\/rdf:Description>/g;
      const descriptions = [...input.matchAll(descriptionRegex)];

      for (const [, subject, content] of descriptions) {
        // Extract predicates from the description content
        const predicateRegex = /<(\w+):(\w+)(?:\s+rdf:resource="([^"]+)"|[^>]*>([^<]+)<\/\w+:\w+>)/g;
        const predicates = [...content.matchAll(predicateRegex)];

        for (const [, ns, prop, resource, literal] of predicates) {
          const predicateUri = namespaces[ns]
            ? `${namespaces[ns]}${prop}`
            : `${ns}:${prop}`;

          triples.push({
            subject: subject,
            predicate: predicateUri,
            object: resource || literal.trim(),
            objectType: resource ? 'uri' : 'literal'
          });
        }
      }

      return {
        data: triples,
        metadata: {
          format: 'rdfxml',
          tripleCount: triples.length,
          namespaces,
          ...opts,
        },
      };
    } catch (error) {
      throw new Error(`Invalid RDF/XML: ${error.message}`);
    }
  },

  async format(data, opts = {}) {
    try {
      const {
        namespaces = {
          rdf: 'http://www.w3.org/1999/02/22-rdf-syntax-ns#',
          rdfs: 'http://www.w3.org/2000/01/rdf-schema#'
        },
        baseUri = ''
      } = opts;

      // Group triples by subject
      const subjectMap = new Map();
      for (const triple of data) {
        const subject = triple.subject || triple.s;
        if (!subjectMap.has(subject)) {
          subjectMap.set(subject, []);
        }
        subjectMap.get(subject).push(triple);
      }

      // Build namespace declarations
      const nsDeclarations = Object.entries(namespaces)
        .map(([prefix, uri]) => `xmlns:${prefix}="${uri}"`)
        .join('\n    ');

      // Build RDF/XML
      let rdfxml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
      rdfxml += `<rdf:RDF\n    ${nsDeclarations}>\n`;

      for (const [subject, triples] of subjectMap) {
        rdfxml += `  <rdf:Description rdf:about="${subject}">\n`;

        for (const triple of triples) {
          const predicate = triple.predicate || triple.p;
          const object = triple.object || triple.o;
          const objectType = triple.objectType ||
            (object.startsWith('http://') || object.startsWith('https://') ? 'uri' : 'literal');

          // Extract namespace prefix from predicate URI
          let predicateTag = predicate;
          for (const [prefix, uri] of Object.entries(namespaces)) {
            if (predicate.startsWith(uri)) {
              predicateTag = `${prefix}:${predicate.slice(uri.length)}`;
              break;
            }
          }

          // Format based on object type
          if (objectType === 'uri') {
            rdfxml += `    <${predicateTag} rdf:resource="${object}"/>\n`;
          } else {
            // Escape XML special characters in literals
            const escapedObject = object
              .replace(/&/g, '&amp;')
              .replace(/</g, '&lt;')
              .replace(/>/g, '&gt;')
              .replace(/"/g, '&quot;');
            rdfxml += `    <${predicateTag}>${escapedObject}</${predicateTag}>\n`;
          }
        }

        rdfxml += `  </rdf:Description>\n`;
      }

      rdfxml += `</rdf:RDF>`;

      return {
        data: rdfxml,
        metadata: {
          format: 'rdfxml',
          outputSize: rdfxml.length,
          tripleCount: data.length,
          subjectCount: subjectMap.size,
          ...opts,
        },
      };
    } catch (error) {
      throw new Error(`RDF/XML formatting failed: ${error.message}`);
    }
  },

  supportsStreaming: false,
  isAI: false,
  version: '1.0.0',
};

/**
 * Turtle adapter for parsing and formatting Turtle data
 */
const ttlAdapter = {
  async parse(input, opts = {}) {
    try {
      const n3 = await import('n3');
      const parser = new n3.Parser({ format: 'Turtle' });
      const quads = parser.parse(input);

      const data = quads.map(quad => ({
        subject: quad.subject.value,
        predicate: quad.predicate.value,
        object: quad.object.value,
        graph: quad.graph ? quad.graph.value : undefined,
      }));

      return {
        data,
        metadata: {
          format: 'ttl',
          quadCount: quads.length,
          ...opts,
        },
      };
    } catch (error) {
      throw new Error(`Invalid Turtle: ${error.message}`);
    }
  },

  async format(data, opts = {}) {
    try {
      const n3 = await import('n3');
      const writer = new n3.Writer({ format: 'Turtle' });

      for (const quad of data) {
        const subject = quad.subject.startsWith('_:')
          ? n3.DataFactory.blankNode(quad.subject.slice(2))
          : n3.DataFactory.namedNode(quad.subject);

        const predicate = n3.DataFactory.namedNode(quad.predicate);

        let object;
        if (quad.object.startsWith('_:')) {
          object = n3.DataFactory.blankNode(quad.object.slice(2));
        } else if (quad.object.startsWith('http')) {
          object = n3.DataFactory.namedNode(quad.object);
        } else {
          object = n3.DataFactory.literal(quad.object);
        }

        const graph = quad.graph ? n3.DataFactory.namedNode(quad.graph) : undefined;

        writer.addQuad(subject, predicate, object, graph);
      }

      return new Promise((resolve, reject) => {
        writer.end((error, result) => {
          if (error) {
            reject(new Error(`Turtle formatting failed: ${error.message}`));
          } else {
            resolve({
              data: result,
              metadata: {
                format: 'ttl',
                outputSize: result.length,
                quadCount: data.length,
                ...opts,
              },
            });
          }
        });
      });
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

export { jsonldAdapter, nqAdapter, plantumlAdapter, rdfxmlAdapter, ttlAdapter };
