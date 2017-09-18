import curry from "../lib/ramda/src/curry.js";
import defaultTo from "../lib/ramda/src/defaultTo.js";
import flatten from "../lib/ramda/src/flatten.js";
import identity from "../lib/ramda/src/identity.js";
import join from "../lib/ramda/src/join.js";
import map from "../lib/ramda/src/map.js";
import pipe from "../lib/ramda/src/pipe.js";
import toLower from "../lib/ramda/src/toLower.js";
import toPairs from "../lib/ramda/src/toPairs.js";
import zip from "../lib/ramda/src/zip.js";

const coalesce = join("");
const sanitizeKey = identity;
const sanitizeValue = identity;
const sanitizeTag = toLower;

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
    map(([k, v]) => ` ${sanitizeKey(k)}="${sanitizeValue(v)}"`),
    coalesce
);

const tag = unsafeTagName => {
    const tagName = sanitizeTag(unsafeTagName);
    const attrFactory = createAttrs(tagName);
    return selfClosing.has(tagName)
        ? attrs => `<${tagName}${attrFactory(attrs)}/>`
        : curry(
            (attrs, children = []) =>
                `<${tagName}${attrFactory(attrs)}>${coalesce(children)}</${tagName}>`);
};

const tmpl = (strings, ...values) => (
    model => coalesce(flatten(zip(strings, [...map(x => x(model), values), ""])))
);

export {
    tag,
    tmpl,
};
