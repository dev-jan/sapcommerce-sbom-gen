import { SbomAuthor } from './sbom-author.js';
import { SbomComponentScope } from './sbom-component-scope.js';
import { SbomComponentType } from './sbom-component-type.js';

export interface SbomComponent {
  type: SbomComponentType;
  'bom-ref': string;
  purl: string;
  group?: string;
  name: string;
  scope?: SbomComponentScope;
  version?: string;
  authors?: SbomAuthor[];
}
