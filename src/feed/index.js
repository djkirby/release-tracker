import React from "react";

import Error from "./Error";
import Loading from "./Loading";
import ReleasesList from "./ReleasesList";

const Feed = ({ error, ...restProps }) =>
  error
    ? <Error />
    : !restProps.releases ? <Loading /> : <ReleasesList {...restProps} />;

export default Feed;
