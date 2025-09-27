import { SbomDependency } from '../data/sbom-dependency.js';

export function addDependency(dependencies: SbomDependency[], ref: string, dependsOnRef: string) {
  let dep = dependencies.find((d) => d.ref === ref);
  if (!dep) {
    dep = { ref: ref, dependsOn: [] };
    dependencies.push(dep);
  }
  if (!dep.dependsOn.includes(dependsOnRef)) {
    dep.dependsOn.push(dependsOnRef);
  }
}
