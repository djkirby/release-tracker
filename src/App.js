import { useService } from "@xstate/react";
import * as lockfile from "@yarnpkg/lockfile";
import axios from "axios";
import * as R from "ramda";
import React from "react";
import semver from "semver";
import { assign, Machine, interpret, State } from "xstate";

import ErrorBoundary from "./ErrorBoundary";
import Feed from "./feed";
import Setup from "./setup";
import Heading from "./shared/Heading";
import { dependenciesFileName, lockFileName } from "./shared/utils";

const LS_KEY = "releases-tracker";
const PACKAGES_PER_REQUEST = 5;

// Determine package versions locked down to from yarn.lock file
const yarnLockToMaxVersions = R.pipe(
  R.toPairs,
  R.map(([key, val]) => [key.replace(/@[\d^].+$/, ""), val]),
  R.groupBy(R.head),
  R.mapObjIndexed(lockedPackageVersions =>
    lockedPackageVersions.reduce(
      (maxVersion, [_, { version }]) =>
        semver.gt(version, maxVersion) ? version : maxVersion,
      lockedPackageVersions[0][1].version
    ))
);

const getPackageJsonPackages = R.pipe(
  R.props(["dependencies", "devDependencies"]),
  R.map(R.keys),
  R.flatten,
  R.reject(R.startsWith("@types/"))
);

const fetchReleases = dependenciesFile =>
  Promise.all(
    R.splitEvery(
      PACKAGES_PER_REQUEST,
      getPackageJsonPackages(dependenciesFile)
    ).map(pkg =>
      axios.get(
        `/.netlify/functions/get-package-releases?packages=${pkg.join(",")}`
      ))
  );

const getPackageRepoPath = ({ repository }) =>
  typeof repository === "object" ? repository.url : repository;

const extractPackageRepo = dependenciesFile => {
  const [_, owner, repo] = R.match(/github\.com\/(.+?)\/(.+?)\.git/)(
    getPackageRepoPath(dependenciesFile)
  );
  return [owner, repo];
};

const initialContext = {
  language: "javascript",
  dependenciesFile: null,
  lockFile: null,
  releases: null,
  sort: "date",
  filters: {
    includeOld: false,
    includeAlpha: false,
    includeBeta: false,
    includeDev: true,
    includeDep: true,
    includeRC: false
  }
};

const releaseTrackerMachine = Machine(
  {
    key: "releaseTracker",
    initial: "setup",
    context: initialContext,
    states: {
      setup: {
        type: "parallel",
        states: {
          dependenciesFileUpload: {
            initial: "notUploaded",
            states: {
              notUploaded: {
                on: {
                  UPLOAD_DEPENDENCIES_FILE: {
                    target: "uploaded",
                    actions: "storeDependenciesFile"
                  }
                }
              },
              uploaded: {
                type: "final",
                on: {
                  CLEAR_DEPENDENCIES_FILE: {
                    target: "notUploaded",
                    actions: "clearDependenciesFile"
                  }
                }
              }
            }
          },
          lockFileUpload: {
            initial: "notUploaded",
            states: {
              notUploaded: {
                on: {
                  UPLOAD_LOCK_FILE: {
                    target: "uploaded",
                    actions: "storeLockFile"
                  }
                }
              },
              uploaded: {
                type: "final",
                on: {
                  CLEAR_LOCK_FILE: {
                    target: "notUploaded",
                    actions: "clearLockFile"
                  }
                }
              }
            }
          }
        },
        onDone: "feed",
        on: {
          CHANGE_LANGUAGE: { actions: "changeLanguage" },
          CONTINUE: { target: "feed", cond: "dependenciesFileSaved" }
        }
      },
      feed: {
        initial: "fetching",
        states: {
          fetching: {
            invoke: {
              id: "fetchReleases",
              src: "fetchReleases",
              onDone: { target: "fetched", actions: "storeReleases" },
              onError: "error"
            },
            onEntry: "clearReleases"
          },
          fetched: {},
          error: {}
        },
        on: {
          FETCH_RELEASES: "feed.fetching",
          CHANGE_SORT: { actions: "changeSort" },
          CHANGE_FILTER: { actions: "changeFilter" }
        }
      }
    },
    on: {
      RESET: {
        target: "setup",
        actions: ["clearDependenciesFile", "clearLockFile"]
      }
    }
  },
  {
    guards: {
      dependenciesFileSaved: ({ dependenciesFile }) => !!dependenciesFile
    },
    services: {
      fetchReleases: ({ dependenciesFile }) => fetchReleases(dependenciesFile)
    },
    actions: {
      changeLanguage: assign({ language: (_, { language }) => language }),
      storeDependenciesFile: assign({
        dependenciesFile: ({}, { file }) => file
      }),
      clearDependenciesFile: assign({ dependenciesFile: null }),
      storeLockFile: assign({ lockFile: (_, { file }) => file }),
      clearLockFile: assign({ lockFile: null }),
      storeReleases: assign({
        releases: (_, { data }) =>
          R.flatten(
            data.map(({ data }) => data).map(({ releases }) => releases)
          )
      }),
      clearReleases: assign({ releases: null }),
      changeSort: assign({ sort: (_, { sort }) => sort }),
      changeFilter: assign({
        filters: ({ filters }, { filter }) => ({
          ...filters,
          [filter]: !filters[filter]
        })
      })
    }
  }
);

