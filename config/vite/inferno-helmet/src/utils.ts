import {
  HTML_TAG_MAP,
  SEO_PRIORITY_TAGS,
  TAG_NAMES,
  TAG_PROPERTIES,
} from './constants';

import type {
  AggregatedState,
  BaseProps,
  HelmetPropArrays,
  HelmetPropBooleans,
  HelmetPropObjects,
  HelmetProps,
  LinkProps,
  MetaProps,
  PropArrayItem,
  RegisteredHelmetPropsArray,
  ScriptProps,
} from './types';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type PropList = Record<string, any>;

type AttributeList = string[];

type SeenTags<T extends keyof HelmetPropArrays> = {
  [key in keyof PropArrayItem<T>]?: Record<string, boolean>
};

type MatchProps = Record<string, AttributeList | string>;

function getInnermostProperty<T extends keyof HelmetProps>(
  props: RegisteredHelmetPropsArray,
  propName: T,
): HelmetProps[T] | undefined {
  for (let i = props.length - 1; i >= 0; --i) {
    const value = props[i]![1][propName];
    if (value !== undefined) return value;
  }
  return undefined;
}

export function getTitleFromPropsList(
  props: RegisteredHelmetPropsArray,
): string | undefined {
  let innermostTitle = getInnermostProperty(props, TAG_NAMES.TITLE);

  const innermostTemplate = getInnermostProperty(
    props,
    'titleTemplate',
  );

  if (Array.isArray(innermostTitle)) {
    innermostTitle = innermostTitle.join('');
  }
  if (innermostTemplate && innermostTitle) {
    return innermostTemplate.replace(/%s/g, () => innermostTitle);
  }

  const innermostDefaultTitle = getInnermostProperty(
    props,
    'defaultTitle',
  );

  // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
  return (innermostTitle || innermostDefaultTitle) ?? undefined;
}

export function mergeAttributes<T extends keyof HelmetPropObjects>(
  element: T,
  props: RegisteredHelmetPropsArray,
): HelmetProps[T] {
  const res: HelmetProps[T] = {};
  for (const item of props) {
    const attrs = item[1][element];
    if (attrs) Object.assign(res, attrs);
  }
  return res;
}

export function aggregateBaseProps(
  props: RegisteredHelmetPropsArray,
): BaseProps | undefined {
  for (let i = props.length - 1; i >= 0; --i) {
    const res = props[i]![1].base;
    if (res?.href || res?.target) return res;
  }
  return undefined;
}

function getPrimaryProp<T extends keyof HelmetPropArrays>(
  props: PropArrayItem<T>,
  primaryProps: Array<keyof PropArrayItem<T>>,
): keyof PropArrayItem<T> | null {
  let primaryAttributeKey: keyof PropArrayItem<T> | undefined;

  for (const keyString of Object.keys(props)) {
    const key = keyString as keyof PropArrayItem<T>;

    if (primaryProps.includes(key)
      && !(
        primaryAttributeKey === TAG_PROPERTIES.REL
        && (props[primaryAttributeKey] as string).toLowerCase() === 'canonical'
      )
      && !(
        key === TAG_PROPERTIES.REL
        && (props[key] as string).toLowerCase() === 'stylesheet'
      )
    ) primaryAttributeKey = key;

    if (
      primaryProps.includes(key)
      && (key === TAG_PROPERTIES.INNER_HTML
        || key === TAG_PROPERTIES.CSS_TEXT
        || key === TAG_PROPERTIES.ITEM_PROP)
    ) primaryAttributeKey = key;
  }

  return primaryAttributeKey ?? null;
}

export function getTagsFromPropsList<T extends keyof HelmetPropArrays>(
  tagName: T,
  primaryAttributes: Array<keyof PropArrayItem<T>>,
  propsArray: RegisteredHelmetPropsArray,
): HelmetPropArrays[T] {
  const approvedSeenTags: SeenTags<T> = {};

  return propsArray.map(([, props]) => props)
    .filter((props) => {
      if (Array.isArray(props[tagName])) {
        return true;
      }
      if (typeof props[tagName] !== 'undefined') {
        // eslint-disable-next-line no-console
        console.warn(
          `Helmet: ${tagName} should be of type "Array". Instead found type "${typeof props[
            tagName
          ]}"`,
        );
      }
      return false;
    })
    .map((props) => props[tagName])
    .reverse()
    .reduce<Array<PropArrayItem<T>>>((approvedTags, instanceTags) => {
      const instanceSeenTags: SeenTags<T> = {};

      instanceTags!.filter((tag: PropArrayItem<T>) => {
        const primaryAttributeKey = getPrimaryProp(tag, primaryAttributes);

        if (!primaryAttributeKey || !tag[primaryAttributeKey]) {
          return false;
        }

        const value = (tag[primaryAttributeKey] as string).toLowerCase();

        if (!approvedSeenTags[primaryAttributeKey]) {
          approvedSeenTags[primaryAttributeKey] = {};
        }

        if (!instanceSeenTags[primaryAttributeKey]) {
          instanceSeenTags[primaryAttributeKey] = {};
        }

        if (!approvedSeenTags[primaryAttributeKey][value]) {
          instanceSeenTags[primaryAttributeKey][value] = true;
          return true;
        }

        return false;
      }).reverse()
        .forEach((tag: PropArrayItem<T>) => {
          approvedTags.push(tag);
        });

      const keys = Object.keys(instanceSeenTags) as
        Array<keyof PropArrayItem<T>>;

      for (const attributeKey of keys) {
        const tagUnion = {
          ...approvedSeenTags[attributeKey],
          ...instanceSeenTags[attributeKey],
        };

        approvedSeenTags[attributeKey] = tagUnion;
      }

      return approvedTags;
    }, [])
    .reverse() as HelmetPropArrays[T];
}

