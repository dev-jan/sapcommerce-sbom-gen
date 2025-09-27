import { SbomComponent } from '../data/sbom-component.js';
import * as fs from 'fs';
import { createMavenComponents } from './create-maven-components.js';
import { logger } from '../logger.js';
import { SbomComponentType } from '../data/sbom-component-type.js';

export function createPlatformComponents(pathToPlatform: string): SbomComponent[] {
  if (!fs.existsSync(pathToPlatform)) {
    throw new Error(`Path does not exist: ${pathToPlatform}`);
  }
  const components: SbomComponent[] = [];

  // tomcat server
  const tomcatVersion = extractTomcatVersion(pathToPlatform);
  if (tomcatVersion) {
    const tomcatGroup = 'org.apache.tomcat';
    const tomcatName = 'tomcat';
    const tomcatPurl = `pkg:maven/${tomcatGroup}/${tomcatName}@${tomcatVersion}`;
    components.push({
      type: SbomComponentType.library,
      'bom-ref': tomcatPurl,
      group: tomcatGroup,
      name: tomcatName,
      version: tomcatVersion,
      purl: tomcatPurl,
    });
  }

  // db drivers
  components.push(...createMavenComponents(`${pathToPlatform}/lib/dbdriver/external-dependencies.xml`));

  return components;
}

function extractTomcatVersion(pathToPlatform: string): string | undefined {
  const releaseNotesFilesPath = `${pathToPlatform}/tomcat/RELEASE-NOTES`;
  if (fs.existsSync(releaseNotesFilesPath)) {
    const content = fs.readFileSync(releaseNotesFilesPath, 'utf-8');
    const versionMatch = content.match(/Apache Tomcat Version (\d+\.\d+\.\d+)/);
    if (versionMatch) {
      return versionMatch[1];
    }
  }
  logger.warn(`Could not determine Tomcat version from ${releaseNotesFilesPath}`);
  return undefined;
}
