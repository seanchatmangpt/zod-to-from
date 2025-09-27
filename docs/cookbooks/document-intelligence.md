# Document Intelligence Cookbook

> **The 80/20 Pattern: AI-Powered Document Analysis**

This cookbook covers the most common AI-powered document processing patterns -
intelligent document analysis, content extraction, and automated insights
generation using Ollama. This pattern handles 80% of document intelligence use
cases.

## 🎯 Use Case

**Problem**: You have complex documents (Word, PowerPoint, Excel, PDF) and need
to extract structured data, analyze content, and generate insights automatically
using AI.

**Solution**: Use ZTF's AI-powered adapters with Ollama to create intelligent
document processing pipelines that can understand, analyze, and extract
meaningful information from documents.

## 📋 Prerequisites

- Ollama installed and configured
- AI models downloaded (qwen3-coder, llama3.2, etc.)
- ZTF installed and configured
- Zod schemas for document validation
- Understanding of AI prompt engineering

## 🍳 Recipe

### Step 1: Define Document Intelligence Schemas

```javascript
import { z } from 'zod';

// Document analysis schema
const DocumentAnalysisSchema = z.object({
  title: z.string(),
  summary: z.string(),
  keyPoints: z.array(z.string()),
  sentiment: z.enum(['positive', 'negative', 'neutral']),
  entities: z.array(
    z.object({
      name: z.string(),
      type: z.enum([
        'PERSON',
        'ORGANIZATION',
        'LOCATION',
        'DATE',
        'MONEY',
        'PERCENT',
      ]),
      confidence: z.number().min(0).max(1),
      context: z.string().optional(),
    })
  ),
  topics: z.array(z.string()),
  categories: z.array(z.string()),
  language: z.string(),
  readability: z.object({
    score: z.number().min(0).max(100),
    level: z.enum(['elementary', 'middle', 'high', 'college', 'graduate']),
    complexity: z.number().min(0).max(100),
  }),
  metadata: z.object({
    wordCount: z.number(),
    pageCount: z.number().optional(),
    processingTime: z.number(),
    model: z.string(),
    confidence: z.number().min(0).max(1),
  }),
});

// Document extraction schema
const DocumentExtractionSchema = z.object({
  structuredData: z.record(z.any()),
  tables: z.array(
    z.object({
      title: z.string().optional(),
      headers: z.array(z.string()),
      rows: z.array(z.array(z.string())),
      summary: z.string().optional(),
    })
  ),
  images: z.array(
    z.object({
      description: z.string(),
      type: z.string(),
      relevance: z.number().min(0).max(1),
    })
  ),
  keyMetrics: z.record(z.number()),
  recommendations: z.array(z.string()),
  actionItems: z.array(
    z.object({
      item: z.string(),
      priority: z.enum(['low', 'medium', 'high', 'critical']),
      assignee: z.string().optional(),
      dueDate: z.string().optional(),
    })
  ),
});

// Document comparison schema
const DocumentComparisonSchema = z.object({
  similarity: z.number().min(0).max(100),
  differences: z.array(
    z.object({
      type: z.enum(['content', 'structure', 'style', 'data']),
      description: z.string(),
      impact: z.enum(['low', 'medium', 'high']),
      details: z.any(),
    })
  ),
  commonElements: z.array(z.string()),
  uniqueElements: z.object({
    document1: z.array(z.string()),
    document2: z.array(z.string()),
  }),
  recommendations: z.array(z.string()),
});

// Document classification schema
const DocumentClassificationSchema = z.object({
  category: z.string(),
  subcategory: z.string().optional(),
  confidence: z.number().min(0).max(1),
  tags: z.array(z.string()),
  type: z.enum([
    'report',
    'proposal',
    'contract',
    'manual',
    'presentation',
    'spreadsheet',
    'other',
  ]),
  purpose: z.string(),
  audience: z.string(),
  urgency: z.enum(['low', 'medium', 'high', 'critical']),
});
```

### Step 2: Basic Document Intelligence Processing