function getAnyTrueFromPropsArray<T extends keyof HelmetPropBooleans>(
  propsArray: RegisteredHelmetPropsArray,
  propName: T,
): boolean {
  for (const [, props] of propsArray) {
    if (props[propName]) return true;
  }
  return false;
}

export function flattenArray(possibleArray: string | string[]): string {
  return Array.isArray(possibleArray) ? possibleArray.join('') : possibleArray;
}

function checkIfPropsMatch<T extends keyof HelmetPropArrays>(
  props: PropArrayItem<T>,
  toMatch: MatchProps,
) {
  for (const key of Object.keys(props)) {
    if (toMatch[key]?.includes(
      props[key as keyof PropArrayItem<T>] as unknown as string,
    )) return true;
  }
  return false;
}

export function prioritizer<T extends keyof HelmetPropArrays>(
  propsArray: HelmetPropArrays[T],
  propsToMatch: MatchProps,
): {
  default: Array<PropArrayItem<T>>;
  priority: Array<PropArrayItem<T>>;
} {
  const res = {
    default: Array<PropArrayItem<T>>(),
    priority: Array<PropArrayItem<T>>(),
  };

  if (propsArray) {
    for (const props of propsArray) {
      if (checkIfPropsMatch(props, propsToMatch)) {
        res.priority.push(props);
      } else {
        res.default.push(props);
      }
    }
  }

  return res;
}

export const without = (obj: PropList, key: string): PropList => ({
  ...obj,
  [key]: undefined,
});

type UnknownObject = Record<number | string | symbol, unknown>;

export function cloneProps(props: HelmetProps): HelmetProps {
  const res: UnknownObject = {};
  for (const [key, value] of Object.entries(props)) {
    res[key] = Array.isArray(value) ? value.slice() : value;
  }
  return res as HelmetProps;
}

export function mergeProps(target: HelmetProps, source: HelmetProps): void {
  const tgt = target as UnknownObject;
  for (const [key, srcValue] of Object.entries(source)) {
    if (Array.isArray(srcValue)) {
      const tgtValue = tgt[key] as undefined | unknown[];
      tgt[key] = tgtValue ? tgtValue.concat(srcValue) : srcValue;
    } else tgt[key] = srcValue;
  }
}

export function pushToPropArray<K extends keyof HelmetPropArrays>(
  target: HelmetProps,
  array: K,
  item: Exclude<HelmetPropArrays[K], undefined>[number],
): void {
  type A = Array<typeof item>;
  const tgt = target[array] as A | undefined;
  if (tgt) tgt.push(item);
  else (target[array] as A) = [item];
}

export function calcAggregatedState(
  props: RegisteredHelmetPropsArray,
): AggregatedState {
  let links = getTagsFromPropsList(
    TAG_NAMES.LINK,
    [TAG_PROPERTIES.REL, TAG_PROPERTIES.HREF],
    props,
  );
  let meta = getTagsFromPropsList(
    'meta',
    [
      TAG_PROPERTIES.NAME,
      'charSet',
      'httpEquiv',
      TAG_PROPERTIES.PROPERTY,
      'itemProp',
    ],
    props,
  );
  let script = getTagsFromPropsList(
    'script',
    [TAG_PROPERTIES.SRC, TAG_PROPERTIES.INNER_HTML],
    props,
  );

  const prioritizeSeoTags = getAnyTrueFromPropsArray(props, 'prioritizeSeoTags');

  let priority: {
    links: LinkProps[] | undefined;
    meta: MetaProps[] | undefined;
    script: ScriptProps[] | undefined;
  } | undefined;

  if (prioritizeSeoTags) {
    const linkP = prioritizer<'link'>(links, SEO_PRIORITY_TAGS.link);
    links = linkP.default;

    const metaP = prioritizer<'meta'>(meta, SEO_PRIORITY_TAGS.meta);
    meta = metaP.default;

    const scriptP = prioritizer<'script'>(script, SEO_PRIORITY_TAGS.script);
    script = scriptP.default;

    priority = {
      links: linkP.priority,
      meta: metaP.priority,
      script: scriptP.priority,
    };
  }

  return {
    base: aggregateBaseProps(props),
    bodyAttributes: mergeAttributes('bodyAttributes', props),
    defer: getInnermostProperty(props, 'defer'),
    encodeSpecialCharacters: getInnermostProperty(props, 'encodeSpecialCharacters') ?? true,
    htmlAttributes: mergeAttributes('htmlAttributes', props),
    links,
    meta,
    noscript: getTagsFromPropsList(
      'noscript',
      [TAG_PROPERTIES.INNER_HTML],
      props,
    ),
    onChangeClientState: getInnermostProperty(props, 'onChangeClientState'),
    priority,
    script,
    style: getTagsFromPropsList(
      'style',
      [TAG_PROPERTIES.CSS_TEXT],
      props,
    ),
    title: getTitleFromPropsList(props),
    titleAttributes: mergeAttributes('titleAttributes', props),
  };
}

export function propToAttr(prop: string): string {
  return HTML_TAG_MAP[prop] ?? prop;
}
