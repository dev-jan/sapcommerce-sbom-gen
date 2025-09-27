import { SbomComponent } from './sbom-component.js';

export interface SbomMetadata {
  timestamp: string;
  tools: SbomMetadataTools;
  component: SbomComponent;
}

export interface SbomMetadataTools {
  components: SbomComponent[];
}
