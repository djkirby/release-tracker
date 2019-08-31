import React from "react";

const Filters = (
  {
    filters: {
      includeOld,
      includeAlpha,
      includeBeta,
      includeDev,
      includeDep,
      includeRC
    },
    onFilterChange
  }
) => (
  <form>
    <span style={{ marginRight: ".6rem" }}>include:</span>

    <span style={{ marginRight: ".6rem" }}>
      <input
        type="checkbox"
        name="include-dep"
        id="include-dep"
        checked={includeDep}
        onChange={() => onFilterChange("includeDep")}
      />
      <label htmlFor="include-dep">dependencies</label>
    </span>

    <span style={{ marginRight: ".6rem" }}>
      <input
        type="checkbox"
        name="include-dev"
        id="include-dev"
        checked={includeDev}
        onChange={() => onFilterChange("includeDev")}
      />
      <label htmlFor="include-dev">devDependencies</label>
    </span>

    <span style={{ marginRight: ".6rem" }}>
      <input
        type="checkbox"
        name="include-old"
        id="include-old"
        checked={includeOld}
        onChange={() => onFilterChange("includeOld")}
      />
      <label htmlFor="include-old">satisfied versions</label>
    </span>

    <span style={{ marginRight: ".6rem" }}>
      <input
        type="checkbox"
        name="include-alpha"
        id="include-alpha"
        checked={includeAlpha}
        onChange={() => onFilterChange("includeAlpha")}
      />
      <label htmlFor="include-alpha">alpha versions</label>
    </span>

    <span style={{ marginRight: ".6rem" }}>
      <input
        type="checkbox"
        name="include-beta"
        id="include-beta"
        checked={includeBeta}
        onChange={() => onFilterChange("includeBeta")}
      />
      <label htmlFor="include-beta">beta versions</label>
    </span>

    <span style={{ marginRight: ".6rem" }}>
      <input
        type="checkbox"
        name="include-rc"
        id="include-rc"
        checked={includeRC}
        onChange={() => onFilterChange("includeRC")}
      />
      <label htmlFor="include-rc">release candidates</label>
    </span>
  </form>
);

export default Filters;