const stateDefinition = localStorage.getItem(LS_KEY)
  ? JSON.parse(localStorage.getItem(LS_KEY))
  : null;

const previousState = stateDefinition
  ? State.create({
      ...stateDefinition,
      context: {
        ...initialContext,
        ...stateDefinition.context,
        error: initialContext.error
      }
    })
  : null;

const resolvedState = previousState
  ? releaseTrackerMachine.resolveState(previousState)
  : null;

const service = interpret(releaseTrackerMachine).start(
  resolvedState ? resolvedState : undefined
);

const App = () => {
  const [current, send] = useService(service);

  const {
    language,
    dependenciesFile,
    lockFile,
    sort,
    filters,
    error,
    releases
  } = current.context;

  React.useEffect(() => {
    if (current.matches("setup")) {
      localStorage.removeItem(LS_KEY);
    } else {
      localStorage.setItem(
        LS_KEY,
        JSON.stringify({
          ...current,
          context: {
            ...initialContext,
            dependenciesFile,
            lockFile,
            sort,
            filters
          }
        })
      );
    }
  });

  React.useEffect(
    () => {
      send("FETCH_RELEASES");
    },
    [send]
  );

  const handleDependenciesFileChange = ({ target: { files } }) => {
    const [file] = files;
    const expectedFileName = dependenciesFileName(language);
    if (!file) {
      send("CLEAR_DEPENDENCIES_FILE");
    } else if (file.name !== expectedFileName) {
      send("CLEAR_DEPENDENCIES_FILE");
      alert(`You uploaded '${file.name}' -- expecting '${expectedFileName}'.`);
      window.location.reload();
    } else {
      const reader = new FileReader();
      reader.onload = ({ target: { result } }) => {
        send({ type: "UPLOAD_DEPENDENCIES_FILE", file: JSON.parse(result) });
      };
      reader.readAsText(file);
    }
  };

  const handleLockFileChange = ({ target: { files } }) => {
    const [file] = files;
    const expectedFileName = lockFileName(language);
    if (!file) {
      send("CLEAR_LOCK_FILE");
    } else if (file.name !== expectedFileName) {
      send("CLEAR_LOCK_FILE");
      alert(`You uploaded '${file.name}' -- expecting '${expectedFileName}'.`);
      window.location.reload();
    } else if (file) {
      const reader = new FileReader();
      reader.onload = ({ target: { result } }) => {
        send({
          type: "UPLOAD_LOCK_FILE",
          file: yarnLockToMaxVersions(lockfile.parse(result).object)
        });
      };
      reader.readAsText(file);
    }
  };

  const getProjectName = () => {
    if (!dependenciesFile) {
      return null;
    }
    const repo = getPackageRepoPath(dependenciesFile);
    if (repo) {
      return extractPackageRepo(repo).join("/");
    }
    return dependenciesFile.name;
  };

  return (
    <ErrorBoundary>
      <Heading
        projectName={getProjectName()}
        projectSelected={!current.matches("setup")}
        onReset={() => send("RESET")}
      />

      <hr />

      <ErrorBoundary>
        {current.matches("setup")
          ? <Setup
              {...{ language }}
              onLanguageChange={language =>
                send({ type: "CHANGE_LANGUAGE", language })}
              onDependenciesFileChange={handleDependenciesFileChange}
              onLockFileChange={handleLockFileChange}
              onContinueClick={() => send("CONTINUE")}
            />
          : current.matches("feed")
              ? <Feed
                  {...{
                    error,
                    releases,
                    dependenciesFile,
                    filters,
                    lockFile,
                    sort
                  }}
                  onFilterChange={filter =>
                    send({ type: "CHANGE_FILTER", filter })}
                  onSortChange={sort => send({ type: "CHANGE_SORT", sort })}
                />
              : null}
      </ErrorBoundary>
    </ErrorBoundary>
  );
};

export default App;
