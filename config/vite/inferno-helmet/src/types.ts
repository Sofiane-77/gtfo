export type HTMLAttributes<T = HTMLElement> = Record<string, unknown>;

export type BaseProps = HTMLAttributes<HTMLBaseElement>;
export type BodyProps = HTMLAttributes<HTMLBodyElement>;
export type HtmlProps = HTMLAttributes<HTMLHtmlElement>;
export type LinkProps = HTMLAttributes<HTMLLinkElement>;
export type MetaProps = HTMLAttributes<HTMLMetaElement>;

export type NoscriptProps = HTMLAttributes<HTMLElement> & {
  innerHTML?: string;
};

export type ScriptProps = HTMLAttributes<HTMLScriptElement> & {
  innerHTML?: string;
};

export type StyleProps = HTMLAttributes<HTMLStyleElement> & {
  cssText?: string;
};

export type TitleProps = HTMLAttributes<HTMLTitleElement>;

export type HelmetChildProps = BaseProps | BodyProps | HtmlProps | LinkProps
  | MetaProps | NoscriptProps
  | ScriptProps | StyleProps | TitleProps;

export type InfernoNode = unknown;

export type HelmetTags = {
  baseTag: HTMLBaseElement[];
  linkTags: HTMLLinkElement[];
  metaTags: HTMLMetaElement[];
  noscriptTags: HTMLElement[];
  scriptTags: HTMLScriptElement[];
  styleTags: HTMLStyleElement[];
};

export type HelmetDatum<T = InfernoNode> = {
  toComponent(): T;
  toString(): string;
};

export type HelmetHTMLBodyDatum = HelmetDatum<BodyProps>;

export type HelmetHTMLElementDatum = HelmetDatum<HtmlProps>;

export type HelmetServerState = {
  base: HelmetDatum;
  bodyAttributes: HelmetHTMLBodyDatum;
  htmlAttributes: HelmetHTMLElementDatum;
  link: HelmetDatum;
  meta: HelmetDatum;
  noscript: HelmetDatum;
  script: HelmetDatum;
  style: HelmetDatum;
  title: HelmetDatum;
  titleAttributes?: HelmetDatum;
  priority: HelmetDatum;
};

export type StateUpdate = HelmetTags & {
  bodyAttributes: BodyProps;
  defer: boolean;
  htmlAttributes: HtmlProps;
  onChangeClientState: (
    newState: StateUpdate,
    addedTags: Partial<HelmetTags>,
    removedTags: Partial<HelmetTags>,
  ) => void;
  title: string;
  titleAttributes: TitleProps;
};

export type OnChangeClientState = (
  newState: StateUpdate,
  addedTags: Partial<HelmetTags>,
  removedTags: Partial<HelmetTags>,
) => void;

export type HelmetPropArrays = {
  link?: LinkProps[];
  meta?: MetaProps[];
  noscript?: NoscriptProps[];
  script?: ScriptProps[];
  style?: StyleProps[];
};

export type PropArrayItem<T extends keyof HelmetPropArrays>
  = Exclude<HelmetPropArrays[T], undefined>[number];

export type HelmetPropObjects = {
  bodyAttributes?: BodyProps;
  htmlAttributes?: HtmlProps;
  titleAttributes?: TitleProps;
};

export type HelmetPropBooleans = {
  prioritizeSeoTags?: boolean;
};

export type HelmetProps = HelmetPropArrays
  & HelmetPropBooleans
  & HelmetPropObjects
  & {
    base?: BaseProps;
    children?: InfernoNode;
    defaultTitle?: string;
    defer?: boolean;
    encodeSpecialCharacters?: boolean;
    onChangeClientState?: OnChangeClientState;
    title?: string;
    titleTemplate?: string;
  };

export type RegisteredHelmetPropsArray
  = Array<[id: string, props: HelmetProps]>;

export type AggregatedState = {
  base: BaseProps | undefined;
  bodyAttributes: BodyProps | undefined;
  defer: boolean | undefined;
  encodeSpecialCharacters: boolean;
  htmlAttributes: HtmlProps | undefined;
  links: LinkProps[] | undefined;
  meta: MetaProps[] | undefined;
  noscript: NoscriptProps[] | undefined;
  onChangeClientState: OnChangeClientState | undefined;
  priority: {
    links: LinkProps[] | undefined;
    meta: MetaProps[] | undefined;
    script: ScriptProps[] | undefined;
  } | undefined;
  script: ScriptProps[] | undefined;
  style: StyleProps[] | undefined;
  title: string | undefined;
  titleAttributes: TitleProps | undefined;
};

export type MappedServerState = HelmetTags & { encode?: boolean };

export type HelmetDataContext = {
  helmet?: HelmetServerState;
};

export type ContextValue = {
  clientApply: () => void;
  update: (id: string, props: HelmetProps | undefined) => void;
};

export type HelmetProviderHeap = {
  firstRender: boolean;
  helmets: RegisteredHelmetPropsArray;
  nextAnimFrameId?: number;
  serverState?: HelmetServerState;
  state: AggregatedState | undefined;
};
