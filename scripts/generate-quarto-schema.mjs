import fs from 'fs';
import path from 'path';

const INTELLIGENCE_PATH = './src/assets/quarto-intelligence.json';
const OUTPUT_PATH = './src/components/editor/plugins/frontmatter/quarto-schema.json';

// Helper to convert Quarto types to JSON Schema
function convertType(schema) {
    if (!schema) return {}; // Any

    // String shorthand
    if (typeof schema === 'string') {
        if (schema === 'string' || schema === 'path') return { type: 'string' };
        if (schema === 'boolean') return { type: 'boolean' };
        if (schema === 'number') return { type: 'number' };
        if (schema === 'object') return { type: 'object' };
        return {}; // Unknown string type
    }

    // Array shorthand
    if (schema.arrayOf) {
        return {
            type: 'array',
            items: convertType(schema.arrayOf)
        };
    }

    // Maybe Array (One of T or T[])
    if (schema.maybeArrayOf) {
        const itemType = convertType(schema.maybeArrayOf);
        return {
            anyOf: [
                itemType,
                { type: 'array', items: itemType }
            ]
        };
    }

    // AnyOf
    if (schema.anyOf) {
        return {
            anyOf: schema.anyOf.map(convertType)
        };
    }

    // Enum
    if (schema.enum) {
        return {
            enum: schema.enum
        };
    }

    // Object definition (rare in top-level shorthand but possible)
    if (schema.object) {
        return { type: 'object' };
    }

    return {}; // Default to any
}

function getDescription(desc) {
    if (!desc) return undefined;
    if (typeof desc === 'string') return desc;
    if (desc.short) return desc.short;
    if (desc.long) return desc.long;
    return undefined;
}

try {
    console.log('Reading intelligence file...');
    const rawData = fs.readFileSync(INTELLIGENCE_PATH, 'utf8');
    const intelligence = JSON.parse(rawData);

    const properties = {};

    // Process all document-* schemas
    const docKeys = Object.keys(intelligence).filter(k => k.startsWith('schema/document-') || k.startsWith('schema/project-'));

    console.log(`Found ${docKeys.length} document schema files.`);

    docKeys.forEach(key => {
        const definitions = intelligence[key];
        if (!Array.isArray(definitions)) return;

        definitions.forEach(def => {
            if (!def.name) return;

            // Skip if already defined (first wins? or merge? logic: simple overwrite for now)
            // Quarto usually has specific overrides but for general schema, union is fine.

            properties[def.name] = {
                ...convertType(def.schema),
                description: getDescription(def.description)
            };
        });
    });

    const schema = {
        $schema: "http://json-schema.org/draft-07/schema#",
        type: "object",
        properties,
        additionalProperties: false // Strict validation to catch typos
    };

    console.log(`Generated schema with ${Object.keys(properties).length} properties.`);

    fs.writeFileSync(OUTPUT_PATH, JSON.stringify(schema, null, 2));
    console.log(`Schema saved to ${OUTPUT_PATH}`);

} catch (error) {
    console.error('Error generating schema:', error);
    process.exit(1);
}
