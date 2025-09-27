#!/usr/bin/env node

import * as fs from 'fs';
import { program } from 'commander';
import { createSbom } from './create-sbom.js';
import { logger } from './logger.js';
import { printAsciiIntro } from './helpers/ascii-intro.js';

printAsciiIntro();

program
  .name('sap-commerce-sbom-gen')
  .option('--verbose', 'Activate more verbose output')
  .option('--output <file>', 'Output file, if not provided, output to ./sbom.json')
  .option('--group <group>', 'Set the group of your software, if not provided, use sapcommerce')
  .option('--name <name>', 'Set the name of your software, if not provided, use the folder name of the provided path')
  .option('--version <version>', 'Set the version of your software, if not provided, use 0.0.0')
  .option('--local-extension-file-path <file>', 'Path to localextensions.xml file, if not in standard location')
  .argument('<path>', 'Path to the SAP Commerce Repository root');

program.parse();

const cxPath = program.args[0];
if (!cxPath) {
  throw Error('Not <path> to SAP Commerce repository provided');
}

if (program.opts()['verbose']) {
  logger.info('Verbose logging activated');
  logger.level = 'debug';
}

const createdSbom = createSbom({
  path: cxPath,
  localExtensionFilePath: program.opts()['localExtensionFilePath'],
  group: program.opts()['group'],
  name: program.opts()['name'],
  version: program.opts()['version'] || '0.0.0',
});
const outputFilePath = program.opts()['output'] || './sbom.json';
logger.info(`Write SBOM to ${outputFilePath}...`);
fs.writeFileSync(outputFilePath, JSON.stringify(createdSbom));
logger.info('Done.');
