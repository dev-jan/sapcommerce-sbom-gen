import { SbomComponent } from './sbom-component.js';
import { SbomDependency } from './sbom-dependency.js';

export interface SapCommerceExtension {
  name: string;
  purl: string;
  path: string;
  module: string;
  version: string;
  dependsOnExtensionNames: string[];
  mavenDependencies: SbomComponent[];
  nestedDependencies?: SbomComponent[];
  nestedDependenciesLinks?: SbomDependency[];
  directlyLoaded?: boolean;
  customExtension?: boolean;
}
