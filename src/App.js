import { useService } from "@xstate/react";
import * as lockfile from "@yarnpkg/lockfile";
import axios from "axios";
import * as gemfile from "gemfile";
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
    )
  )
);

const getJavascriptPackages = R.pipe(
  R.props(["dependencies", "devDependencies"]),
  R.map(R.keys),
  R.flatten,
  R.reject(R.startsWith("@types/"))
);

const getRubyPackages = R.pipe(
  R.match(/gem '.+?'/g),
  R.map(
    R.pipe(
      R.match(/gem '(.+?)'/),
      R.nth(1)
    )
  )
);

const getDependenciesFilePackages = (language, dependenciesFile) =>
  language === "javascript"
    ? getJavascriptPackages(dependenciesFile)
    : language === "ruby"
      ? getRubyPackages(dependenciesFile)
      : [];

const fetchReleases = (language, dependenciesFile) =>
  Promise.all(
    R.splitEvery(
      PACKAGES_PER_REQUEST,
      getDependenciesFilePackages(language, dependenciesFile)
    ).map(pkg =>
      axios.get(
        `/.netlify/functions/get-package-releases?packages=${pkg.join(
          ","
        )}&language=${language}`
      )
    )
  );

const getPackageRepoPath = ({ repository }) =>
  typeof repository === "object" ? repository.url : repository;

const extractPackageRepo = dependenciesFile => {
  const [_, owner, repo] = R.match(/github\.com\/(.+?)\/(.+?)\.git/)(
    getPackageRepoPath(dependenciesFile)
  );
  return [owner, repo];
};

const parseDependenciesFile = (language, file) =>
  language === "javascript" ? JSON.parse(file) : file;

const parseLockFile = (language, file) =>
  language === "javascript"
    ? lockfile.parse(file).object
    : language === "ruby"
      ? gemfile.interpret(file)
      : null;

const initialContext = {
  name: "",
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
          CHANGE_LANGUAGE: {
            actions: [
              "changeLanguage",
              "clearDependenciesFile",
              "clearLockFile"
            ]
          },
          UPDATE_NAME: { actions: "updateName" },
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
      fetchReleases: ({ language, dependenciesFile }) =>
        fetchReleases(language, dependenciesFile)
    },
    actions: {
      changeLanguage: assign({
        language: (_, { language }) => language,
        name: ({ name }, { language }) =>
          language === "javascript" ? "" : name
      }),
      storeDependenciesFile: assign({
        dependenciesFile: ({ language }, { file }) =>
          parseDependenciesFile(language, file)
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
      }),
      updateName: assign({ name: (_, { name }) => name })
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
  console.log(current.context);

  const {
    language,
    dependenciesFile,
    lockFile,
    sort,
    filters,
    error,
    releases,
    name
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
            language,
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
        send({ type: "UPLOAD_DEPENDENCIES_FILE", file: result });
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
        const parsedFile = parseLockFile(language, result);
        send({
          type: "UPLOAD_LOCK_FILE",
          file:
            language === "javascript"
              ? yarnLockToMaxVersions(parsedFile)
              : parsedFile
        });
      };
      reader.readAsText(file);
    }
  };

  const getProjectName = () => {
    if (language !== "javascript") {
      return name;
    }
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
        {current.matches("setup") ? (
          <Setup
            {...{ language, name }}
            onLanguageChange={language =>
              send({ type: "CHANGE_LANGUAGE", language })
            }
            onDependenciesFileChange={handleDependenciesFileChange}
            onLockFileChange={handleLockFileChange}
            onContinueClick={() => send("CONTINUE")}
            onNameChange={name => send({ type: "UPDATE_NAME", name })}
          />
        ) : current.matches("feed") ? (
          <Feed
            {...{
              language,
              error,
              releases,
              dependenciesFile,
              filters,
              lockFile,
              sort
            }}
            onFilterChange={filter => send({ type: "CHANGE_FILTER", filter })}
            onSortChange={sort => send({ type: "CHANGE_SORT", sort })}
          />
        ) : null}
      </ErrorBoundary>
    </ErrorBoundary>
  );
};

export default App;
