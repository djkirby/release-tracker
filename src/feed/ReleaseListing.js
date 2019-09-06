import * as R from "ramda";
import React from "react";
import marked from "marked";

const ReleaseListing = ({
  language,
  release: { url, description, publishedAt, tagName, packageName },
  dependenciesFile,
  lockFile
}) => {
  const specifiedVersion = () => {
    if (language === "javascript") {
      return (
        dependenciesFile.dependencies[packageName] ||
        dependenciesFile.devDependencies[packageName] ||
        null
      );
    }
    if (language === "ruby") {
      const [_, version] =
        dependenciesFile.match(
          new RegExp(`gem '${packageName}'.*?('.*\\d\\..*?')`)
        ) || [];

      return version || null;
    }
    return null;
  };

  const lockedVersion = () => {
    if (language === "javascript") {
      return lockFile[packageName] || null;
    }
    if (language === "ruby") {
      const spec = lockFile.GEM.specs[packageName];
      return spec ? spec.version : null;
    }
    return null;
  };

  const versionsMessage = [
    specifiedVersion() ? `currently specified as ${specifiedVersion()}` : null,
    lockedVersion() ? `locked at ${lockedVersion()}` : null
  ]
    .filter(x => !!x)
    .join(", ");

  return (
    <div>
      <div style={{ fontSize: 14, marginBottom: ".2rem" }}>
        {new Date(publishedAt).toLocaleString()}
      </div>
      <div style={{ display: "flex", alignItems: "baseline" }}>
        <h2
          style={{
            fontSize: 28,
            marginBottom: ".1rem",
            marginRight: ".6rem"
          }}
        >
          {packageName}
        </h2>
        <a
          style={{
            display: "block",
            marginRight: ".6rem",
            fontSize: 20
          }}
          href={url}
        >
          {tagName}
        </a>
        {versionsMessage.length > 0 && (
          <span style={{ fontSize: 16 }}>({versionsMessage})</span>
        )}
      </div>
      <br />
      <pre
        style={{ fontSize: 14 }}
        dangerouslySetInnerHTML={{
          __html: marked(description)
        }}
      />
      <hr style={{ marginBottom: "1rem" }} />
    </div>
  );
};

export default ReleaseListing;
