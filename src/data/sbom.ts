import { SbomComponent } from './sbom-component.js';
import { SbomDependency } from './sbom-dependency.js';
import { SbomMetadata } from './sbom-metadata.js';

export const CYCLONDX_FORMAT_IDENTIFIER = 'CycloneDX';
export const CYCLONDX_SPEC_VERSION = '1.6';

export interface Sbom {
  bomFormat: string;
  specVersion: string;
  serialNumber: string;
  version: number;
  metadata: SbomMetadata;
  components: SbomComponent[];
  dependencies: SbomDependency[];
}
