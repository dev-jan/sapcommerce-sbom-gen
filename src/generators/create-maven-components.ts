import { SbomComponent } from '../data/sbom-component.js';
import * as fs from 'fs';
import { XMLParser } from 'fast-xml-parser';
import { logger } from '../logger.js';

export function createMavenComponents(mavenFilePath: string): SbomComponent[] {
  if (!fs.existsSync(mavenFilePath)) {
    logger.debug(`Maven dependencies file not found at path: ${mavenFilePath}, skipping...`);
    return [];
  }

  const pomFileData = fs.readFileSync(mavenFilePath, 'utf-8');
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
  });
  const projectData = parser.parse(pomFileData);

  const dependencyRoot = projectData['project']['dependencies'];
  if (!dependencyRoot) {
    return [];
  }
  let dependencies = dependencyRoot['dependency'];
  if (!dependencies) {
    return [];
  }
  if (!Array.isArray(dependencies)) {
    // make array
    dependencies = [dependencies];
  }
  logger.debug(`Found ${dependencies.length} maven dependencies in ${mavenFilePath}`);

  const sbomComponents: SbomComponent[] = [];
  for (const mavenDependency of dependencies) {
    const groupId = mavenDependency['groupId'] || 'unknown-group';
    const artifactId = mavenDependency['artifactId'] || 'unknown-artifact';
    const version = (mavenDependency['version'] || '0.0.0').toString().trim();

    const purl = `pkg:maven/${groupId}/${artifactId}@${version}`;
    sbomComponents.push({
      type: 'library',
      'bom-ref': purl,
      group: groupId,
      name: artifactId,
      version: version,
      purl: purl,
    } as SbomComponent);
  }
  return sbomComponents;
}
