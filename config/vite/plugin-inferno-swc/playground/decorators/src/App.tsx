import { Component } from "inferno";

type DecoratedClass = { prototype: { render: () => any } };

function decorated(target: DecoratedClass) {
  const original = target.prototype.render;
  target.prototype.render = () => <div>Hello {original()}</div>;
}

@decorated
export class App extends Component {
  render() {
    return <span>World</span>;
  }
}
