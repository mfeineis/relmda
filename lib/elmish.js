import T from "../lib/ramda/src/T.js";
import always from "../lib/ramda/src/always.js";
import cond from "../lib/ramda/src/cond.js";
import curry from "../lib/ramda/src/curry.js";
import defaultTo from "../lib/ramda/src/defaultTo.js";
import filter from "../lib/ramda/src/filter.js";
import flatten from "../lib/ramda/src/flatten.js";
import identity from "../lib/ramda/src/identity.js";
import ifElse from "../lib/ramda/src/ifElse.js";
import is from "../lib/ramda/src/is.js";
import join from "../lib/ramda/src/join.js";
import map from "../lib/ramda/src/map.js";
import memoize from "../lib/ramda/src/memoize.js";
import not from "../lib/ramda/src/not.js";
import pipe from "../lib/ramda/src/pipe.js";
import prop from "../lib/ramda/src/prop.js";
import sort from "../lib/ramda/src/sort.js";
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
        [T, pipe(defaultTo([]), flatten)],
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
    filter(([k, v]) => not(is(Array, v) || is(Function, v))),
    sortBy(prop(0)),
    map(([k, v]) => ` ${sanitizeKey(k)}="${sanitizeValue(v)}"`),
    coalesce
);

const createBindings = tagName => pipe(
    defaultTo({}),
    filter(value => not(is(Function, value))),
    filter(is(Array))
);

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

const renderToString = nodes => (
    coalesce(map(({ attrs, children, isSelfClosing, tagName, textValue }) => (
        textValue
            ? textValue
            : (isSelfClosing
               ? `<${tagName}${attrs}/>`
               : `<${tagName}${attrs}>${coalesce(map(renderToString, children))}</${tagName}>`)
    ), is(Array, nodes) ? flatten(nodes) : [nodes]))
);

const trace = (...rest) => console.log(...rest);
const pretty = obj => JSON.stringify(obj, null, "  ");
const compact = obj => JSON.stringify(obj);

const renderLocalDom = (parent, nodes) =>
    map(({ attrs, bindings, children, isSelfClosing, tagName, textValue }) => {
        if (textValue) {
            parent.appendChild(document.createTextNode(textValue));
            return;
        }

        let subNode = document.createElement("div");
        subNode.innerHTML = `<${tagName}${attrs}></${tagName}>`;

        const target = subNode.firstChild;
        //trace(`all bindings:`, bindings);

        Object.keys(bindings).forEach(key => {
            const eventName = toLower(key.replace(/^on/i, ""));
            const [type, dataOrDecoder] = bindings[key];
            const decoder = is(Function, dataOrDecoder)
                ? dataOrDecoder
                : always(dataOrDecoder);
            //trace(`setting up binding "${tagName}.${key}" -> "${eventName}"`);

            target.addEventListener(eventName, event => {
                //trace(`EVT "${eventName}":`, event);
                const msg = {
                    type,
                    payload: decoder(event),
                };
                trace(`MSG -> ${compact(msg)}`);
            });
        });

        renderLocalDom(target, children);

        parent.appendChild(target);
        subNode = null;
    }, is(Array, nodes) ? flatten(nodes) : [nodes]);

const renderToDom = (root, toplevelNodes) => {
    const fragment = document.createDocumentFragment();
    renderLocalDom(fragment, toplevelNodes);
    root.appendChild(fragment);
};

const renderToDomStupid = (dom, nodes) => {
    dom.innerHTML += renderToString(nodes);
};

const programWithFlags = setup => {
    const embed = (root, flags = {}) => {
        console.log("embed", setup, root, flags);
        const [model, cmd] = setup.init(flags);
        const rawView = setup.view(model);
        const nodes = is(Array, rawView) ? flatten(rawView) : rawView;

        console.log("nodes", nodes);

        const markup = renderToString(nodes);
        console.log("markup", markup);

        //renderToDomStupid(root, nodes);
        renderToDom(root, nodes);
    };
    return {
        embed,
        fullscreen: flags => embed(document.querySelector("body"), flags),
    };
};

const Cmd = {
    none() {},
};

const Decoder = {
    targetValue: event => event.target.value,
};

const Sub = {
    none() {},
};

export {
    Cmd,
    Decoder,
    Sub,
    programWithFlags,
    tag,
};
