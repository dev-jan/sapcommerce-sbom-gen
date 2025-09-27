import { SbomComponentType } from './data/sbom-component-type.js';
import { SbomComponent } from './data/sbom-component.js';
import packageFile from '../package.json' with { type: 'json' };

export function createToolsMetadata(): SbomComponent[] {
  const version = packageFile.version ?? '0.0.0';
  const group = 'dev-jan';
  const name = 'sapcommerce-sbom-gen';
  const purl = `pkg:npm/${group}/${name}@${version}`;

  return [
    {
      'bom-ref': purl,
      purl: purl,
      group: group,
      name: name,
      version: version,
      type: SbomComponentType.application,
    },
  ];
}
