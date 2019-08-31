import React from "react";

class ErrorBoundary extends React.Component {
  state = { hasError: false };

  componentDidCatch() {
    this.setState({ hasError: true });
  }

  render() {
    return this.state.hasError
      ? <div>Sorry, something went wrong.</div>
      : this.props.children;
  }
}

export default ErrorBoundary;
