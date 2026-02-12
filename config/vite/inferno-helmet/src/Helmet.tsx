import { Component, Fragment } from "inferno";
import { createElement } from "inferno-create-element";

import { Context } from "./context";

import { REACT_TAG_MAP, TAG_NAMES, VALID_TAG_NAMES } from "./constants";

import type {
  BaseProps,
  BodyProps,
  ContextValue,
  HelmetChildProps,
  HelmetProps,
  HtmlProps,
  InfernoNode,
  LinkProps,
  MetaProps,
  NoscriptProps,
  ScriptProps,
  StyleProps,
  TitleProps,
} from "./types";
import { cloneProps, mergeProps, pushToPropArray } from "./utils";

type VNodeLike = {
  type: unknown;
  props?: Record<string, unknown>;
  children?: InfernoNode;
};

function isFragmentType(type: unknown): boolean {
  return type === Fragment;
}

function assertChildType(
  childType: VNodeLike["type"],
  nestedChildren: InfernoNode,
): asserts childType is TAG_NAMES | typeof Fragment {
  if (isFragmentType(childType)) return;

  if (typeof childType !== "string") {
    throw Error(
      "You may be attempting to nest <Helmet> components within each other, which is not allowed. Refer to our API for more information.",
    );
  }

  if (!(VALID_TAG_NAMES as string[]).includes(childType)) {
    throw Error(
      `Only elements types ${VALID_TAG_NAMES.join(", ")} are allowed. Helmet does not support rendering <${childType}> elements. Refer to our API for more information.`,
    );
  }

  if (
    !nestedChildren ||
    typeof nestedChildren === "string" ||
    Array.isArray(nestedChildren)
  )
    return;

  throw Error(
    `Helmet expects a string as a child of <${childType}>. Did you forget to wrap your children in braces? ( <${childType}>{\`\`}</${childType}> ) Refer to our API for more information.`,
  );
}

function getPropName(key: string): keyof HelmetChildProps {
  const res = REACT_TAG_MAP[key];
  if (res) {
    // eslint-disable-next-line no-console
    console.warn(`"${key}" is not a valid JSX prop, replace it by "${res}"`);
  }
  return (res ?? key) as keyof HelmetChildProps;
}

function flattenChildren(children: InfernoNode): InfernoNode[] {
  const res: InfernoNode[] = [];

  const add = (child: InfernoNode) => {
    if (child === undefined || child === null || child === false) return;
    if (Array.isArray(child)) {
      for (const item of child) add(item);
      return;
    }
    res.push(child);
  };

  add(children);
  return res;
}