```javascript
import { parseFrom, formatTo } from 'zod-to-from';
import fs from 'fs';

async function processDocumentIntelligence(
  documentFile,
  analysisType,
  options = {}
) {
  try {
    // Read document file
    const documentBuffer = fs.readFileSync(documentFile);
    const fileExtension = documentFile.split('.').pop().toLowerCase();

    // Determine AI adapter based on file type
    const aiAdapter = getAIAdapter(fileExtension);
    if (!aiAdapter) {
      throw new Error(`AI processing not supported for ${fileExtension} files`);
    }

    // Process document with AI
    const result = await processDocumentWithAI(
      documentBuffer,
      aiAdapter,
      analysisType,
      options
    );

    // Convert to desired format
    const outputData = await formatTo(DocumentAnalysisSchema, 'json', result);

    // Save output
    const outputFile = `ai-analysis-${documentFile.replace(/\.[^/.]+$/, '')}.json`;
    fs.writeFileSync(outputFile, outputData);

    return {
      success: true,
      analysis: result,
      outputFile,
      processingTime: result.metadata.processingTime,
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
    };
  }
}

function getAIAdapter(fileExtension) {
  const adapters = {
    docx: 'docx-ai',
    pptx: 'pptx-ai',
    xlsx: 'xlsx-ai',
  };

  return adapters[fileExtension];
}

async function processDocumentWithAI(
  documentBuffer,
  adapter,
  analysisType,
  options
) {
  const startTime = Date.now();

  // Configure AI processing based on analysis type
  const aiOptions = getAIOptions(analysisType, options);

  // Process document with AI
  const result = await parseFrom(
    DocumentAnalysisSchema,
    adapter,
    documentBuffer,
    {
      adapter: aiOptions,
    }
  );

  // Add processing metadata
  result.metadata = {
    ...result.metadata,
    processingTime: Date.now() - startTime,
    model: aiOptions.model,
    analysisType,
  };

  return result;
}

function getAIOptions(analysisType, options) {
  const baseOptions = {
    model: options.model || 'qwen3-coder',
    temperature: options.temperature || 0.7,
    maxTokens: options.maxTokens || 2000,
  };

  switch (analysisType) {
    case 'summary':
      return {
        ...baseOptions,
        prompt:
          'Analyze this document and provide a comprehensive summary, key points, and main topics.',
      };

    case 'extraction':
      return {
        ...baseOptions,
        prompt:
          'Extract structured data, tables, key metrics, and action items from this document.',
      };

    case 'analysis':
      return {
        ...baseOptions,
        prompt:
          'Perform a deep analysis of this document including sentiment, entities, topics, and insights.',
      };

    case 'classification':
      return {
        ...baseOptions,
        prompt:
          'Classify this document by type, category, purpose, and audience.',
      };

    default:
      return {
        ...baseOptions,
        prompt:
          'Analyze this document and extract key information, insights, and recommendations.',
      };
  }
}
```

### Step 3: Advanced Document Analysis

