import { Parameters } from './data/parameters.js';
import { SapCommerceExtension } from './data/sap-commerce-extension.js';
import * as fs from 'fs';
import { getExtensionsFromLocalExtensionsXml, getManifestData } from './helpers/sap-commerce-structure.js';
import { parseExtension } from './helpers/parse-extension.js';
import { createPlatformComponents } from './generators/create-platform-components.js';
import { logger } from './logger.js';

export function getLoadedSapCommerceExtensions(params: Parameters): SapCommerceExtension[] {
  let localextensionsPath = params.localExtensionFilePath;
  if (!localextensionsPath) {
    // get path from manifest
    const manifest = getManifestData(params);
    if (manifest && manifest.useConfig && manifest.useConfig.extensions && manifest.useConfig.extensions.location) {
      localextensionsPath = `${params.path}/core-customize/${manifest.useConfig.extensions.location}`;
    }
  }
  if (!localextensionsPath) {
    throw Error('Could not determine path to localextensions.xml, please provide it via --local-extension-file-path');
  }
  logger.debug('Using localextensions.xml path: ' + localextensionsPath);
  const directlyLoadedExtensionKeys = getExtensionsFromLocalExtensionsXml(localextensionsPath);

  // get all available extensions
  const availableExtensions: SapCommerceExtension[] = [];
  const hybrisFolderPath = `${params.path}/core-customize/hybris/`;

  // platform extension
  availableExtensions.push({
    name: 'platform',
    purl: 'pkg:maven/de.hybris.platform/platform@0.0.0',
    module: 'platform',
    path: 'bin/platform',
    version: '0.0.0',
    dependsOnExtensionNames: [],
    mavenDependencies: createPlatformComponents(hybrisFolderPath + 'bin/platform'),
    customExtension: false,
    directlyLoaded: true,
  });

  const shippedModulesBasePath = `${hybrisFolderPath}bin/modules/`;
  const shippedModules = getSubDirectories(shippedModulesBasePath);
  for (const module of shippedModules) {
    logger.debug('Found shipped module: ' + module);
    const moduleExtensions = getSubDirectories(shippedModulesBasePath + module);
    for (const moduleExt of moduleExtensions) {
      const extension = parseExtension(hybrisFolderPath, `bin/modules/${module}/${moduleExt}`, moduleExt, module);
      if (extension) {
        extension.customExtension = false;
        extension.directlyLoaded = false;
        availableExtensions.push(extension);
      }
    }
  }

  const moreExtensionsPaths = [
    { path: 'bin/platform/ext/', group: 'platform' },
    { path: 'bin/modules/platform/deprecated/', group: 'deprecated' },
    { path: 'bin/modules/cockpit-core/deprecated/', group: 'cockpit-core' },
    { path: 'bin/modules/cockpit-applications/deprecated/', group: 'cockpit-applications' },
    { path: 'bin/modules/web-content-management-system/deprecated/', group: 'web-content-management-system' },
  ];
  for (const module of moreExtensionsPaths) {
    const modulePath = `${hybrisFolderPath}${module.path}`;
    if (!fs.existsSync(modulePath)) {
      continue;
    }
    for (const ext of getSubDirectories(modulePath)) {
      logger.debug('Found additional shipped extension: ' + ext);
      const extension = parseExtension(hybrisFolderPath, `${module.path}${ext}`, ext, module.group);
      if (extension) {
        extension.customExtension = false;
        extension.directlyLoaded = false;
        availableExtensions.push(extension);
      }
    }
  }

  const customExtensionsPath = `${params.path}/core-customize/hybris/bin/custom/`;
  const customExtensions = getSubDirectories(customExtensionsPath);
  for (const ext of customExtensions) {
    logger.debug('Found custom extension: ' + ext);
    const extension = parseExtension(hybrisFolderPath, `bin/custom/${ext}`, ext, 'custom');
    if (extension) {
      extension.customExtension = true;
      extension.directlyLoaded = false;
      availableExtensions.push(extension);
    }
  }

  const indirectExtesionKeys: string[] = [];
  directlyLoadedExtensionKeys.forEach((key) => indirectExtesionKeys.push(key));
  indirectExtesionKeys.push('platform'); // platform is always required

  // directly loaded extensions
  for (const ext of availableExtensions) {
    if (directlyLoadedExtensionKeys.includes(ext.name)) {
      ext.directlyLoaded = true;
      indirectExtesionKeys.push(...getAllDependentExtensions(availableExtensions, ext));
    }
  }

  const uniqueIndirectExtensionKeys = [...new Set(indirectExtesionKeys)];

  // check if all extensions are found
  for (const extKey of uniqueIndirectExtensionKeys) {
    if (!availableExtensions.find((e) => e.name === extKey)) {
      logger.warn(`Warning: Required extension ${extKey} not found among available extensions!`);
    }
  }

  const loadedExtensions = availableExtensions.filter((ext) => uniqueIndirectExtensionKeys.includes(ext.name));
  return loadedExtensions;
}

function getSubDirectories(path: string): string[] {
  return fs.readdirSync(path).filter(function (file) {
    return fs.statSync(path + '/' + file).isDirectory();
  });
}

function getAllDependentExtensions(
  availableExtensions: SapCommerceExtension[],
  extension: SapCommerceExtension,
  visited: Set<string> = new Set()
): string[] {
  const result: string[] = [];
  if (visited.has(extension.name)) {
    return result; // avoid cycles
  }
  visited.add(extension.name);
  for (const depName of extension.dependsOnExtensionNames) {
    if (!result.includes(depName)) {
      result.push(depName);
    }
    const depExtension = availableExtensions.find((e) => e.name === depName);
    if (depExtension) {
      const subDeps = getAllDependentExtensions(availableExtensions, depExtension, visited);
      for (const subDep of subDeps) {
        if (!result.includes(subDep)) {
          result.push(subDep);
        }
      }
    } else {
      logger.warn(`Dependency extension ${depName} not found among available extensions.`);
    }
  }
  return result;
}
