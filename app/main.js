import { Cmd, Decoder, Modifier, Sub } from "../lib/relmda/relmda.js";
import {
    button,
    div,
    footer,
    header,
    hr,
    input,
    label,
    main,
    pre,
    programWithFlags,
    span,
    style,
} from "../lib/relmda/html.js";

import prop from "../lib/ramda/src/prop.js";

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

const topView = ({ blubb, first, second, third, search, toggle }) => [
    header({ class: "--sticky", onClick: [Msg.toggleHeader, second, Modifier.stopImmediatePropagation] }, [
        first,
        button({
            onClick: [Msg.someButton, null, Modifier.stopPropagation, Modifier.preventDefault],
            onMouseDown: () => console.log("ignored!"),
        }, `Boom! (${toggle ? "on" : "off" })`),
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
    toggle: false,
}, Cmd.none];
const subscriptions = model => Sub.none;
const update = ({ payload, type }, model) => {
    switch (type) {
    case Msg.search:
        return [{ ...model, search: payload }, Cmd.none];

    case Msg.someButton:
        return [{ ...model, toggle: !model.toggle }, Cmd.none];

    default:
        return [model, Cmd.none];
    }
};

const Main = programWithFlags({
    init,
    subscriptions,
    update,
    view,
});

export {
    Main,
};
