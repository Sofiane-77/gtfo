import { Component } from "inferno";

type TestNonJsState = { count: number };

export default class TestNonJs extends Component<{}, TestNonJsState> {
  state = { count: 0 };

  private handleClick = () => {
    this.setState((prev) => ({ count: prev.count + 1 }));
  };

  render() {
    return (
      <button data-testid="test-non-js" onClick={this.handleClick}>
        test-non-js: {this.state.count}
      </button>
    );
  }
}
