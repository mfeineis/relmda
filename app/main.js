import { Cmd, Decoder, Sub, programWithFlags, tag } from "../lib/elmish.js";

import prop from "../lib/ramda/src/prop.js";
import { tmpl } from "./tmpl.js";

const button = tag("button");
const div = tag("div");
const footer = tag("footer");
const header = tag("header");
const hr = tag("hr");
const input = tag("input");
const label = tag("label");
const main = tag("main");
const pre = tag("pre");
const style = tag("style");

const Msg = {
    search: "SEARCH",
    someButton: "SOME_BUTTON",
    toggleHeader: "TOGGLE_HEADER",
};

const mainView = ({ blubb, third, search }) =>
      main(null, [
          label(null, [
              "blubb:",
              input({ onInput: [Msg.search, Decoder.targetValue], value: search }),
          ]),
          pre(null, [blubb]),
          third,
      ]);

const topView = ({ blubb, first, second, third, search }) => [
    header({ class: "--sticky", onClick: [Msg.toggleHeader, second] }, [
        first,
        button({ onClick: [Msg.someButton] }, "Boom!"),
    ]),
    //second,
    mainView({ blubb, third, search }),
];

const bottomView = ({ fourth }) =>
      footer(null, [
          hr({ "x-ray": "something", "data-blubb": "bla" }),
          fourth,
      ]);

const view = model => [
    style({ type: "text/css" }, ` body { margin: 0; padding: 0; } `),
    topView(model),
    bottomView(model),
];

const init = flags => [{
    first: 1,
    second: 2,
    third: 3,
    fourth: 4,
    search: "",
    blubb: flags.blubb,
}, Cmd.none];
const subscriptions = model => Sub.none;
const update = (msg, model) => [model, Cmd.none];

const Main = programWithFlags({
    init,
    subscriptions,
    update,
    view,
});

export {
    Main,
};

const headerPlain =
      tmpl`<header>${prop("first")}</header>`;

const mainPlain =
      tmpl`<main>${prop("third")}</main>`;

const viewPlain =
      tmpl`<div>Blubb ${headerPlain}, bla ${prop("second")}, plisch ${mainPlain}</div>`;
