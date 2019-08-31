import React from "react";

const Heading = ({ onReset, repoDisplay, projectName, projectSelected }) => (
  <div
    style={{
      display: "flex",
      marginBottom: "1rem",
      alignItems: "baseline"
    }}
  >
    <h1 style={{ fontSize: 32, marginRight: "1rem" }}>
      NPM Release Tracker
    </h1>
    {projectSelected &&
      <React.Fragment>
        {projectName && <h2 style={{ fontSize: 22 }}>{projectName}</h2>}
        <button style={{ marginLeft: ".8rem" }} onClick={onReset}>
          change / update
        </button>
      </React.Fragment>}
  </div>
);

export default Heading;
