import { CYCLONDX_FORMAT_IDENTIFIER, CYCLONDX_SPEC_VERSION, Sbom } from './data/sbom.js';
import { v4 as uuidv4 } from 'uuid';
import { SbomComponentType } from './data/sbom-component-type.js';
import { Parameters } from './data/parameters.js';
import * as path from 'path';
import { getLoadedSapCommerceExtensions } from './get-loaded-extensions.js';
import { SbomComponent } from './data/sbom-component.js';
import { getManifestData, getSolrVersion } from './helpers/sap-commerce-structure.js';
import { SbomDependency } from './data/sbom-dependency.js';
import { addDependency } from './helpers/dependency-add.js';
import { createToolsMetadata } from './tools-metadata.js';
import { logger } from './logger.js';
import { createTransitiveMavenComponents } from './generators/create-transitive-maven-components.js';

export function createSbom(params: Parameters): Sbom {
  logger.info(`Generating SBOM for SAP Commerce instance at ${params.path}...`);

  const mainGroup = params.group || 'sapcommerce';
  const mainName = params.name ?? path.basename(params.path);
  const mainVersion = params.version || '0.0.0';
  const mainPurl = `pkg:application/${mainGroup}/${mainName}@${mainVersion}`;
  logger.debug(`Main component: ${mainPurl}`);

  const loadedExtensions = getLoadedSapCommerceExtensions(params);
  logger.info(`Found ${loadedExtensions.length} loaded SAP Commerce extensions`);

  const components: SbomComponent[] = [];
  const dependencies: SbomDependency[] = [];

  // hybris main dependency
  const manifest = getManifestData(params);
  const hybrisVersion = manifest?.commerceSuiteVersion || 'unknown';
  const sapCommercePurl = 'pkg:application/de.hybris/sap-commerce@' + hybrisVersion;
  components.push({
    type: SbomComponentType.library,
    'bom-ref': sapCommercePurl,
    group: 'de.hybris',
    name: 'sap-commerce',
    version: hybrisVersion,
    purl: sapCommercePurl,
  });
  addDependency(dependencies, mainPurl, sapCommercePurl);

  for (const ext of loadedExtensions) {
    components.push({
      type: SbomComponentType.library,
      'bom-ref': ext.purl,
      group: 'de.hybris.' + ext.module,
      name: ext.name,
      version: ext.version,
      purl: ext.purl,
    });
    if (ext.directlyLoaded && !ext.customExtension) {
      addDependency(dependencies, sapCommercePurl, ext.purl);
    }
    if (ext.directlyLoaded && ext.customExtension) {
      addDependency(dependencies, mainPurl, ext.purl);
    }
    for (const dep of ext.dependsOnExtensionNames) {
      const depExt = loadedExtensions.find((e) => e.name === dep);
      if (depExt) {
        addDependency(dependencies, ext.purl, depExt.purl);
      }
    }
    for (const mavenDep of ext.mavenDependencies) {
      if (!components.find((c) => c.purl === mavenDep.purl)) {
        components.push(mavenDep);
      }
      addDependency(dependencies, ext.purl, mavenDep.purl);
    }
    for (const nestedDep of ext.nestedDependencies || []) {
      if (!components.find((c) => c.purl === nestedDep.purl)) {
        components.push(nestedDep);
        addDependency(dependencies, ext.purl, nestedDep.purl);
      }
    }
    for (const nestedDepLink of ext.nestedDependenciesLinks || []) {
      for (const dep of nestedDepLink.dependsOn) {
        addDependency(dependencies, nestedDepLink.ref, dep);
      }
    }
  }

  const solrVersion = getSolrVersion(params);
  if (solrVersion) {
    logger.info(`Detected Solr version ${solrVersion} from manifest.json`);
    const solrGroup = 'org.apache.solr';
    const solrName = 'solr-core';
    const solrPurl = `pkg:maven/${solrGroup}/${solrName}@${solrVersion}`;
    components.push({
      type: SbomComponentType.library,
      'bom-ref': solrPurl,
      group: solrGroup,
      name: solrName,
      version: solrVersion,
      purl: solrPurl,
    });
    addDependency(dependencies, sapCommercePurl, solrPurl);
    const solrDependencies = createTransitiveMavenComponents(params.path, solrGroup, solrName, solrVersion);
    for (const comp of solrDependencies.components) {
      if (!components.find((c) => c.purl === comp.purl)) {
        components.push(comp);
      }
    }
    for (const dep of solrDependencies.references) {
      dependencies.push(dep);
    }
  } else {
    logger.warn('Could not determine Solr version from manifest.json, skipping Solr component');
  }

  return {
    bomFormat: CYCLONDX_FORMAT_IDENTIFIER,
    specVersion: CYCLONDX_SPEC_VERSION,
    serialNumber: 'urn:uuid:' + uuidv4(),
    version: 1,
    metadata: {
      timestamp: new Date().toISOString(),
      tools: {
        components: createToolsMetadata(),
      },
      component: {
        type: SbomComponentType.application,
        'bom-ref': mainPurl,
        group: mainGroup,
        name: mainName,
        version: mainVersion,
        purl: mainPurl,
      },
    },
    components: components,
    dependencies: dependencies,
  };
}