```javascript
async function performAdvancedDocumentAnalysis(
  documentFile,
  analysisOptions = {}
) {
  try {
    const documentBuffer = fs.readFileSync(documentFile);
    const fileExtension = documentFile.split('.').pop().toLowerCase();
    const aiAdapter = getAIAdapter(fileExtension);

    if (!aiAdapter) {
      throw new Error(`AI processing not supported for ${fileExtension} files`);
    }

    // Perform multiple types of analysis
    const analyses = await Promise.all([
      performContentAnalysis(documentBuffer, aiAdapter, analysisOptions),
      performStructuralAnalysis(documentBuffer, aiAdapter, analysisOptions),
      performSemanticAnalysis(documentBuffer, aiAdapter, analysisOptions),
      performExtractionAnalysis(documentBuffer, aiAdapter, analysisOptions),
    ]);

    // Combine analyses
    const combinedAnalysis = combineAnalyses(analyses);

    // Generate insights
    const insights = await generateInsights(combinedAnalysis, analysisOptions);

    // Create comprehensive report
    const report = {
      document: documentFile,
      analysis: combinedAnalysis,
      insights,
      recommendations: generateRecommendations(combinedAnalysis),
      metadata: {
        processedAt: new Date().toISOString(),
        analysisTypes: ['content', 'structural', 'semantic', 'extraction'],
        model: analysisOptions.model || 'qwen3-coder',
      },
    };

    return {
      success: true,
      report,
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
    };
  }
}

async function performContentAnalysis(documentBuffer, adapter, options) {
  const prompt = `
    Analyze the content of this document and provide:
    1. Main themes and topics
    2. Key arguments and points
    3. Writing style and tone
    4. Target audience
    5. Content quality assessment
  `;

  const result = await parseFrom(
    DocumentAnalysisSchema,
    adapter,
    documentBuffer,
    {
      adapter: {
        model: options.model || 'qwen3-coder',
        prompt,
        temperature: 0.5,
      },
    }
  );

  return {
    type: 'content',
    result,
  };
}

async function performStructuralAnalysis(documentBuffer, adapter, options) {
  const prompt = `
    Analyze the structure of this document and provide:
    1. Document organization and layout
    2. Section headings and hierarchy
    3. Table and figure usage
    4. Document flow and coherence
    5. Structural recommendations
  `;

  const result = await parseFrom(
    DocumentAnalysisSchema,
    adapter,
    documentBuffer,
    {
      adapter: {
        model: options.model || 'qwen3-coder',
        prompt,
        temperature: 0.3,
      },
    }
  );

  return {
    type: 'structural',
    result,
  };
}

async function performSemanticAnalysis(documentBuffer, adapter, options) {
  const prompt = `
    Perform semantic analysis of this document and provide:
    1. Named entities (people, organizations, locations, dates)
    2. Sentiment analysis
    3. Key concepts and relationships
    4. Language complexity and readability
    5. Semantic coherence
  `;

  const result = await parseFrom(
    DocumentAnalysisSchema,
    adapter,
    documentBuffer,
    {
      adapter: {
        model: options.model || 'qwen3-coder',
        prompt,
        temperature: 0.4,
      },
    }
  );

  return {
    type: 'semantic',
    result,
  };
}

async function performExtractionAnalysis(documentBuffer, adapter, options) {
  const prompt = `
    Extract structured information from this document:
    1. Key data points and metrics
    2. Tables and structured data
    3. Action items and tasks
    4. Important dates and deadlines
    5. Contact information and references
  `;

  const result = await parseFrom(
    DocumentExtractionSchema,
    adapter,
    documentBuffer,
    {
      adapter: {
        model: options.model || 'qwen3-coder',
        prompt,
        temperature: 0.2,
      },
    }
  );

  return {
    type: 'extraction',
    result,
  };
}

function combineAnalyses(analyses) {
  const combined = {
    content: null,
    structural: null,
    semantic: null,
    extraction: null,
  };

  analyses.forEach(analysis => {
    combined[analysis.type] = analysis.result;
  });

  return combined;
}

async function generateInsights(analysis, options) {
  const insights = [];

  // Content insights
  if (analysis.content) {
    insights.push({
      type: 'content',
      insight: `Document focuses on ${analysis.content.topics.join(', ')}`,
      confidence: 0.8,
    });
  }

  // Structural insights
  if (analysis.structural) {
    insights.push({
      type: 'structural',
      insight: `Document has ${analysis.structural.metadata.wordCount} words with ${analysis.structural.readability.level} readability level`,
      confidence: 0.9,
    });
  }

  // Semantic insights
  if (analysis.semantic) {
    insights.push({
      type: 'semantic',
      insight: `Document sentiment is ${analysis.semantic.sentiment} with ${analysis.semantic.entities.length} named entities`,
      confidence: 0.7,
    });
  }

  // Extraction insights
  if (analysis.extraction) {
    insights.push({
      type: 'extraction',
      insight: `Document contains ${analysis.extraction.tables.length} tables and ${analysis.extraction.actionItems.length} action items`,
      confidence: 0.8,
    });
  }

  return insights;
}

function generateRecommendations(analysis) {
  const recommendations = [];

  // Content recommendations
  if (analysis.content) {
    if (analysis.content.readability.score < 60) {
      recommendations.push(
        'Consider simplifying language to improve readability'
      );
    }
    if (analysis.content.topics.length > 5) {
      recommendations.push(
        'Document covers many topics - consider focusing on fewer key areas'
      );
    }
  }

  // Structural recommendations
  if (analysis.structural) {
    if (analysis.structural.metadata.wordCount > 5000) {
      recommendations.push(
        'Document is lengthy - consider adding an executive summary'
      );
    }
  }

  // Semantic recommendations
  if (analysis.semantic) {
    if (analysis.semantic.sentiment === 'negative') {
      recommendations.push(
        'Document has negative sentiment - consider balancing with positive aspects'
      );
    }
  }

  // Extraction recommendations
  if (analysis.extraction) {
    if (analysis.extraction.actionItems.length === 0) {
      recommendations.push(
        'Consider adding clear action items to improve document utility'
      );
    }
  }

  return recommendations;
}
```

### Step 4: Document Comparison and Analysis

