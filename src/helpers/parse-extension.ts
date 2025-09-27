import { SapCommerceExtension } from '../data/sap-commerce-extension.js';
import PropertiesReader from 'properties-reader';
import * as fs from 'fs';
import { getRequiredExtensionsFromExtensionInfo } from './sap-commerce-structure.js';
import { SbomComponent } from '../data/sbom-component.js';
import { createMavenComponents } from '../generators/create-maven-components.js';
import { logger } from '../logger.js';
import { createNpmComponents } from '../generators/create-npm-component.js';
import { SbomDependency } from '../data/sbom-dependency.js';
import { SbomComponentType } from '../data/sbom-component-type.js';
import { SbomComponentScope } from '../data/sbom-component-scope.js';

export function parseExtension(
  basePath: string,
  extensionPath: string,
  extName: string,
  moduleName: string
): SapCommerceExtension | null {
  const fullPath = `${basePath}/${extensionPath}`;

  const buildNumberPath = `${fullPath}/resources/${extName}.build.number`;
  let version = '0.0.0';
  if (fs.existsSync(buildNumberPath)) {
    const extProps = PropertiesReader(buildNumberPath);
    const versionFromProps = extProps.get('version') || '';
    version = versionFromProps.toString().trim();
  }

  if (!fs.existsSync(fullPath + '/extensioninfo.xml')) {
    logger.debug(`No extensioninfo.xml found for extension ${extName} in path ${fullPath}, skipping...`);
    return null;
  }

  // check for smartedit apps
  const nestedDependencies: SbomComponent[] = [];
  const nestedDependenciesLinks: SbomDependency[] = [];
  if (fs.existsSync(fullPath + '/apps/')) {
    logger.debug(`Extension ${extName} has nested npm apps, parsing them...`);
    for (const appDir of fs.readdirSync(fullPath + '/apps/')) {
      const appPath = `${fullPath}/apps/${appDir}`;
      if (fs.existsSync(`${appPath}/package.json`)) {
        const packageData = fs.readFileSync(`${appPath}/package.json`, 'utf-8');
        const packageJson = JSON.parse(packageData);
        const purl = `pkg:npm/${packageJson.name}@${packageJson.version}`;
        logger.debug(`Found npm app ${packageJson.name} in extension ${extName}`);
        const appComponent: SbomComponent = {
          type: SbomComponentType.library,
          scope: SbomComponentScope.required,
          'bom-ref': purl,
          group: '',
          name: packageJson.name,
          version: packageJson.version,
          purl: purl,
        };
        nestedDependencies.push(appComponent);
        const npmComponents = createNpmComponents(`${appPath}/package.json`);
        nestedDependencies.push(...npmComponents);
        const dependsOn: string[] = [];
        for (const npmComp of npmComponents) {
          dependsOn.push(npmComp.purl);
        }
        nestedDependenciesLinks.push({
          ref: purl,
          dependsOn: dependsOn,
        } as SbomDependency);
      }
    }
  }

  // add required extensions
  const requiredExtensions = getRequiredExtensionsFromExtensionInfo(fullPath + '/extensioninfo.xml');

  // add maven dependencies
  const mavenDependencies: SbomComponent[] = [];
  const mavenDependenciesPath = `${fullPath}/external-dependencies.xml`;
  if (fs.existsSync(mavenDependenciesPath)) {
    mavenDependencies.push(...createMavenComponents(mavenDependenciesPath));
  }

  return {
    name: extName,
    purl: `pkg:maven/de.hybris.${moduleName}/${extName}@${version}`,
    module: moduleName,
    path: extensionPath,
    version: version,
    dependsOnExtensionNames: requiredExtensions,
    mavenDependencies: mavenDependencies,
    nestedDependencies: nestedDependencies,
    nestedDependenciesLinks: nestedDependenciesLinks,
  };
}
