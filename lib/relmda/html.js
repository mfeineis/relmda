import { compact, pretty, trace } from "./util.js";

import T from "../ramda/src/T.js";
import cond from "../ramda/src/cond.js";
import defaultTo from "../ramda/src/defaultTo.js";
import filter from "../ramda/src/filter.js";
import flatten from "../ramda/src/flatten.js";
import fromPairs from "../ramda/src/fromPairs.js";
import identity from "../ramda/src/identity.js";
import is from "../ramda/src/is.js";
import join from "../ramda/src/join.js";
import map from "../ramda/src/map.js";
import not from "../ramda/src/not.js";
import pipe from "../ramda/src/pipe.js";
import prop from "../ramda/src/prop.js";
import repeat from "../ramda/src/repeat.js";
import replace from "../ramda/src/replace.js";
import sortBy from "../ramda/src/sortBy.js";
import toLower from "../ramda/src/toLower.js";
import toPairs from "../ramda/src/toPairs.js";
import zip from "../ramda/src/zip.js";

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

const sortByKey = sortBy(prop(0));
const sortStrings = sortBy(identity);

const createAttrs = tagName => pipe(
    defaultTo({}),
    toPairs,
    filter(([k, v]) => not(is(Array, v) || is(Function, v))),
    sortByKey,
    map(([k, v]) => ` ${sanitizeKey(k)}="${sanitizeValue(v)}"`),
    coalesce
);

const prepareModifiers = modifiers => (
    fromPairs(zip(sortStrings(modifiers), repeat(true, modifiers.length)))
);

const prepareBinding = ([msg, data, ...modifiers]) => (
    [msg, data, prepareModifiers(modifiers)]
);

const createBindings = tagName => pipe(
    defaultTo({}),
    filter(value => not(is(Function, value))),
    filter(is(Array)),
    toPairs,
    map(([k, v]) => [toLower(replace(/^on/i, "", k)), prepareBinding(v)]),
    sortByKey,
    fromPairs
);

const node = unsafeTagName => (unsafeAttrs, unsafeChildren) => {
    const tagName = sanitizeTag(unsafeTagName);
    const bindings = createBindings(tagName)(unsafeAttrs);
    //trace(`bindings`, pretty(bindings));
    return {
        attrs: createAttrs(tagName)(unsafeAttrs),
        bindings,
        children: sanitizeChildren(tagName)(unsafeChildren),
        isSelfClosing: selfClosing.has(tagName),
        tagName,
    };
};

export const button = node("button");
export const div = node("div");
export const footer = node("footer");
export const header = node("header");
export const hr = node("hr");
export const input = node("input");
export const label = node("label");
export const main = node("main");
export const pre = node("pre");
export const span = node("span");
export const style = node("style");

export const programWithFlags = setup => ({ render, schedule }) => {
    const embed = (root, flags = {}) => {
        console.log("embed", setup, root, flags);

        const [initialModel, cmd] = setup.init(flags);
        const rawView = setup.view(initialModel);
        const nodes = is(Array, rawView) ? flatten(rawView) : rawView;

        trace("nodes", nodes);
        trace("virtualDom", compact(nodes));

        //const markup = renderToString(nodes);
        //console.log("markup", markup);

        //renderToDomStupid(root, nodes);
        const messages = [];
        const commands = [];
        render(nodes, root, messages);

        const fps = 24;
        const fpsInterval = 1000 / fps;
        let model = initialModel;
        let startTime = null;
        trace(`fpsInterval ${fpsInterval} for ${fps}fps`);

        schedule(function step(timestamp) {
            if (!startTime) {
                startTime = timestamp;
            }
            const elapsed = timestamp - startTime;

            if (elapsed < fpsInterval) {
                // Not enough time has elapsed for the next rendering frame
                schedule(step);
                return;
            }

            // Resetting the frame timer
            startTime = null;

            //trace(`FRAME.messages ${compact(messages)}`, `elapsed`, elapsed, `timestamp`, timestamp);

            // Evil mutation!!!
            commands.splice(0, commands.length);

            let updatedModel = model;

            for (const msg of messages) {
                const [newModel, cmd] = setup.update(msg, updatedModel);
                updatedModel = newModel;
                commands.push(cmd);
            }

            // Evil mutation!!!
            messages.splice(0, messages.length);

            if (model !== updatedModel) {
                trace(`Detected changes in model`, model, updatedModel);

                model = updatedModel;

                const newView = setup.view(updatedModel);
                const newNodes = is(Array, newView) ? flatten(newView) : newView;

                if (commands.length) {
                    trace(`commands:`, commands);
                }

                trace("updated newNodes", newNodes);
                trace("updated virtualDom", compact(newNodes));

                render(newNodes, root, messages);
            }

            // When we're done we request another frame 
            schedule(step);
        });
    };
    return {
        embed,
    };
};