```javascript
async function compareDocumentsIntelligently(
  file1,
  file2,
  comparisonOptions = {}
) {
  try {
    // Analyze both documents
    const analysis1 = await performAdvancedDocumentAnalysis(
      file1,
      comparisonOptions
    );
    const analysis2 = await performAdvancedDocumentAnalysis(
      file2,
      comparisonOptions
    );

    if (!analysis1.success || !analysis2.success) {
      throw new Error('Failed to analyze one or both documents');
    }

    // Perform intelligent comparison
    const comparison = await performIntelligentComparison(
      analysis1.report,
      analysis2.report,
      comparisonOptions
    );

    return {
      success: true,
      comparison,
      documents: {
        file1: analysis1.report,
        file2: analysis2.report,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      documents: { file1, file2 },
    };
  }
}

async function performIntelligentComparison(report1, report2, options) {
  const comparison = {
    similarity: 0,
    differences: [],
    commonElements: [],
    uniqueElements: {
      document1: [],
      document2: [],
    },
    recommendations: [],
  };

  // Compare content
  const contentComparison = compareContent(
    report1.analysis.content,
    report2.analysis.content
  );
  comparison.similarity += contentComparison.similarity * 0.3;
  comparison.differences.push(...contentComparison.differences);

  // Compare structure
  const structuralComparison = compareStructure(
    report1.analysis.structural,
    report2.analysis.structural
  );
  comparison.similarity += structuralComparison.similarity * 0.2;
  comparison.differences.push(...structuralComparison.differences);

  // Compare semantics
  const semanticComparison = compareSemantics(
    report1.analysis.semantic,
    report2.analysis.semantic
  );
  comparison.similarity += semanticComparison.similarity * 0.3;
  comparison.differences.push(...semanticComparison.differences);

  // Compare extraction
  const extractionComparison = compareExtraction(
    report1.analysis.extraction,
    report2.analysis.extraction
  );
  comparison.similarity += extractionComparison.similarity * 0.2;
  comparison.differences.push(...extractionComparison.differences);

  // Find common elements
  comparison.commonElements = findCommonElements(report1, report2);

  // Find unique elements
  comparison.uniqueElements = findUniqueElements(report1, report2);

  // Generate recommendations
  comparison.recommendations = generateComparisonRecommendations(comparison);

  return comparison;
}

function compareContent(content1, content2) {
  if (!content1 || !content2) {
    return { similarity: 0, differences: [] };
  }

  const similarity = calculateTopicSimilarity(content1.topics, content2.topics);
  const differences = [];

  if (content1.sentiment !== content2.sentiment) {
    differences.push({
      type: 'content',
      description: `Sentiment differs: ${content1.sentiment} vs ${content2.sentiment}`,
      impact: 'medium',
      details: { content1: content1.sentiment, content2: content2.sentiment },
    });
  }

  if (Math.abs(content1.readability.score - content2.readability.score) > 20) {
    differences.push({
      type: 'content',
      description: `Readability differs significantly: ${content1.readability.score} vs ${content2.readability.score}`,
      impact: 'medium',
      details: {
        content1: content1.readability.score,
        content2: content2.readability.score,
      },
    });
  }

  return { similarity, differences };
}

function compareStructure(structural1, structural2) {
  if (!structural1 || !structural2) {
    return { similarity: 0, differences: [] };
  }

  const wordCountDiff = Math.abs(
    structural1.metadata.wordCount - structural2.metadata.wordCount
  );
  const similarity = Math.max(
    0,
    100 -
      (wordCountDiff /
        Math.max(
          structural1.metadata.wordCount,
          structural2.metadata.wordCount
        )) *
        100
  );

  const differences = [];

  if (wordCountDiff > 1000) {
    differences.push({
      type: 'structure',
      description: `Word count differs significantly: ${structural1.metadata.wordCount} vs ${structural2.metadata.wordCount}`,
      impact: 'low',
      details: {
        content1: structural1.metadata.wordCount,
        content2: structural2.metadata.wordCount,
      },
    });
  }

  return { similarity, differences };
}

function compareSemantics(semantic1, semantic2) {
  if (!semantic1 || !semantic2) {
    return { similarity: 0, differences: [] };
  }

  const entitySimilarity = calculateEntitySimilarity(
    semantic1.entities,
    semantic2.entities
  );
  const differences = [];

  if (semantic1.sentiment !== semantic2.sentiment) {
    differences.push({
      type: 'semantic',
      description: `Sentiment differs: ${semantic1.sentiment} vs ${semantic2.sentiment}`,
      impact: 'high',
      details: { content1: semantic1.sentiment, content2: semantic2.sentiment },
    });
  }

  return { similarity: entitySimilarity, differences };
}

function compareExtraction(extraction1, extraction2) {
  if (!extraction1 || !extraction2) {
    return { similarity: 0, differences: [] };
  }

  const tableSimilarity = calculateTableSimilarity(
    extraction1.tables,
    extraction2.tables
  );
  const differences = [];

  if (extraction1.tables.length !== extraction2.tables.length) {
    differences.push({
      type: 'data',
      description: `Table count differs: ${extraction1.tables.length} vs ${extraction2.tables.length}`,
      impact: 'medium',
      details: {
        content1: extraction1.tables.length,
        content2: extraction2.tables.length,
      },
    });
  }

  return { similarity: tableSimilarity, differences };
}

function calculateTopicSimilarity(topics1, topics2) {
  if (!topics1 || !topics2) return 0;

  const set1 = new Set(topics1);
  const set2 = new Set(topics2);

  const intersection = new Set([...set1].filter(x => set2.has(x)));
  const union = new Set([...set1, ...set2]);

  return (intersection.size / union.size) * 100;
}

function calculateEntitySimilarity(entities1, entities2) {
  if (!entities1 || !entities2) return 0;

  const names1 = new Set(entities1.map(e => e.name));
  const names2 = new Set(entities2.map(e => e.name));

  const intersection = new Set([...names1].filter(x => names2.has(x)));
  const union = new Set([...names1, ...names2]);

  return (intersection.size / union.size) * 100;
}

function calculateTableSimilarity(tables1, tables2) {
  if (!tables1 || !tables2) return 0;

  if (tables1.length === 0 && tables2.length === 0) return 100;
  if (tables1.length === 0 || tables2.length === 0) return 0;

  const minLength = Math.min(tables1.length, tables2.length);
  const maxLength = Math.max(tables1.length, tables2.length);

  return (minLength / maxLength) * 100;
}

function findCommonElements(report1, report2) {
  const common = [];

  // Common topics
  if (report1.analysis.content?.topics && report2.analysis.content?.topics) {
    const commonTopics = report1.analysis.content.topics.filter(topic =>
      report2.analysis.content.topics.includes(topic)
    );
    common.push(...commonTopics.map(topic => `Topic: ${topic}`));
  }

  // Common entities
  if (
    report1.analysis.semantic?.entities &&
    report2.analysis.semantic?.entities
  ) {
    const commonEntities = report1.analysis.semantic.entities.filter(entity1 =>
      report2.analysis.semantic.entities.some(
        entity2 => entity2.name === entity1.name
      )
    );
    common.push(...commonEntities.map(entity => `Entity: ${entity.name}`));
  }

  return common;
}

function findUniqueElements(report1, report2) {
  const unique1 = [];
  const unique2 = [];

  // Unique topics
  if (report1.analysis.content?.topics && report2.analysis.content?.topics) {
    const uniqueTopics1 = report1.analysis.content.topics.filter(
      topic => !report2.analysis.content.topics.includes(topic)
    );
    const uniqueTopics2 = report2.analysis.content.topics.filter(
      topic => !report1.analysis.content.topics.includes(topic)
    );

    unique1.push(...uniqueTopics1.map(topic => `Topic: ${topic}`));
    unique2.push(...uniqueTopics2.map(topic => `Topic: ${topic}`));
  }

  return { document1: unique1, document2: unique2 };
}

function generateComparisonRecommendations(comparison) {
  const recommendations = [];

  if (comparison.similarity < 50) {
    recommendations.push(
      'Documents are quite different - consider if they serve the same purpose'
    );
  }

  if (comparison.differences.length > 5) {
    recommendations.push('Many differences found - review for consistency');
  }

  if (comparison.uniqueElements.document1.length > 3) {
    recommendations.push(
      'First document has unique elements that could be valuable'
    );
  }

  if (comparison.uniqueElements.document2.length > 3) {
    recommendations.push(
      'Second document has unique elements that could be valuable'
    );
  }

  return recommendations;
}
```

