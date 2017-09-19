import { Decoder, Modifier } from "./relmda.js";
import { compact, pretty, trace } from "./util.js";

import T from "../ramda/src/T.js";
import always from "../ramda/src/always.js";
import flatten from "../ramda/src/flatten.js";
import has from "../ramda/src/has.js";
import is from "../ramda/src/is.js";
import join from "../ramda/src/join.js";
import map from "../ramda/src/map.js";

const coalesce = join("");

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

export const render = (nodes, root, messages) => {
    const fragment = document.createDocumentFragment();
    renderLocalDom(messages, fragment, nodes);
    root.appendChild(fragment);
};

export const renderToString = (nodes, root) => {
    const html = coalesce(map(({ attrs, children, isSelfClosing, tagName, textValue }) => (
        textValue
            ? textValue
            : (isSelfClosing
               ? `<${tagName}${attrs}/>`
               : `<${tagName}${attrs}>${coalesce(map(renderToString, children))}</${tagName}>`)
    ), is(Array, nodes) ? flatten(nodes) : [nodes]));

    root && root.appendChild && root.appendChild(html);

    return html;
};

export const renderToStaticDom = (nodes, root, messages) => {
    root.innerHTML += renderToString(nodes);
};

export const schedule = window.requestAnimationFrame;
