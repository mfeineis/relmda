import { Cmd, Sub, programWithFlags, tag } from "../lib/elmish.js";

import prop from "../lib/ramda/src/prop.js";
import { tmpl } from "./tmpl.js";

const button = tag("button");
const div = tag("div");
const footer = tag("footer");
const header = tag("header");
const hr = tag("hr");
const main = tag("main");
const style = tag("style");

const mainView = ({ third }) =>
      main(null, [
          third,
      ]);

const topView = ({ first, second, third }) => [
    header({ class: "--sticky", onClick: () => console.log("header sideeffect!") }, [
        first,
        button({ onClick: () => console.log("button sideeffect!") }, "Boom!"),
    ]),
    //second,
    mainView({ third }),
];

const bottomView = ({ fourth }) =>
      footer(null, [
          hr({ "x-ray": "something", "data-blubb": "bla" }),
          fourth,
      ]);

const view = model => [
    style({ type: "text/css" }, `

        body { margin: 0; padding: 0; }

    `),
    topView(model),
    bottomView(model),
];

const init = flags => [{
    first: 1,
    second: 2,
    third: 3,
    fourth: 4,
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
