import { v4 as uuidv4 } from 'uuid';
import { createSbom } from '../src/create-sbom.js';
import * as fs from 'fs';
import { expect, test } from 'vitest';
import { Validator } from 'jsonschema';
import cyclonDxSchema_1_6 from './schemas/bom-1.6.schema.json' with { type: 'json' };
import jsfSchema_0_82 from './schemas/jsf-0.82.schema.json' with { type: 'json' };

test('create-sbom-example1', () => {
  // arrange
  const uniqueTestOutputFilename = `tmp/test-${uuidv4()}-sbom.json`;

  // act
  const sbomObject = createSbom({
    path: 'test/example-hybris-folder1',
    group: 'mycompany',
    name: 'my-sap-commerce-website',
    version: '0.0.2',
  });
  fs.mkdirSync('tmp', { recursive: true });
  fs.writeFileSync(uniqueTestOutputFilename, JSON.stringify(sbomObject));

  // assert
  expect(fs.existsSync(uniqueTestOutputFilename)).toBe(true);

  // validate against the CycloneDX JSON schema
  const v = new Validator();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  v.addSchema(jsfSchema_0_82 as any, 'http://cyclonedx.org/schema/jsf-0.82.schema.json');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const validationResult = v.validate(sbomObject, cyclonDxSchema_1_6 as any, { nestedErrors: true });
  if (!validationResult.valid) {
    console.log('Validation errors:', validationResult.errors);
  }
  expect(validationResult.valid, 'SBOM does not conform to CycloneDX 1.6 schema').toBe(true);
});
