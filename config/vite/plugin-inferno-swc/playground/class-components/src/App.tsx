import { Component } from "inferno";
import { getGetting } from "./utils.tsx";

export class App extends Component {
  render() {
    return <span>{getGetting()} World</span>;
  }
}