function reduceChildrenAndProps(
  props: HelmetProps,
): Omit<HelmetProps, "children"> {
  const res: HelmetProps = cloneProps(props);

  for (const item of Object.values(props)) {
    if (Array.isArray(item)) {
      for (const it of item) {
        if (it) {
          for (const key of Object.keys(it)) {
            const p = getPropName(key);
            if (p !== key) {
              it[p] = it[key as keyof HelmetChildProps] as unknown;
              delete it[key as keyof HelmetChildProps];
            }
          }
        }
      }
    } else if (item && typeof item === "object") {
      const it = item as HelmetChildProps;
      for (const key of Object.keys(it)) {
        const p = getPropName(key);
        if (p !== key) {
          it[p] = it[key as keyof HelmetChildProps] as unknown;
          delete it[key as keyof HelmetChildProps];
        }
      }
    }
  }

  for (const child of flattenChildren(props.children)) {
    if (child === undefined || child === null) continue;

    if (typeof child !== "object" || !("type" in child)) {
      throw Error(`"${typeof child}" is not a valid <Helmet> descendant`);
    }

    let nestedChildren: InfernoNode;
    const childProps: HelmetChildProps = {};

    const vnode = child as VNodeLike;
    const rawProps = vnode.props ?? {};
    const rawChildren =
      (rawProps as { children?: InfernoNode }).children ?? vnode.children;

    if (rawProps) {
      for (const [key, value] of Object.entries(rawProps)) {
        if (key === "children") nestedChildren = value as InfernoNode;
        else childProps[getPropName(key)] = value as unknown;
      }
    }

    if (nestedChildren === undefined) nestedChildren = rawChildren;

    const { type } = vnode;
    assertChildType(type, nestedChildren);

    function assertStringChild(child2: InfernoNode): asserts child2 is string {
      if (typeof child2 !== "string") {
        // eslint-disable-next-line no-console
        console.error(`child of ${String(type)} element should be a string`);
      }
    }

    if (isFragmentType(type)) {
      mergeProps(res, reduceChildrenAndProps({ children: nestedChildren }));
      continue;
    }

    switch (type) {
      case TAG_NAMES.BASE:
        res.base = childProps as BaseProps;
        break;

      case TAG_NAMES.BODY:
        res.bodyAttributes = childProps as BodyProps;
        break;

      case TAG_NAMES.HTML:
        res.htmlAttributes = childProps as HtmlProps;
        break;

      case TAG_NAMES.LINK:
      case TAG_NAMES.META:
        if (nestedChildren) {
          throw Error(
            `<${type} /> elements are self-closing and can not contain children. Refer to our API for more information.`,
          );
        }
        pushToPropArray(res, type, childProps as LinkProps | MetaProps);
        break;

      case TAG_NAMES.NOSCRIPT:
      case TAG_NAMES.SCRIPT:
        if (nestedChildren !== undefined) {
          assertStringChild(nestedChildren);
          (childProps as NoscriptProps | ScriptProps).innerHTML =
            nestedChildren as string;
        }
        pushToPropArray(res, type, childProps);
        break;

      case TAG_NAMES.STYLE:
        assertStringChild(nestedChildren);
        (childProps as StyleProps).cssText = nestedChildren as string;
        pushToPropArray(res, type, childProps as StyleProps);
        break;

      case TAG_NAMES.TITLE:
        res.titleAttributes = childProps as TitleProps;

        if (typeof nestedChildren === "string") res.title = nestedChildren;
        else if (Array.isArray(nestedChildren))
          res.title = nestedChildren.join("");
        break;

      case TAG_NAMES.HEAD:
      default:
        break;
    }
  }

  delete res.children;
  return res;
}

let nextHelmetId = 0;

class HelmetInner extends Component<
  HelmetProps & { helmetContext?: ContextValue }
> {
  private id = `helmet-${(nextHelmetId += 1)}`;

  private getHelmetProps(): HelmetProps {
    const { helmetContext, ...helmetProps } = this.props as HelmetProps & {
      helmetContext?: ContextValue;
    };
    return helmetProps;
  }

  private getContext(): ContextValue {
    const ctx = this.props.helmetContext;
    if (!ctx) {
      throw Error(
        "<Helmet> component must be within a <HelmetProvider> children tree",
      );
    }
    return ctx;
  }

  private register() {
    const ctx = this.getContext();
    ctx.update(this.id, reduceChildrenAndProps(this.getHelmetProps()));
  }

  componentDidMount() {
    const ctx = this.getContext();
    ctx.clientApply();
  }

  componentDidUpdate() {
    const ctx = this.getContext();
    ctx.update(this.id, reduceChildrenAndProps(this.getHelmetProps()));
    ctx.clientApply();
  }

  componentWillUnmount() {
    const ctx = this.getContext();
    ctx.update(this.id, undefined);
    ctx.clientApply();
  }

  render() {
    this.register();
    return null;
  }
}

const Helmet = (props: HelmetProps) => (
  <Context.Consumer>
    {(value) => (
      <HelmetInner
        {...props}
        helmetContext={value as ContextValue | undefined}
      />
    )}
  </Context.Consumer>
);

export default Helmet;
