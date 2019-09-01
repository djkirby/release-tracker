export const dependenciesFileName = language =>
  ({ javascript: "package.json", ruby: "Gemfile" }[language]);

export const lockFileName = language =>
  ({ javascript: "yarn.lock", ruby: "Gemfile.lock" }[language]);
