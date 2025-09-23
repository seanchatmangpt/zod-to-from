/**
 * Unit tests for Graph & Knowledge adapters
 */

import { describe, expect, it } from 'vitest';
import {
  jsonldAdapter,
  nqAdapter,
  plantumlAdapter,
  ttlAdapter,
} from '../../src/adapters/graph.mjs';

describe('Graph & Knowledge Adapters', () => {
  describe('JSON-LD Adapter', () => {
    it('should parse JSON-LD content', async () => {
      const input = JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'Person',
        name: 'John Doe',
        email: 'john@example.com',
      });

      const result = await jsonldAdapter.parse(input);

      expect(result.data).toBeDefined();
      expect(result.metadata.format).toBe('jsonld');
      expect(result.metadata.context).toBe('https://schema.org');
      expect(result.metadata.type).toBe('Person');
    });

    it('should format data to JSON-LD', async () => {
      const data = [
        {
          '@type': 'Person',
          name: 'John Doe',
          email: 'john@example.com',
        },
      ];

      const result = await jsonldAdapter.format(data);

      expect(result.data).toContain('Person');
      expect(result.data).toContain('John Doe');
      expect(result.metadata.format).toBe('jsonld');
    });

    it('should handle invalid JSON-LD', async () => {
      const input = 'invalid json';

      await expect(jsonldAdapter.parse(input)).rejects.toThrow('Invalid JSON-LD');
    });
  });

  describe('N-Quads Adapter', () => {
    it('should parse N-Quads content', async () => {
      const input =
        '<http://example.org/subject> <http://example.org/predicate> "object" .\n<http://example.org/subject2> <http://example.org/predicate2> "object2" .';

      const result = await nqAdapter.parse(input);

      expect(result.data).toHaveLength(2);
      expect(result.data[0].subject).toBe('http://example.org/subject');
      expect(result.data[0].predicate).toBe('http://example.org/predicate');
      expect(result.data[0].object).toBe('object');
      expect(result.metadata.format).toBe('nq');
      expect(result.metadata.quadCount).toBe(2);
    });

    it('should format data to N-Quads', async () => {
      const data = [
        {
          subject: 'http://example.org/subject',
          predicate: 'http://example.org/predicate',
          object: 'object',
          graph: undefined,
        },
      ];

      const result = await nqAdapter.format(data);

      expect(result.data).toContain('http://example.org/subject');
      expect(result.data).toContain('http://example.org/predicate');
      expect(result.data).toContain('object');
      expect(result.metadata.format).toBe('nq');
    });
  });

  describe('PlantUML Adapter', () => {
    it('should parse PlantUML content', async () => {
      const input = `
@startuml
title Test Diagram
participant Alice
participant Bob
Alice -> Bob: Hello
note over Alice: This is a note
@enduml
      `;

      const result = await plantumlAdapter.parse(input);

      expect(result.data.type).toBe('diagram');
      expect(result.data.title).toBe('Test Diagram');
      expect(result.data.participants).toHaveLength(2);
      expect(result.data.participants[0].name).toBe('Alice');
      expect(result.data.relationships).toHaveLength(1);
      expect(result.data.relationships[0]).toContain('Alice -> Bob');
      expect(result.data.notes).toHaveLength(1);
      expect(result.metadata.format).toBe('plantuml');
    });

    it('should format data to PlantUML', async () => {
      const data = {
        type: 'diagram',
        title: 'Test Diagram',
        participants: [
          { type: 'participant', name: 'Alice' },
          { type: 'participant', name: 'Bob' },
        ],
        relationships: ['Alice -> Bob: Hello'],
        notes: ['note over Alice: This is a note'],
      };

      const result = await plantumlAdapter.format(data);

      expect(result.data).toContain('@startuml');
      expect(result.data).toContain('title Test Diagram');
      expect(result.data).toContain('participant Alice');
      expect(result.data).toContain('Alice -> Bob: Hello');
      expect(result.data).toContain('@enduml');
      expect(result.metadata.format).toBe('plantuml');
    });

    it('should handle empty PlantUML', async () => {
      const input = '@startuml\n@enduml';
      const result = await plantumlAdapter.parse(input);

      expect(result.data.type).toBe('diagram');
      expect(result.data.title).toBe('');
      expect(result.data.participants).toHaveLength(0);
    });
  });

  describe('Turtle Adapter', () => {
    it('should parse Turtle content', async () => {
      const input = `
@prefix ex: <http://example.org/> .
ex:subject ex:predicate "object" .
ex:subject2 ex:predicate2 "object2" .
      `;

      const result = await ttlAdapter.parse(input);

      expect(result.data).toBeDefined();
      expect(result.metadata.format).toBe('ttl');
    });

    it('should format data to Turtle', async () => {
      const data = [
        {
          subject: 'http://example.org/subject',
          predicate: 'http://example.org/predicate',
          object: 'object',
          graph: undefined,
        },
      ];

      const result = await ttlAdapter.format(data);

      expect(result.data).toBeDefined();
      expect(result.metadata.format).toBe('ttl');
    });
  });
});
