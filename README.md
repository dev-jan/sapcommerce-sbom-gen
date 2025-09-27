# SAP Commerce SBOM Generator 🦺

This tool aim to easily create an SBOM (Software Bill of Material) of an SAP Commerce Cloud (aka Hybris) application. The SBOM is generated in the CycloneDX format an can be used in various tools, for example DependencyTrack or other Dependency Analysers.

## How to use it? 💻️

Try it using npx:

```bash
cd <to-your-sap-commerce-repo>
npx sapcommerce-sbom-gen .
```

You can also use the docker image:

```bash
cd <to-your-sap-commerce-repo>
docker run --rm -v $(pwd):/source devjanofficial/sapcommerce-sbom-gen sapcommerce-sbom-gen .
```

If the created sbom looks good, include the generation into your continuous build pipeline. Example for Gitlab CI (.gitlab-ci.yml), to run the creation on the main branch and also upload it directly to a DependencyTrack instance (be sure to provide all DEPENDENCYTRACK CI variables):

```yaml
sbom:
  stage: analyse
  image: devjanofficial/sapcommerce-sbom-gen:latest
  only:
    - main
  script:
    - sapcommerce-sbom-gen --output ./sbom.json .
    - |
      curl -X POST https://$DEPENDENCYTRACK_URL/api/v1/bom \
          -H 'Content-Type: multipart/form-data' \
          -H 'X-Api-Key: $DEPENDENCYTRACK_APIKEY' \
          -F "projectName=example" \
          -F "projectVersion=$CI_COMMIT_BRANCH" \
          -F "bom=@sbom.json"
  artifacts:
    paths:
      - sbom.json
```

## Why is this needed? 🤔

SBOMs can be created for many existing package managers. Sadly, SAP Commerce decided to use it's own mechanism for dependency management: A mix between shipped JARs, Maven Depedencies and
on top some NPM dependencies (and maybe even more?). For this reason, this tool is created to combine all of the SAP Commerce specific dependencies into one SBOM.

## Disclaimer 🧐

This project is not assosiated with SAP in any way and NOT an official product. Just an approach to create SBOMs. Please be aware that the resulting SBOM is maybe not containing really all dependencies if some strange edge cases are not implemented here. Be sure to manually check the SBOM.

Something missing? Something wrong? Feel free to create an Issue or a Pull Request to fix it 😇

## Need help?

First, check the available command line options:

```bash
npx sapcommerce-sbom-gen --help
```

Also always read the output. To see more info, use the `--verbose` parameter to increase verbosity.