## 🔧 Variations

### Variation 1: Document Classification and Routing

```javascript
async function classifyAndRouteDocument(documentFile, routingRules) {
  try {
    const documentBuffer = fs.readFileSync(documentFile);
    const fileExtension = documentFile.split('.').pop().toLowerCase();
    const aiAdapter = getAIAdapter(fileExtension);

    if (!aiAdapter) {
      throw new Error(`AI processing not supported for ${fileExtension} files`);
    }

    // Classify document
    const classification = await parseFrom(
      DocumentClassificationSchema,
      aiAdapter,
      documentBuffer,
      {
        adapter: {
          model: 'qwen3-coder',
          prompt:
            'Classify this document by type, category, purpose, audience, and urgency.',
          temperature: 0.3,
        },
      }
    );

    // Determine routing based on classification and rules
    const routing = determineRouting(classification, routingRules);

    return {
      success: true,
      classification,
      routing,
      document: documentFile,
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      document: documentFile,
    };
  }
}

function determineRouting(classification, rules) {
  const routing = {
    destination: 'default',
    priority: 'normal',
    assignee: null,
    tags: [],
    actions: [],
  };

  // Apply routing rules
  for (const rule of rules) {
    if (matchesRule(classification, rule)) {
      routing.destination = rule.destination;
      routing.priority = rule.priority || routing.priority;
      routing.assignee = rule.assignee || routing.assignee;
      routing.tags.push(...(rule.tags || []));
      routing.actions.push(...(rule.actions || []));
    }
  }

  return routing;
}

function matchesRule(classification, rule) {
  // Check category match
  if (rule.category && classification.category !== rule.category) {
    return false;
  }

  // Check type match
  if (rule.type && classification.type !== rule.type) {
    return false;
  }

  // Check urgency match
  if (rule.urgency && classification.urgency !== rule.urgency) {
    return false;
  }

  // Check confidence threshold
  if (rule.minConfidence && classification.confidence < rule.minConfidence) {
    return false;
  }

  return true;
}
```

