import React from "react";
import * as R from "ramda";

import Filters from "./Filters";
import Sort from "./Sort";
import ReleaseListing from "./ReleaseListing";
import {
  isAlpha,
  isBeta,
  isReleaseCandidate,
  isSatisfied,
  isDevDependency,
  isDependency
} from "./release-filters";

const sortReleases = sort =>
  R.sortWith([
    sort === "date"
      ? R.descend(R.prop("publishedAt"))
      : R.ascend(R.prop("packageName"))
  ]);

const filterReleases = (
  language,
  filters,
  dependencies,
  devDependencies,
  lockFile
) => {
  const {
    includeOld,
    includeAlpha,
    includeBeta,
    includeDev,
    includeDep,
    includeRC
  } = filters;

  const rejections = [
    [!includeAlpha, isAlpha],
    [!includeBeta, isBeta],
    [!includeRC, isReleaseCandidate],
    ...(language === "javascript"
      ? [
          [!includeOld, isSatisfied(dependencies, devDependencies, lockFile)],
          [!includeDev, isDevDependency(devDependencies)],
          [!includeDep, isDependency(dependencies)]
        ]
      : [])
  ];

  return R.reject(release =>
    R.any(
      ([shouldRejectKind, rejectFn]) =>
        shouldRejectKind && rejectFn.call(this, release)
    )(rejections));
};

const ReleasesList = (
  {
    language,
    releases,
    dependenciesFile: { dependencies, devDependencies },
    lockFile,
    sort,
    filters,
    onFilterChange,
    onSortChange
  }
) => {
  const releaseListings = R.pipe(
    filterReleases(language, filters, dependencies, devDependencies, lockFile),
    sortReleases(sort)
  )(releases);

  return (
    <div>
      <Filters {...{ language, filters, onFilterChange }} />

      <hr />

      <Sort {...{ sort, onSortChange }} />

      <hr style={{ marginBottom: "2.5rem" }} />

      {releaseListings.length === 0
        ? <div>No matching releases found.</div>
        : releaseListings.map(release => (
            <ReleaseListing
              key={`${release.packageName}-${release.tagName}`}
              {...{
                language,
                release,
                dependencies,
                devDependencies,
                lockFile
              }}
            />
          ))}
    </div>
  );
};

export default ReleasesList;
