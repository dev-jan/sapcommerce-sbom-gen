import { SbomComponentScope } from '../data/sbom-component-scope.js';
import { SbomComponentType } from '../data/sbom-component-type.js';
import { SbomComponent } from '../data/sbom-component.js';
import * as fs from 'fs';

export function createNpmComponents(packageFilepath: string): SbomComponent[] {
  const sbomComponents: SbomComponent[] = [];
  const packageData = fs.readFileSync(packageFilepath, 'utf-8');
  const packageJson = JSON.parse(packageData);

  if (packageJson.dependencies) {
    for (const [depName, depVersion] of Object.entries<string>(packageJson.dependencies)) {
      if (depVersion.startsWith('workspace:')) {
        // skip local workspace dependencies
        continue;
      }
      const version = depVersion.replace(/^[\^~]/, '').trim();
      const purl = `pkg:npm/${depName}@${version}`;
      sbomComponents.push({
        type: SbomComponentType.library,
        scope: SbomComponentScope.required,
        'bom-ref': purl,
        group: '',
        name: depName,
        version: version,
        purl: purl,
      } as SbomComponent);
    }
    for (const [depName, depVersion] of Object.entries<string>(packageJson.devDependencies || {})) {
      if (depVersion.startsWith('workspace:')) {
        // skip local workspace dependencies
        continue;
      }
      const version = depVersion.replace(/^[\^~]/, '').trim();
      const purl = `pkg:npm/${depName}@${version}`;
      sbomComponents.push({
        type: SbomComponentType.library,
        scope: SbomComponentScope.optional,
        'bom-ref': purl,
        group: '',
        name: depName,
        version: version,
        purl: purl,
      } as SbomComponent);
    }
  }

  return sbomComponents;
}
