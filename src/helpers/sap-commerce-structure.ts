import { Parameters } from '../data/parameters.js';
import * as fs from 'fs';
import { XMLParser } from 'fast-xml-parser';
import { logger } from '../logger.js';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getManifestData(params: Parameters): any {
  const manifestPath = `${params.path}/core-customize/manifest.json`;
  if (fs.existsSync(manifestPath)) {
    const manifestData = fs.readFileSync(manifestPath, 'utf-8');
    const manifest = JSON.parse(manifestData);
    return manifest;
  }
  return null;
}

export function getExtensionsFromLocalExtensionsXml(filePath: string): string[] {
  const xmlData = fs.readFileSync(filePath, 'utf-8');
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
  });
  const extensionData = parser.parse(xmlData);

  const extensions: string[] = [];
  for (const ext of extensionData['hybrisconfig']['extensions']['extension']) {
    extensions.push(ext['@_name']);
  }

  return extensions;
}

export function getRequiredExtensionsFromExtensionInfo(filePath: string): string[] {
  const xmlData = fs.readFileSync(filePath, 'utf-8');
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
  });
  const extensionData = parser.parse(xmlData);

  const requiredExtensions: string[] = [];
  const extensionName = extensionData['extensioninfo']['extension']['@_name'];
  let extensions = extensionData['extensioninfo']['extension']['requires-extension'];
  if (!extensions) {
    return [];
  }
  if (!Array.isArray(extensions)) {
    // make array
    extensions = [extensions];
  }
  for (const req of extensions) {
    requiredExtensions.push(req['@_name']);
  }
  logger.debug(`Extension ${extensionName} requires extensions: ${requiredExtensions.join(', ')}`);
  return requiredExtensions;
}

export function getSolrVersion(params: Parameters): string | null {
  const manifest = getManifestData(params);
  if (manifest && manifest['solrVersion']) {
    const manifestSolrVersion = manifest['solrVersion'];
    if (manifestSolrVersion.match(/\./g).length === 1) {
      // incomplete version extension, e.g. 8.11 => 8.11.0
      return manifestSolrVersion + '.0';
    }
    return manifestSolrVersion;
  }
  return null;
}
