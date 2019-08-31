import semver from "semver";

export const isAlpha = ({ tagName }) => tagName.includes("alpha");

export const isBeta = ({ tagName }) => tagName.includes("beta");

export const isReleaseCandidate = ({ tagName }) => tagName.includes("rc");

export const isSatisfied = (dependencies, devDependencies, yarnLock) =>
  ({ tagName, packageName }) => {
    const specifiedVersion = dependencies[packageName] ||
      devDependencies[packageName] ||
      null;
    const lockedVersion = (yarnLock && yarnLock[packageName]) || null;

    const rawTag = semver.coerce(tagName).raw;

    return yarnLock
      ? rawTag === lockedVersion ||
          (lockedVersion && semver.gt(lockedVersion, rawTag))
      : semver.satisfies(rawTag, specifiedVersion);
  };

export const isDevDependency = devDependencies =>
  ({ packageName }) => !!devDependencies[packageName];

export const isDependency = dependencies =>
  ({ packageName }) => !!dependencies[packageName];
