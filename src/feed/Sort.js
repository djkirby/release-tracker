import React from "react";

const Sort = ({ sort, onSortChange }) => (
  <form>
    <div style={{ display: "flex" }}>
      <label htmlFor="sort" style={{ marginRight: ".6rem" }}>
        sort by:
      </label>
      <select
        id="sort"
        name="sort"
        value={sort}
        onChange={({ target: { value } }) => onSortChange(value)}
      >
        <option value="date">release date (newest-oldest)</option>
        <option value="name">package name (a-z)</option>
      </select>
    </div>
  </form>
);

export default Sort;
