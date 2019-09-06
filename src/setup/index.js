import React from "react";

import { dependenciesFileName, lockFileName } from "../shared/utils";

const Setup = ({
  language,
  name,
  onLanguageChange,
  onDependenciesFileChange,
  onLockFileChange,
  onContinueClick,
  onNameChange
}) => {
  const handleContinueClick = e => {
    e.preventDefault();
    onContinueClick();
  };

  return (
    <div>
      <form onSubmit={handleContinueClick} key={language}>
        <div style={{ marginBottom: "1.5rem" }}>
          <h3 style={{ marginBottom: ".3rem", fontSize: 20 }}>
            Input the following files from your project to get started
          </h3>
          <div style={{ fontSize: 14, marginBottom: "1.5rem" }}>
            Note: these will only be stored in your browser's storage
          </div>
          <div style={{ marginBottom: "1rem" }}>
            <div style={{ display: "flex" }}>
              <h3 style={{ marginRight: ".5rem", fontSize: 20 }}>Language:</h3>
              <span style={{ marginRight: "1rem" }}>
                <input
                  id="javascript"
                  name="language"
                  type="radio"
                  checked={language === "javascript"}
                  onChange={() => onLanguageChange("javascript")}
                />
                &nbsp;
                <label htmlFor="javascript">javascript</label>
              </span>
              <span>
                <input
                  id="ruby"
                  name="language"
                  type="radio"
                  checked={language === "ruby"}
                  onChange={() => onLanguageChange("ruby")}
                />
                &nbsp;
                <label htmlFor="ruby">ruby</label>
              </span>
            </div>
          </div>
          {language !== "javascript" && (
            <div style={{ marginBottom: "1rem" }}>
              <label htmlFor="name">project name: </label>
              <input
                required={true}
                name="name"
                id="name"
                value={name}
                onChange={e => onNameChange(e.target.value)}
              />
            </div>
          )}
          <div style={{ marginBottom: "1rem" }}>
            <label htmlFor="package-json">
              {dependenciesFileName(language)}:{" "}
            </label>
            <input
              type="file"
              required={true}
              name="package-json"
              id="package-json"
              onChange={onDependenciesFileChange}
            />
            <div style={{ fontSize: 14 }}>Used to determine packages used.</div>
          </div>
          <div style={{ marginBottom: "1rem" }}>
            <label htmlFor="yarn-lock">
              {lockFileName(language)}
              {language === "javascript" && " (optional)"}:{" "}
            </label>
            <input
              required={language === "ruby"}
              type="file"
              name="yarn-lock"
              id="yarn-lock"
              onChange={onLockFileChange}
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
