import { Cmd, Sub, programWithFlags, tag } from "../lib/elmish.js";

import prop from "../lib/ramda/src/prop.js";
import { tmpl } from "./tmpl.js";

const header =
    tmpl`<header>${prop("first")}</header>`;

const main =
    tmpl`<main>${prop("third")}</main>`;

const div = tag("div");
const footer = tag("footer");
const hr = tag("hr");

const subView = ({ fourth }) =>
    footer({ class: "--sticky" }, [
        hr({ "x-ray": "something", "data-blubb": "bla" }),
        fourth,
    ]);

const init = flags => [{
    first: 1,
    second: 2,
    third: 3,
    fourth: 4,
}, Cmd.none];
const subscriptions = model => Sub.none;
const update = (msg, model) => [model, Cmd.none];
const viewPlain =
    tmpl`<div>Blubb ${header}, bla ${prop("second")}, plisch ${main}</div>`;

const view = model =>
    div({ class: "vnode-root" }, [
        subView(model),
    ]);

const Main = programWithFlags({
    init,
    subscriptions,
    update,
    view,
});

export {
    Main,
};
