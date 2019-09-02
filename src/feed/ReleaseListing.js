import React from "react";
import marked from "marked";

const ReleaseListing = (
  {
    language,
    release: {
      url,
      description,
      publishedAt,
      tagName,
      packageName
    },
    dependencies,
    devDependencies,
    lockFile
  }
) => {
  const specifiedVersion = () =>
    dependencies[packageName] || devDependencies[packageName] || "?";

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
        {language === "javascript" &&
          <span style={{ fontSize: 16 }}>
            (currently specified as
            {" "}
            {specifiedVersion() || "?"}
            {lockFile &&
              `, locked at ${lockFile[packageName] ? lockFile[packageName] : "?"}`}
            )
          </span>}
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