### Variation 2: Document Quality Assessment

```javascript
async function assessDocumentQuality(documentFile, qualityCriteria) {
  try {
    const documentBuffer = fs.readFileSync(documentFile);
    const fileExtension = documentFile.split('.').pop().toLowerCase();
    const aiAdapter = getAIAdapter(fileExtension);

    if (!aiAdapter) {
      throw new Error(`AI processing not supported for ${fileExtension} files`);
    }

    // Perform quality assessment
    const assessment = await parseFrom(
      DocumentAnalysisSchema,
      aiAdapter,
      documentBuffer,
      {
        adapter: {
          model: 'qwen3-coder',
          prompt: `
          Assess the quality of this document based on:
          1. Content clarity and coherence
          2. Structure and organization
          3. Language and grammar
          4. Completeness and accuracy
          5. Professional presentation
          
          Provide a quality score (0-100) and specific recommendations.
        `,
          temperature: 0.4,
        },
      }
    );

    // Calculate quality score
    const qualityScore = calculateQualityScore(assessment, qualityCriteria);

    // Generate quality report
    const qualityReport = {
      document: documentFile,
      overallScore: qualityScore.overall,
      categoryScores: qualityScore.categories,
      strengths: qualityScore.strengths,
      weaknesses: qualityScore.weaknesses,
      recommendations: qualityScore.recommendations,
      assessment: assessment,
    };

    return {
      success: true,
      qualityReport,
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      document: documentFile,
    };
  }
}

function calculateQualityScore(assessment, criteria) {
  const scores = {
    content: 0,
    structure: 0,
    language: 0,
    completeness: 0,
    presentation: 0,
  };

  // Content quality (based on readability and coherence)
  scores.content = assessment.readability.score;

  // Structure quality (based on organization)
  scores.structure = assessment.metadata.wordCount > 1000 ? 80 : 60;

  // Language quality (based on complexity and clarity)
  scores.language = 100 - assessment.readability.complexity;

  // Completeness quality (based on key points and entities)
  scores.completeness = Math.min(
    100,
    assessment.keyPoints.length * 10 + assessment.entities.length * 5
  );

  // Presentation quality (based on overall assessment)
  scores.presentation = assessment.metadata.confidence * 100;

  // Calculate overall score
  const overall =
    Object.values(scores).reduce((sum, score) => sum + score, 0) /
    Object.keys(scores).length;

  // Identify strengths and weaknesses
  const strengths = [];
  const weaknesses = [];

  Object.entries(scores).forEach(([category, score]) => {
    if (score >= 80) {
      strengths.push(`${category}: ${score.toFixed(1)}`);
    } else if (score < 60) {
      weaknesses.push(`${category}: ${score.toFixed(1)}`);
    }
  });

  // Generate recommendations
  const recommendations = [];

  if (scores.content < 70) {
    recommendations.push('Improve content clarity and coherence');
  }
  if (scores.structure < 70) {
    recommendations.push('Enhance document structure and organization');
  }
  if (scores.language < 70) {
    recommendations.push('Simplify language and improve readability');
  }
  if (scores.completeness < 70) {
    recommendations.push('Add more detailed information and examples');
  }
  if (scores.presentation < 70) {
    recommendations.push('Improve overall presentation and formatting');
  }

  return {
    overall,
    categories: scores,
    strengths,
    weaknesses,
    recommendations,
  };
}
```

### Variation 3: Document Content Generation

