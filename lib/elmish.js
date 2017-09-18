import T from "../lib/ramda/src/T.js";
import cond from "../lib/ramda/src/cond.js";
import curry from "../lib/ramda/src/curry.js";
import defaultTo from "../lib/ramda/src/defaultTo.js";
import flatten from "../lib/ramda/src/flatten.js";
import identity from "../lib/ramda/src/identity.js";
import ifElse from "../lib/ramda/src/ifElse.js";
import is from "../lib/ramda/src/is.js";
import join from "../lib/ramda/src/join.js";
import map from "../lib/ramda/src/map.js";
import memoize from "../lib/ramda/src/memoize.js";
import pipe from "../lib/ramda/src/pipe.js";
import prop from "../lib/ramda/src/prop.js";
import sortBy from "../lib/ramda/src/sortBy.js";
import toLower from "../lib/ramda/src/toLower.js";
import toPairs from "../lib/ramda/src/toPairs.js";
import zip from "../lib/ramda/src/zip.js";

const coalesce = join("");
const sanitizeChildren = tagName => pipe(
    cond([
        [is(Boolean), value => [{ tagName: "text-boolean", textValue: `${value}` }]],
        [is(Number), value => [{ tagName: "text-number", textValue: `${value}` }]],
        [is(RegExp), value => [{ tagName: "text-regexp", textValue: `${value}` }]],
        [is(String), value => [{ tagName: "text-string", textValue: value }]],
        [T, defaultTo([])],
    ]),
    map(cond([
        [is(Boolean), value => ({ tagName: "text-boolean", textValue: `${value}` })],
        [is(Number), value => ({ tagName: "text-number", textValue: `${value}` })],
        [is(RegExp), value => ({ tagName: "text-regexp", textValue: `${value}` })],
        [is(String), value => ({ tagName: "text-string", textValue: value })],
        [T, defaultTo({ tagName: "unknown", textValue: "" })],
    ]))
);

const sanitizeKey = identity;
const sanitizeTag = toLower;
const sanitizeValue = identity;

// From https://www.w3.org/TR/html5/syntax.html#void-elements
const selfClosing = new Set([
    "area",
    "base",
    "br",
    "col",
    "embed",
    "hr",
    "img",
    "input",
    "keygen",
    "link",
    "meta",
    "param",
    "source",
    "track",
    "wbr",
]);

const createAttrs = tagName => pipe(
    defaultTo({}),
    toPairs,
    sortBy(prop(0)),
    map(([k, v]) => ` ${sanitizeKey(k)}="${sanitizeValue(v)}"`),
    coalesce
);

const createBindings = tagName => attrs => null;

const tag = unsafeTagName => (unsafeAttrs, unsafeChildren) => {
    const tagName = sanitizeTag(unsafeTagName);
    return {
        attrs: createAttrs(tagName)(unsafeAttrs),
        bindings: createBindings(tagName)(unsafeAttrs),
        children: sanitizeChildren(tagName)(unsafeChildren),
        isSelfClosing: selfClosing.has(tagName),
        tagName,
    };
};

const old_tag = unsafeTagName => {
    const tagName = sanitizeTag(unsafeTagName);
    const attrFactory = createAttrs(tagName);
    return selfClosing.has(tagName)
        ? attrs => `<${tagName}${attrFactory(attrs)}/>`
        : curry(
            (attrs, children = []) =>
                `<${tagName}${attrFactory(attrs)}>${coalesce(children)}</${tagName}>`);
};

const renderToString = ({ attrs, children, isSelfClosing, tagName, textValue }) => (
    textValue
        ? textValue
        : (isSelfClosing
           ? `<${tagName}${attrs}/>`
           : `<${tagName}${attrs}>${coalesce(map(renderToString, children))}</${tagName}>`)
);

const programWithFlags = setup => ({
    embed(node, flags = {}) {
        console.log("embed", setup, node, flags);
        const [model, cmd] = setup.init(flags);
        const tree = setup.view(model);
        console.log("tree", tree);
        const markup = renderToString(tree);
        console.log("markup", markup);
        node.innerHTML += markup;
    },
});

const Cmd = {
    none() {},
};

const Sub = {
    none() {},
};

export {
    Cmd,
    Sub,
    programWithFlags,
    tag,
};
