const axios = require("axios");
const R = require("ramda");
const Cryptr = require("cryptr");

const cryptr = new Cryptr("foobarbaz");

const RELEASES_PER_PACKAGE = 6;

const cachedPackageRepos = {};

const getPackageRepoPath = ({ repository }) =>
  typeof repository === "object" ? repository.url : repository;

const extractPackageRepo = packageJson => {
  const [_, owner, repo] = R.match(/github\.com\/(.+?)\/(.+?)\.git/)(
    getPackageRepoPath(packageJson)
  );
  return [owner, repo];
};

const fetchPackageRepo = pkg =>
  axios
    .get(`https://registry.npmjs.org/${pkg}`)
    .then(({ data: packageJson }) => {
      const [owner, repo] = extractPackageRepo(packageJson);
      cachedPackageRepos[pkg] = [owner, repo];
      return [owner, repo];
    })
    .catch(e => {
      // TODO: return an error to notify the client
      console.log(`Caught Error: Couldn't find ${pkg} in the npm registry`);
      return [];
    });

const getPackageRepo = (pkg, i) =>
  new Promise(resolve => {
    const cachedPackageRepo = cachedPackageRepos[pkg];
    if (cachedPackageRepo) {
      resolve(cachedPackageRepo);
    } else {
      setTimeout(
        async () => {
          const repo = await fetchPackageRepo(pkg);
          resolve(repo);
        },
        i * 100
      );
    }
  });

const buildPackageReleasesFragment = (owner, repo, pkg) =>
  `
  r${cryptr.encrypt(pkg)}: repository(owner: "${owner}", name: "${repo}") {
    releases(first: ${RELEASES_PER_PACKAGE}, orderBy: {field: CREATED_AT, direction: DESC}) {
      nodes {
        name
        description
        publishedAt
        url
        tagName
      }
    }
  }
  `;

const buildReleasesQuery = packagesWithRepos =>
  `
  {
    ${packagesWithRepos.reduce((acc, [pkg, [owner, repo]]) => `
      ${acc}
      ${buildPackageReleasesFragment(owner, repo, pkg)}
    `, "")}
  }
`;

const fetchReleases = packagesWithRepos =>
  axios
    .post(
      "https://api.github.com/graphql",
      { query: buildReleasesQuery(packagesWithRepos) },
      { headers: { Authorization: `Bearer ${process.env.GH_TOKEN}` } }
    )
    .then(({ data }) => data)
    .catch(e => {
      // TODO: return error
      console.log(
        `Caught Error: couldn't fetch github releases for ${JSON.stringify(packageRepos)}`
      );
    });

const mungeReleases = R.pipe(
  R.prop("data"),
  R.mapObjIndexed((val, key) =>
    R.pathOr([], ["releases", "nodes"])(val).map(n => ({
      ...n,
      packageName: cryptr.decrypt(key.slice(1))
    }))),
  R.values,
  R.flatten,
  R.reject(R.isNil)
);

const sortReleases = R.sortWith([R.descend(R.prop("publishedAt"))]);

const filterPackages = R.reject(R.contains("@types/"));

exports.handler = async (event, context) => {
  const packages = event.queryStringParameters.packages.split(",");

  const filteredPackages = filterPackages(packages);

  const packageRepos = await Promise.all(filteredPackages.map(getPackageRepo));

  const packagesWithRepos = R.zip(filteredPackages, packageRepos).filter(
    ([pkg, repo]) => !!repo
  );

  const releasesPayload = await fetchReleases(packagesWithRepos);

  const releases = R.pipe(mungeReleases, sortReleases)(releasesPayload);

  return { statusCode: 200, body: JSON.stringify({ releases }) };
};