```javascript
async function generateDocumentContent(template, data, options = {}) {
  try {
    // Generate content using AI
    const generatedContent = await generateContentWithAI(
      template,
      data,
      options
    );

    // Structure the generated content
    const structuredContent = structureGeneratedContent(
      generatedContent,
      template
    );

    // Convert to desired format
    const outputData = await formatTo(
      DocumentAnalysisSchema,
      'json',
      structuredContent
    );

    return {
      success: true,
      content: structuredContent,
      outputData,
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
    };
  }
}

async function generateContentWithAI(template, data, options) {
  const prompt = `
    Generate document content based on the following template and data:
    
    Template: ${template}
    Data: ${JSON.stringify(data, null, 2)}
    
    Requirements:
    1. Follow the template structure
    2. Use the provided data accurately
    3. Maintain professional tone
    4. Ensure completeness and coherence
    5. Include relevant details and examples
  `;

  // Use a simple text generation approach
  const result = await parseFrom(z.any(), 'docx-ai', Buffer.from(''), {
    adapter: {
      model: options.model || 'qwen3-coder',
      prompt,
      temperature: options.temperature || 0.7,
      maxTokens: options.maxTokens || 3000,
    },
  });

  return result;
}

function structureGeneratedContent(content, template) {
  return {
    title: extractTitle(content),
    summary: extractSummary(content),
    keyPoints: extractKeyPoints(content),
    content: content,
    metadata: {
      generatedAt: new Date().toISOString(),
      template: template,
      wordCount: content.split(' ').length,
    },
  };
}

function extractTitle(content) {
  // Simple title extraction - first line or first sentence
  const lines = content.split('\n');
  return lines[0] || content.split('.')[0];
}

function extractSummary(content) {
  // Simple summary extraction - first paragraph or first few sentences
  const paragraphs = content.split('\n\n');
  return paragraphs[0] || content.split('.')[0] + '.';
}

function extractKeyPoints(content) {
  // Simple key points extraction - look for bullet points or numbered lists
  const lines = content.split('\n');
  const keyPoints = [];

  lines.forEach(line => {
    if (line.trim().match(/^[-*•]\s/) || line.trim().match(/^\d+\.\s/)) {
      keyPoints.push(line.trim());
    }
  });

  return keyPoints;
}
```

## ⚠️ Common Pitfalls

### 1. Inadequate AI Model Configuration

```javascript
// ❌ Wrong - no model configuration
const result = await parseFrom(Schema, 'docx-ai', documentBuffer);

// ✅ Correct - proper model configuration
const result = await parseFrom(Schema, 'docx-ai', documentBuffer, {
  adapter: {
    model: 'qwen3-coder',
    prompt: 'Specific prompt for the task',
    temperature: 0.7,
    maxTokens: 2000,
  },
});
```

### 2. Poor Prompt Engineering

```javascript
// ❌ Wrong - vague prompt
const prompt = 'Analyze this document';

// ✅ Correct - specific, structured prompt
const prompt = `
  Analyze this document and provide:
  1. Main themes and topics
  2. Key arguments and points
  3. Sentiment analysis
  4. Named entities
  5. Action items and recommendations
`;
```

### 3. Missing Error Handling

```javascript
// ❌ Wrong - no error handling
const result = await parseFrom(Schema, 'docx-ai', documentBuffer);

// ✅ Correct - proper error handling
try {
  const result = await parseFrom(Schema, 'docx-ai', documentBuffer);
} catch (error) {
  if (error.name === 'ModelError') {
    // Handle AI model errors
  } else if (error.name === 'ZodError') {
    // Handle validation errors
  }
}
```

## 🚀 Advanced Techniques

### 1. Multi-Model Document Analysis

```javascript
async function analyzeWithMultipleModels(documentFile, models) {
  try {
    const documentBuffer = fs.readFileSync(documentFile);
    const fileExtension = documentFile.split('.').pop().toLowerCase();
    const aiAdapter = getAIAdapter(fileExtension);

    // Analyze with multiple models
    const analyses = await Promise.all(
      models.map(async model => {
        const result = await parseFrom(
          DocumentAnalysisSchema,
          aiAdapter,
          documentBuffer,
          {
            adapter: {
              model: model.name,
              prompt: model.prompt,
              temperature: model.temperature || 0.7,
            },
          }
        );

        return {
          model: model.name,
          result,
          confidence: result.metadata.confidence,
        };
      })
    );

    // Combine results from multiple models
    const combinedAnalysis = combineModelResults(analyses);

    return {
      success: true,
      analyses,
      combined: combinedAnalysis,
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
    };
  }
}

function combineModelResults(analyses) {
  const combined = {
    title: null,
    summary: null,
    keyPoints: [],
    sentiment: null,
    entities: [],
    topics: [],
    confidence: 0,
  };

  // Combine results with confidence weighting
  let totalConfidence = 0;

  analyses.forEach(analysis => {
    const weight = analysis.confidence;
    totalConfidence += weight;

    // Weighted average for numerical values
    if (analysis.result.sentiment) {
      combined.sentiment = analysis.result.sentiment;
    }

    // Combine arrays
    combined.keyPoints.push(...analysis.result.keyPoints);
    combined.entities.push(...analysis.result.entities);
    combined.topics.push(...analysis.result.topics);
  });

  // Remove duplicates and sort by confidence
  combined.keyPoints = [...new Set(combined.keyPoints)];
  combined.topics = [...new Set(combined.topics)];
  combined.entities = combined.entities
    .sort((a, b) => b.confidence - a.confidence)
    .filter(
      (entity, index, arr) =>
        arr.findIndex(e => e.name === entity.name) === index
    );

  combined.confidence = totalConfidence / analyses.length;

  return combined;
}
```

