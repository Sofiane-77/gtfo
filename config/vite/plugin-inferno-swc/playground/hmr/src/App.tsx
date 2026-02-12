import { Component } from "inferno";
import "./App.css";
import { TitleWithExport, framework } from "./TitleWithExport.tsx";

type AppState = { count: number };

export class App extends Component<{}, AppState> {
  state = { count: 0 };

  private handleClick = () => {
    this.setState((prev) => ({ count: prev.count + 1 }));
  };

  render() {
    return (
      <div>
        <TitleWithExport />
        <div className="card">
          <button onClick={this.handleClick}>
            count is {this.state.count}
          </button>
          <p>
            Edit <code>src/App.tsx</code> and save to test HMR
          </p>
        </div>
        <p className="read-the-docs">
          Edit the app and {framework} should update without full reload
        </p>
      </div>
    );
  }
}
