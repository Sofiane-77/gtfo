import { Component } from "inferno";

type AppState = { count: number };

export class App extends Component<{}, AppState> {
  state = { count: 0 };

  private handleClick = () => {
    this.setState((prev) => ({ count: prev.count + 1 }));
  };

  render() {
    return (
      <button onClick={this.handleClick}>count is {this.state.count}</button>
    );
  }
}