### 2. Document Intelligence Caching

```javascript
class DocumentIntelligenceCache {
  constructor(ttl = 3600000) {
    // 1 hour default TTL
    this.cache = new Map();
    this.ttl = ttl;
  }

  async get(key, analyzer) {
    const cached = this.cache.get(key);

    if (cached && Date.now() - cached.timestamp < this.ttl) {
      return cached.data;
    }

    const data = await analyzer();

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
    });

    return data;
  }

  clear() {
    this.cache.clear();
  }

  size() {
    return this.cache.size;
  }
}

// Usage
const docCache = new DocumentIntelligenceCache();

async function getCachedDocumentAnalysis(documentFile, analysisType) {
  const cacheKey = `${documentFile}:${analysisType}`;

  return await docCache.get(cacheKey, async () => {
    return await processDocumentIntelligence(documentFile, analysisType);
  });
}
```

## 📊 Performance Tips

### 1. Batch Document Processing

```javascript
async function processDocumentsInBatch(documentFiles, analysisType) {
  const results = await Promise.allSettled(
    documentFiles.map(async file => {
      try {
        const result = await processDocumentIntelligence(file, analysisType);
        return { file, success: true, result };
      } catch (error) {
        return { file, success: false, error: error.message };
      }
    })
  );

  return results.map((result, index) => ({
    file: documentFiles[index],
    ...result.value,
  }));
}
```

### 2. AI Model Selection

```javascript
function selectOptimalModel(analysisType, documentSize) {
  const models = {
    'qwen3-coder': {
      strengths: ['code', 'technical', 'structured'],
      maxTokens: 4000,
      speed: 'fast',
    },
    'llama3.2': {
      strengths: ['general', 'creative', 'conversational'],
      maxTokens: 8000,
      speed: 'medium',
    },
    codellama: {
      strengths: ['code', 'programming', 'technical'],
      maxTokens: 2000,
      speed: 'fast',
    },
  };

  // Select model based on analysis type and document size
  if (analysisType === 'extraction' && documentSize < 1000) {
    return 'qwen3-coder';
  } else if (analysisType === 'analysis' && documentSize > 5000) {
    return 'llama3.2';
  } else {
    return 'qwen3-coder'; // Default
  }
}
```

## 🧪 Testing

### Unit Tests

```javascript
import { describe, it, expect } from 'vitest';

describe('Document Intelligence', () => {
  it('should process document intelligence correctly', async () => {
    const result = await processDocumentIntelligence('test.docx', 'analysis');

    expect(result.success).toBe(true);
    expect(result.analysis).toBeDefined();
    expect(result.analysis.title).toBeDefined();
    expect(result.analysis.summary).toBeDefined();
  });

  it('should perform advanced document analysis', async () => {
    const result = await performAdvancedDocumentAnalysis('test.docx');

    expect(result.success).toBe(true);
    expect(result.report).toBeDefined();
    expect(result.report.analysis).toBeDefined();
    expect(result.report.insights).toBeDefined();
  });

  it('should compare documents intelligently', async () => {
    const result = await compareDocumentsIntelligently(
      'doc1.docx',
      'doc2.docx'
    );

    expect(result.success).toBe(true);
    expect(result.comparison).toBeDefined();
    expect(result.comparison.similarity).toBeDefined();
    expect(result.comparison.differences).toBeDefined();
  });

  it('should classify and route documents', async () => {
    const routingRules = [
      { category: 'report', destination: 'reports', priority: 'high' },
      { type: 'contract', destination: 'legal', priority: 'critical' },
    ];

    const result = await classifyAndRouteDocument('test.docx', routingRules);

    expect(result.success).toBe(true);
    expect(result.classification).toBeDefined();
    expect(result.routing).toBeDefined();
  });
});
```

---

**Next: [Content Analysis Cookbook](content-analysis.md)**


