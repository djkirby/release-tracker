import React from "react";

const Setup = ({ onPackageJsonChange, onYarnLockChange, onContinueClick }) => {
  const handleContinueClick = e => {
    e.preventDefault();
    onContinueClick();
  };

  return (
    <div>
      <form onSubmit={handleContinueClick}>
        <div style={{ marginBottom: "1.5rem" }}>
          <h3 style={{ marginBottom: ".3rem", fontSize: 20 }}>
            Input the following files from your project to get started
          </h3>
          <div style={{ fontSize: 14, marginBottom: "1.5rem" }}>
            Note: these will only be stored in your browser's storage
          </div>
          <div style={{ marginBottom: "1rem" }}>
            <div style={{ display: "flex" }}>
              <h3 style={{ marginRight: ".5rem", fontSize: 20 }}>
                Language:
              </h3>
              <span style={{ marginRight: "1rem" }}>
                <input
                  id="javascript"
                  name="language"
                  type="radio"
                  checked
                />&nbsp;
                <label htmlFor="javascript">javascript</label>
              </span>
              <span>
                <input id="ruby" name="language" type="radio" disabled />&nbsp;
                <label htmlFor="ruby">ruby</label>
              </span>
            </div>
          </div>
          <div style={{ marginBottom: "1rem" }}>
            <label htmlFor="package-json">package.json: </label>
            <input
              type="file"
              required={true}
              name="package-json"
              id="package-json"
              onChange={onPackageJsonChange}
            />
            <div style={{ fontSize: 14 }}>Used to determine packages used.</div>
          </div>
          <div style={{ marginBottom: "1rem" }}>
            <label htmlFor="yarn-lock">
              yarn.lock (optional):{" "}
            </label>
            <input
              type="file"
              name="yarn-lock"
              id="yarn-lock"
              onChange={onYarnLockChange}
            />
            <div style={{ fontSize: 14 }}>
              Used to determine currently installed versions, if locked down.
            </div>
          </div>
        </div>
        <button type="submit">Continue</button>
      </form>
    </div>
  );
};

export default Setup;
