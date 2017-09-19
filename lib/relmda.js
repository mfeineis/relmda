import T from "../lib/ramda/src/T.js";
import always from "../lib/ramda/src/always.js";
import cond from "../lib/ramda/src/cond.js";
import contains from "../lib/ramda/src/contains.js";
import curry from "../lib/ramda/src/curry.js";
import defaultTo from "../lib/ramda/src/defaultTo.js";
import filter from "../lib/ramda/src/filter.js";
import flatten from "../lib/ramda/src/flatten.js";
import fromPairs from "../lib/ramda/src/fromPairs.js";
import has from "../lib/ramda/src/has.js";
import identity from "../lib/ramda/src/identity.js";
import ifElse from "../lib/ramda/src/ifElse.js";
import is from "../lib/ramda/src/is.js";
import join from "../lib/ramda/src/join.js";
import map from "../lib/ramda/src/map.js";
import memoize from "../lib/ramda/src/memoize.js";
import not from "../lib/ramda/src/not.js";
import pair from "../lib/ramda/src/pair.js";
import pipe from "../lib/ramda/src/pipe.js";
import prop from "../lib/ramda/src/prop.js";
import reduce from "../lib/ramda/src/reduce.js";
import repeat from "../lib/ramda/src/repeat.js";
import replace from "../lib/ramda/src/replace.js";
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

const trace = (...rest) => console.log(...rest);
const pretty = obj => JSON.stringify(obj, null, "  ");
const compact = obj => JSON.stringify(obj);

const tag = unsafeTagName => (unsafeAttrs, unsafeChildren) => {
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

const renderToString = nodes => (
    coalesce(map(({ attrs, children, isSelfClosing, tagName, textValue }) => (
        textValue
            ? textValue
            : (isSelfClosing
               ? `<${tagName}${attrs}/>`
               : `<${tagName}${attrs}>${coalesce(map(renderToString, children))}</${tagName}>`)
    ), is(Array, nodes) ? flatten(nodes) : [nodes]))
);

const Decoder = {
    targetValue: "DECODER:targetValue",
};

const Modifier = {
    preventDefault: "MODIFIER:preventDefault",
    stopImmediatePropagation: "MODIFIER:stopImmediatePropagation",
    stopPropagation: "MODIFIER:stopPropagation",
};

const decoderFor = idOrData => {
    switch (idOrData) {
    case Decoder.targetValue:
        return event => event.target.value;
    default:
        return always(idOrData);
    }
};

const hasPreventDefault = has(Modifier.preventDefault);
const hasStopImmediatePropagation = has(Modifier.stopImmediatePropagation);
const hasStopPropagation = has(Modifier.stopPropagation);

const renderLocalDom = (messages, parent, nodes) =>
    map(({ attrs, bindings, children, isSelfClosing, tagName, textValue }) => {
        if (textValue) {
            parent.appendChild(document.createTextNode(textValue));
            return;
        }

        let subNode = document.createElement("div");
        subNode.innerHTML = `<${tagName}${attrs}></${tagName}>`;

        const target = subNode.firstChild;
        //trace(`all bindings:`, bindings);

        Object.keys(bindings).forEach(eventName => {
            const [type, dataOrDecoder, modifiers] = bindings[eventName];
            const decoder = decoderFor(dataOrDecoder);
            //trace(`setting up binding "${tagName}.${key}" -> "${eventName}"`);

            const shouldPreventDefault = hasPreventDefault(modifiers);
            const shouldStopImmediatePropagation = hasStopImmediatePropagation(modifiers);
            const shouldStopPropagation = hasStopPropagation(modifiers);

            target.addEventListener(eventName, event => {
                //trace(`EVT "${eventName}":`, event);

                if (shouldPreventDefault) {
                    //trace(`preventDefault`, event);
                    event.preventDefault();
                }

                if (shouldStopImmediatePropagation) {
                    //trace(`stopImmediatePropagation`, event);
                    event.stopImmediatePropagation();
                }

                if (shouldStopPropagation) {
                    //trace(`stopPropagation`, event);
                    event.stopPropagation();
                }

                const msg = {
                    type,
                    payload: decoder(event),
                };
               trace(`MSG -> ${compact(msg)}`);
                messages.push(msg);
            });
        });

        renderLocalDom(messages, target, children);

        parent.appendChild(target);
        subNode = null;
    }, is(Array, nodes) ? flatten(nodes) : [nodes]);

const renderToDom = (messages, root, vdom) => {
    const fragment = document.createDocumentFragment();
    renderLocalDom(messages, fragment, vdom);
    root.appendChild(fragment);
};

const renderToDomStupid = (dom, nodes) => {
    dom.innerHTML += renderToString(nodes);
};

const programWithFlags = setup => {
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
        renderToDom(messages, root, nodes);

        const fps = 24;
        const fpsInterval = 1000 / fps;
        let model = initialModel;
        let startTime = null;
        trace(`fpsInterval ${fpsInterval} for ${fps}fps`);

        window.requestAnimationFrame(function step(timestamp) {
            if (!startTime) {
                startTime = timestamp;
            }
            const elapsed = timestamp - startTime;

            if (elapsed < fpsInterval) {
                // Not enough time has elapsed for the next rendering frame
                window.requestAnimationFrame(step);
                return;
            }

            // Resetting the frame timer
            startTime = null;

            //trace(`FRAME.messages ${compact(messages)}`, `elapsed`, elapsed, `timestamp`, timestamp);

            commands.splice(0, commands.length);

            let updatedModel = model;

            for (const msg of messages) {
                const [newModel, cmd] = setup.update(msg, updatedModel);
                updatedModel = newModel;
                commands.push(cmd);
            }

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

                renderToDom(messages, root, newNodes);
            }

            // When we're done we request another frame 
            window.requestAnimationFrame(step);
        });
    };
    return {
        embed,
        fullscreen: flags => embed(document.querySelector("body"), flags),
    };
};

const Cmd = {
    none: "Cmd.none",
};

const Sub = {
    none: "Sub.none",
};

export {
    Cmd,
    Decoder,
    Modifier,
    Sub,
    programWithFlags,
    tag,
};
