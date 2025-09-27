import { SbomComponent } from '../data/sbom-component.js';
import * as fs from 'fs';
import { SbomDependency } from '../data/sbom-dependency.js';
import { execSync } from 'child_process';
import { logger } from '../logger.js';
import { SbomComponentType } from '../data/sbom-component-type.js';
import { addDependency } from '../helpers/dependency-add.js';

interface MavenDependencyTree {
  components: SbomComponent[];
  references: SbomDependency[];
}

/**
 * Download all transitive dependencies for a given maven component using mvn dependency:tree
 */
export function createTransitiveMavenComponents(
  hybrisDirectory: string,
  group: string,
  artifactId: string,
  version: string
): MavenDependencyTree {
  // download dependencies via mvn
  const outputDir = `${hybrisDirectory}/core-customize/hybris/temp/maven-dependencies`;
  if (fs.existsSync(outputDir)) {
    fs.rmSync(outputDir, { recursive: true, force: true });
  }
  fs.mkdirSync(outputDir, { recursive: true });

  // create a temporary pom.xml file
  const pomContent = `
<project xmlns="http://maven.apache.org/POM/4.0.0"
         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 http://maven.apache.org/xsd/maven-4.0.0.xsd">
    <modelVersion>4.0.0</modelVersion>
    <groupId>tmp</groupId>
    <artifactId>tmp</artifactId>
    <version>0.0.0</version>
    <packaging>jar</packaging>
    <dependencies>
        <dependency>
            <groupId>${group}</groupId>
            <artifactId>${artifactId}</artifactId>
            <version>${version}</version>
        </dependency>
    </dependencies>
</project>
  `;
  fs.writeFileSync(`${outputDir}/pom.xml`, pomContent);

  // run mvn dependency:tree
  try {
    execSync(`cd ${outputDir} && mvn dependency:tree -DoutputType=dot -DoutputFile=dependency-tree.dot`);
  } catch (error) {
    logger.error(`Error executing mvn for ${artifactId}:${version}: ${error}`);
    return {
      components: [],
      references: [],
    };
  }

  const components: SbomComponent[] = [];
  const references: SbomDependency[] = [];

  // read the generated dependency-tree.dot file
  const dotFilePath = `${outputDir}/dependency-tree.dot`;
  if (fs.existsSync(dotFilePath)) {
    const dotData = fs.readFileSync(dotFilePath, 'utf-8');
    const lines = dotData.split('\n');

    let lineNumber = 0;
    for (const line of lines) {
      if (lineNumber < 2) {
        // skip first two lines
        lineNumber++;
        continue;
      }
      const trimmedLine = line.trim();
      const rawDependency = trimmedLine.replaceAll(';', '').trim().replaceAll('"', '').split(' -> ');

      if (rawDependency.length !== 2) {
        continue;
      }

      const from = rawDependency[0] || '';
      const to = rawDependency[1] || '';

      const fromComponent = mavenPackageNameToComponent(from);
      const toComponent = mavenPackageNameToComponent(to);

      if (fromComponent && !components.find((c) => c.purl === fromComponent.purl)) {
        components.push(fromComponent);
      }
      if (toComponent && !components.find((c) => c.purl === toComponent.purl)) {
        components.push(toComponent);
      }
      if (fromComponent && toComponent) {
        // add dependency
        addDependency(references, fromComponent.purl, toComponent.purl);
      }
    }
  }

  return {
    components: components,
    references: references,
  };
}

function mavenPackageNameToComponent(mavenRaw: string): SbomComponent | null {
  const regex = /([^:]+):([^:]+):([^:]+):([^:]+)(:([^:]+))?/;
  const match = mavenRaw.match(regex);
  if (match) {
    const group = match[1];
    const artifact = match[2];
    const version = match[4];
    const purl = `pkg:maven/${group}/${artifact}@${version}`;
    return {
      type: SbomComponentType.library,
      'bom-ref': purl,
      group: group || '',
      name: artifact || '',
      version: version || '',
      purl: purl,
    };
  }
  return null;
}
