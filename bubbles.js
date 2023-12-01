var version = "v1.5.3";
let editor, entityStates = {},
    lastCall = {
        entityId: null,
        stateChanged: null,
        timestamp: null
    };
async function addResource(t) {
    let e = (await t.callWS({
        type: "lovelace/resources"
    })).find((t => t.url.includes("bubble-pop-up.js")));
    e && await t.callWS({
        type: "lovelace/resources/delete",
        resource_id: e.id
    })
}
class BubbleCard extends HTMLElement {
    constructor() {
        if (super(), !window.eventAdded) {
            const t = history.pushState;
            window.popUpInitialized = !1, history.pushState = function() {
                t.apply(history, arguments), window.dispatchEvent(new Event("pushstate"))
            };
            const e = history.replaceState;
            history.replaceState = function() {
                e.apply(history, arguments), window.dispatchEvent(new Event("replacestate"))
            }, ["pushstate", "replacestate", "click", "popstate", "mousedown", "touchstart"].forEach((t => {
                window.addEventListener(t, i)
            }), {
                passive: !0
            });
            const n = new Event("urlChanged");

            function i() {
                const t = window.location.href;
                t !== this.currentUrl && (window.dispatchEvent(n), this.currentUrl = t)
            }
            const o = () => {
                window.dispatchEvent(n), window.addEventListener("popstate", i, {
                    passive: !0
                })
            };
            window.addEventListener("popUpInitialized", o, {
                passive: !0
            }), window.eventAdded = !0
        }
    }
    set hass(hass) {
        if (window.resourceCleared || (addResource(hass), window.resourceCleared = !0), !this.content) {
            this.attachShadow({
                mode: "open"
            }), this.shadowRoot.innerHTML = '\n <ha-card style="background: none; border: none; box-shadow: none;">\n <div class="card-content" style="padding: 0;">\n </div>\n </ha-card>\n ', this.card = this.shadowRoot.querySelector("ha-card"), this.content = this.shadowRoot.querySelector("div");
            const t = new Promise((t => {
                t(document.querySelector("body > home-assistant").shadowRoot.querySelector("home-assistant-main").shadowRoot.querySelector("ha-drawer > partial-panel-resolver > ha-panel-lovelace").shadowRoot.querySelector("hui-root").shadowRoot.querySelector("div"))
            }));
            t.then((t => {
                this.editorElement = t
            }))
        }
        let customStyles = this.config.styles ? this.config.styles : "",
            entityId = this.config.entity && hass.states[this.config.entity] ? this.config.entity : "",
            icon = !this.config.icon && this.config.entity ? hass.states[entityId].attributes.icon || hass.states[entityId].attributes.entity_picture || "" : this.config.icon || "",
            name = this.config.name ? this.config.name : this.config.entity ? hass.states[entityId].attributes.friendly_name : "",
            widthDesktop = this.config.width_desktop || "540px",
            widthDesktopDivided = widthDesktop ? widthDesktop.match(/(\d+)(\D+)/) : "",
            shadowOpacity = void 0 !== this.config.shadow_opacity ? this.config.shadow_opacity : "0",
            bgBlur = void 0 !== this.config.bg_blur ? this.config.bg_blur : "10",
            isSidebarHidden = this.config.is_sidebar_hidden || !1,
            state = entityId ? hass.states[entityId].state : "",
            stateOn = ["on", "open", "cleaning", "true", "home", "playing"].includes(state) || 0 !== Number(state) && !isNaN(Number(state)),
            formatedState, autoClose = this.config.auto_close || !1,
            riseAnimation = void 0 === this.config.rise_animation || this.config.rise_animation,
            marginCenter = this.config.margin ? "0" !== this.config.margin ? this.config.margin : "0px" : "7px",
            popUpHash = this.config.hash,
            popUpOpen, startTouchY, lastTouchY;

        function toggleEntity(t) {
            hass.callService("homeassistant", "toggle", {
                entity_id: t
            })
        }

        function stateChanged(t) {
            let e = Date.now();
            if (lastCall.entityId === t && e - lastCall.timestamp < 100) return lastCall.stateChanged;
            if (!hass.states[t] || !hass.states[t].state) return !1;
            let n = hass.states[t].state,
                i = hass.states[t].attributes.rgb_color;
            entityStates[t] || (entityStates[t] = {
                prevState: null,
                prevColor: null
            });
            let o = entityStates[t].prevState !== n || entityStates[t].prevColor !== i;
            return entityStates[t].prevState = n, entityStates[t].prevColor = i, lastCall = {
                entityId: t,
                stateChanged: o,
                timestamp: e
            }, o
        }
        this.editorElement && (editor = this.editorElement.classList.contains("edit-mode"));
        const addStyles = function(context, styles, customStyles, state, entityId, stateChangedVar, path = "", element = context.content) {
                const customStylesEval = customStyles ? eval("`" + customStyles + "`") : "";
                let styleAddedKey = styles + "Added";
                if (!context[styleAddedKey] || context.previousStyle !== customStylesEval || stateChangedVar || context.previousConfig !== context.config) {
                    if (!context[styleAddedKey]) {
                        if (context.styleElement = element.querySelector("style"), !context.styleElement) {
                            context.styleElement = document.createElement("style");
                            const t = path ? element.querySelector(path) : element;
                            t?.appendChild(context.styleElement)
                        }
                        context[styleAddedKey] = !0
                    }
                    context.styleElement.innerHTML !== customStylesEval + styles && (context.styleElement.innerHTML = customStylesEval + styles), context.previousStyle = customStylesEval, context.previousConfig = context.config
                }
            },
            forwardHaptic = t => {
                fireEvent(window, "haptic", t)
            },
            navigate = (t, e, n = !1) => {
                n ? history.replaceState(null, "", e) : history.pushState(null, "", e), fireEvent(window, "location-changed", {
                    replace: n
                })
            },
            handleActionConfig = (t, e, n, i) => {
                if (!i.confirmation || i.confirmation.exemptions && i.confirmation.exemptions.some((t => t.user === e.user.id)) || (forwardHaptic("warning"), confirm(i.confirmation.text || `Are you sure you want to ${i.action}?`))) switch (i.action) {
                    case "more-info":
                        (this.config.entity || this.config.camera_image) && fireEvent(t, "hass-more-info", {
                            entityId: this.config.entity ? this.config.entity : this.config.camera_image
                        });
                        break;
                    case "navigate":
                        i.navigation_path && navigate(t, i.navigation_path);
                        break;
                    case "url":
                        i.url_path && window.open(i.url_path);
                        break;
                    case "toggle":
                        this.config.entity && (toggleEntity(this.config.entity), forwardHaptic("success"));
                        break;
                    case "call-service": {
                        if (!i.service) return void forwardHaptic("failure");
                        const [t, n] = i.service.split(".", 2);
                        e.callService(t, n, i.service_data, i.target), forwardHaptic("success");
                        break
                    }
                    case "fire-dom-event":
                        fireEvent(t, "ll-custom", i)
                }
            },
            handleAction = (t, e, n, i) => {
                let o;
                "double_tap" === i && this.config.double_tap_action ? o = this.config.double_tap_action : "hold" === i && this.config.hold_action ? o = this.config.hold_action : "tap" === i && this.config.tap_action ? o = this.config.tap_action : "double_tap" !== i || this.config.double_tap_action ? ("hold" !== i || this.config.hold_action) && ("tap" !== i || this.config.tap_action) || (o = {
                    action: "more-info"
                }) : o = {
                    action: "toggle"
                }, handleActionConfig(t, e, n, o)
            },
            addAction = function() {
                let t, e;
                return function(n, i, o, a) {
                    o.addEventListener(n, (() => {
                        const i = (new Date).getTime();
                        "click" === n ? i - (e || 0) < 250 ? (clearTimeout(t), handleAction(a, hass, {}, "double_tap")) : t = setTimeout((() => {
                            handleAction(a, hass, {}, "tap")
                        }), 250) : handleAction(a, hass, {}, "hold"), e = i
                    }), {
                        passive: !0
                    })
                }
            }();

        function addActions(t, e) {
            addAction("click", "tap", e, t), addAction("contextmenu", "hold", e, t)
        }
        if (entityId) {
            const e = !!hass.states[entityId].attributes && hass.states[entityId].attributes;
            this.newPictureUrl = !!e.entity_picture && e.entity_picture
        }

        function createIcon(t, e, n, i, o) {
            updateIcon(t, e, n, i, o), editor || e.connection.subscribeEvents((a => {
                a.data.entity_id === n && t.newPictureUrl !== t.currentPictureUrl && (t.currentPictureUrl = t.newPictureUrl, updateIcon(t, e, n, i, o))
            }), "state_changed")
        }

        function updateIcon(t, e, n, i, o) {
            for (; o.firstChild;) o.removeChild(o.firstChild);
            if (t.newPictureUrl && !t.config.icon) {
                const e = document.createElement("img");
                e.setAttribute("src", t.newPictureUrl), e.setAttribute("class", "entity-picture"), e.setAttribute("alt", "Icon"), o && o.appendChild(e)
            } else {
                const t = document.createElement("ha-icon");
                t.setAttribute("icon", i), t.setAttribute("class", "icon"), o && o.appendChild(t)
            }
        }

        function isColorCloseToWhite(t) {
            let e = [220, 220, 190];
            for (let n = 0; n < 3; n++)
                if (t[n] < e[n]) return !1;
            return !0
        }
        let haStyle, themeBgColor;
        haStyle = haStyle || getComputedStyle(document.body), themeBgColor = themeBgColor || haStyle.getPropertyValue("--ha-card-background") || haStyle.getPropertyValue("--card-background-color");
        let color = this.config.bg_color ? this.config.bg_color : themeBgColor,
            bgOpacity = void 0 !== this.config.bg_opacity ? this.config.bg_opacity : "88",
            rgbaColor;

        function convertToRGBA(t, e) {
            let n = "";
            if (t.startsWith("#")) {
                n = "rgba(" + parseInt(t.slice(1, 3), 16) + ", " + parseInt(t.slice(3, 5), 16) + ", " + parseInt(t.slice(5, 7), 16) + ", " + e + ")"
            } else if (t.startsWith("rgb")) {
                let i = t.match(/\d+/g);
                n = "rgba(" + i[0] + ", " + i[1] + ", " + i[2] + ", " + e + ")"
            }
            return n
        }
        switch (rgbaColor && !editor || (rgbaColor = convertToRGBA(color, bgOpacity / 100), window.color = color), this.config.card_type) {
            case "pop-up":
                if (this.errorTriggered) return;
                this.initStyleAdded || this.host || editor || (this.card.style.marginTop = "4000px", this.initStyleAdded = !0);
                const n = () => {
                        if (this.host && this.host === this.getRootNode().host) {
                            if (!this.popUp && (this.verticalStack = this.getRootNode(), this.popUp = this.verticalStack.querySelector("#root"), !window.popUpInitialized && this.popUp)) {
                                this.config.back_open || !1 ? localStorage.setItem("backOpen", !0) : localStorage.setItem("backOpen", !1);
                                if ("true" === localStorage.getItem("backOpen")) {
                                    window.backOpen = !0;
                                    const _ = new Event("popUpInitialized");
                                    setTimeout((() => {
                                        window.dispatchEvent(_)
                                    }), 0)
                                } else window.backOpen = !1, popUpOpen = popUpHash + !1, history.replaceState(null, null, location.href.split("#")[0]);
                                window.popUpInitialized = !0
                            }
                            const t = this.popUp,
                                e = this.config.text || "",
                                n = this.config.state;
                               const state2 = this.config.state;
                            formatedState = n ? hass.formatEntityState(hass.states[n]) + " " + hass.formatEntityState(hass.states[state2]) + e : e;
                            const i = this.config.margin_top_mobile && "0" !== this.config.margin_top_mobile ? this.config.margin_top_mobile : "0px",
                                o = this.config.margin_top_desktop && "0" !== this.config.margin_top_desktop ? this.config.margin_top_desktop : "0px",
                                a = this.config.entity ? "flex" : "none";
                            let s, r;
                            if (state = n ? hass.states[n].state : "", this.headerAdded) {
                                if (entityId) {
                                    const w = this.content.querySelector("#header-container .header-icon"),
                                        x = this.content.querySelector("#header-container h2"),
                                        k = this.content.querySelector("#header-container p"),
                                        C = this.content.querySelector("#header-container .power-button");
                                    w.innerHTML = "", createIcon(this, hass, entityId, icon, w), x.textContent = name, k.textContent = formatedState, C.setAttribute("style", `display: ${a};`)
                                }
                            } else {
                                const $ = document.createElement("div");
                                $.setAttribute("id", "header-container");
                                const S = document.createElement("div");
                                $.appendChild(S);
                                const E = document.createElement("div");
                                E.setAttribute("class", "header-icon"), S.appendChild(E), createIcon(this, hass, entityId, icon, E), addActions(this, E);
                                const I = document.createElement("h2");
                                I.textContent = name, S.appendChild(I);
                                const O = document.createElement("p");
                                O.textContent = formatedState, S.appendChild(O);
                                const A = document.createElement("ha-icon");
                                A.setAttribute("class", "power-button"), A.setAttribute("icon", "mdi:power"), A.setAttribute("style", `display: ${a};`), S.appendChild(A);
                                const L = document.createElement("button");
                                L.setAttribute("class", "close-pop-up"), L.onclick = function() {
                                    history.replaceState(null, null, location.href.split("#")[0]), localStorage.setItem("isManuallyClosed_" + popUpHash, !0)
                                }, $.appendChild(L);
                                const T = document.createElement("ha-icon");
                                T.setAttribute("icon", "mdi:close"), L.appendChild(T), this.content.appendChild($), this.header = S, this.headerAdded = !0
                            }

                            function l() {
                                toggleEntity(entityId)
                            }

                            function c(t) {
                                "Escape" === t.key && (popUpOpen = popUpHash + !1, history.replaceState(null, null, location.href.split("#")[0]), localStorage.setItem("isManuallyClosed_" + popUpHash, !0))
                            }

                            function d(t) {
                                window.hash === popUpHash && m(), startTouchY = t.touches[0].clientY, lastTouchY = startTouchY
                            }

                            function h(t) {
                                t.touches[0].clientY - startTouchY > 300 && t.touches[0].clientY > lastTouchY && (popUpOpen = popUpHash + !1, history.replaceState(null, null, location.href.split("#")[0]), popUpOpen = popUpHash + !1, localStorage.setItem("isManuallyClosed_" + popUpHash, !0)), lastTouchY = t.touches[0].clientY
                            }
                            if (this.eventAdded || editor || (window["checkHashRef_" + popUpHash] = p, window.addEventListener("urlChanged", window["checkHashRef_" + popUpHash], {
                                    passive: !0
                                }), window.addEventListener("click", (function(t) {
                                    if (location.hash === popUpHash && m(), !window.justOpened) return;
                                    const e = t.composedPath();
                                    !e || e.some((t => "HA-MORE-INFO-DIALOG" === t.nodeName)) || e.some((t => "root" === t.id && !t.classList.contains("close-pop-up"))) || popUpOpen !== popUpHash + !0 || (popUpOpen = popUpHash + !1, history.replaceState(null, null, location.href.split("#")[0]), localStorage.setItem("isManuallyClosed_" + popUpHash, !0))
                                }), {
                                    passive: !0
                                }), this.eventAdded = !0), entityId) {
                                const U = hass.states[entityId].attributes.rgb_color;
                                this.rgbColor = U ? isColorCloseToWhite(U) ? "rgb(255,220,200)" : `rgb(${U})` : stateOn ? entityId.startsWith("light.") ? "rgba(255,220,200, 0.5)" : "var(--accent-color)" : "rgba(255, 255, 255, 1", this.rgbColorOpacity = U ? isColorCloseToWhite(U) ? "rgba(255,220,200, 0.5)" : `rgba(${U}, 0.5)` : entityId && stateOn ? entityId.startsWith("light.") ? "rgba(255,220,200, 0.5)" : "var(--accent-color)" : "var(--background-color,var(--secondary-background-color))", r = convertToRGBA(color, 0), this.iconFilter = U ? isColorCloseToWhite(U) ? "none" : "brightness(1.1)" : "none"
                            }

                            function p() {
                                editor || (window.hash = location.hash.split("?")[0], window.hash === popUpHash ? g() : t.classList.contains("open-pop-up") && f())
                            }
                            const u = this.content;

                            function g() {
                                t.classList.remove("close-pop-up"), t.classList.add("open-pop-up"), u.querySelector(".power-button").addEventListener("click", l, {
                                    passive: !0
                                }), window.addEventListener("keydown", c, {
                                    passive: !0
                                }), t.addEventListener("touchstart", d, {
                                    passive: !0
                                }), t.addEventListener("touchmove", h, {
                                    passive: !0
                                }), popUpOpen = popUpHash + !0, setTimeout((() => {
                                    window.justOpened = !0
                                }), 10), m()
                            }

                            function f() {
                                t.classList.remove("open-pop-up"), t.classList.add("close-pop-up"), u.querySelector(".power-button").removeEventListener("click", l), window.removeEventListener("keydown", c), t.removeEventListener("touchstart", d), t.removeEventListener("touchmove", h), popUpOpen = popUpHash + !1, window.justOpened = !1, clearTimeout(s)
                            }

                            function m() {
                                clearTimeout(s), autoClose > 0 && (s = setTimeout(b, autoClose))
                            }

                            function b() {
                                history.replaceState(null, null, location.href.split("#")[0])
                            }
                            const y = `\n ha-card {\n margin-top: 0 !important;\n background: none !important;\n border: none !important;\n }\n .card-content {\n width: 100% !important;\n padding: 0 !important;\n }\n #root {\n transition: all 1s !important;\n position: fixed !important;\n margin: 0 -${marginCenter}; /* 7px */\n width: 100%;\n background-color: ${rgbaColor};\n box-shadow: 0px 0px 50px rgba(0,0,0,${shadowOpacity/100});\n backdrop-filter: blur(${bgBlur}px);\n -webkit-backdrop-filter: blur(${bgBlur}px);\n border-radius: 42px;\n box-sizing: border-box;\n top: calc(120% + ${i} + var(--header-height));\n grid-gap: 12px !important;\n gap: 12px !important;\n grid-auto-rows: min-content;\n padding: 18px 18px 220px 18px !important;\n height: 100% !important;\n -ms-overflow-style: none; /* for Internet Explorer, Edge */\n scrollbar-width: none; /* for Firefox */\n overflow-y: auto; \n overflow-x: hidden; \n z-index: 1 !important; /* Higher value hide the more-info panel */\n /* For older Safari but not working with Firefox */\n /* display: grid !important; */ \n }\n #root > bubble-card:first-child::after {\n content: '';\n display: block;\n position: sticky;\n top: 0;\n left: -50px;\n margin: -70px 0 -36px -36px;\n overflow: visible;\n width: 200%;\n height: 100px;\n background: linear-gradient(0deg, ${r} 0%, ${rgbaColor} 80%);\n z-index: 0;\n } \n #root::-webkit-scrollbar {\n display: none; /* for Chrome, Safari, and Opera */\n }\n #root > bubble-card:first-child {\n position: sticky;\n top: 0;\n z-index: 1;\n background: none !important;\n overflow: visible;\n }\n #root.open-pop-up {\n /*will-change: transform;*/\n transform: translateY(-120%);\n transition: transform .4s !important;\n }\n #root.open-pop-up > * {\n /* Block child items to overflow and if they do clip them */\n /*max-width: calc(100vw - 38px);*/\n max-width: 100% !important;\n overflow-x: clip;\n }\n #root.close-pop-up { \n transform: translateY(-20%);\n transition: transform .4s !important;\n box-shadow: none;\n }\n @media only screen and (min-width: 768px) {\n #root {\n top: calc(120% + ${o} + var(--header-height));\n width: calc(${widthDesktop}${"%"!==widthDesktopDivided[2]||isSidebarHidden?"":" - var(--mdc-drawer-width)"}) !important;\n left: calc(50% - ${widthDesktopDivided[1]/2}${widthDesktopDivided[2]});\n margin: 0 !important;\n }\n } \n @media only screen and (min-width: 870px) {\n #root {\n left: calc(50% - ${widthDesktopDivided[1]/2}${widthDesktopDivided[2]} + ${isSidebarHidden?"0px":"var(--mdc-drawer-width) "+("%"===widthDesktopDivided[2]?"":"/ 2")});\n }\n } \n #root.editor {\n position: inherit !important;\n width: 100% !important;\n padding: 18px !important;\n }\n `,
                                v = `\n ha-card {\n margin-top: 0 !important;\n }\n #header-container {\n display: inline-flex;\n ${icon||name||entityId||state||e?"":"flex-direction: row-reverse;"}\n width: 100%;\n margin: 0;\n padding: 0;\n }\n #header-container > div {\n display: ${icon||name||entityId||state||e?"inline-flex":"none"};\n align-items: center;\n position: relative;\n padding: 6px;\n z-index: 1;\n flex-grow: 1;\n background-color: ${entityId?this.rgbColorOpacity:"var(--background-color,var(--secondary-background-color))"};\n transition: background 1s;\n border-radius: 25px;\n margin-right: 14px;\n backdrop-filter: blur(14px);\n -webkit-backdrop-filter: blur(14px);\n }\n .header-icon {\n display: inline-flex;\n width: 38px;\n height: 38px;\n background-color: var(--card-background-color,var(--ha-card-background));\n border-radius: 100%;\n margin: 0 10px 0 0;\n cursor: ${this.config.entity||this.config.double_tap_action||this.config.tap_action||this.config.hold_action?"pointer":"default"}; \n flex-wrap: wrap;\n align-content: center;\n justify-content: center;\n overflow: hidden;\n }\n .header-icon > ha-icon {\n color: ${stateOn?this.rgbColor?this.rgbColor:"var(--accent-color)":"inherit"};\n opacity: ${stateOn?"1":"0.6"};\n filter: ${this.iconFilter};\n }\n .header-icon::after {\n content: '';\n position: absolute;\n width: 38px;\n height: 38px;\n display: block;\n opacity: 0.2;\n transition: background-color 1s;\n border-radius: 50%;\n background-color: ${stateOn?this.rgbColor?this.rgbColor:"var(--accent-color)":"var(--card-background-color,var(--ha-card-background))"};\n }\n .entity-picture {\n height: calc(100% + 16px);\n width: calc(100% + 16px);\n }\n #header-container h2 {\n display: inline-flex;\n margin: 0 18px 0 0;\n /*line-height: 0px;*/\n z-index: 1;\n font-size: 20px;\n }\n #header-container p {\n display: inline-flex;\n line-height: 0px;\n font-size: 16px;\n }\n .power-button {\n cursor: pointer; \n flex-grow: inherit; \n width: 24px;\n height: 24px;\n border-radius: 12px;\n margin: 0 10px;\n background: none !important;\n justify-content: flex-end;\n background-color: var(--background-color,var(--secondary-background-color));\n }\n .close-pop-up {\n height: 50px;\n width: 50px;\n border: none;\n border-radius: 50%;\n z-index: 1;\n background: var(--background-color,var(--secondary-background-color));\n color: var(--primary-text-color);\n flex-shrink: 0;\n cursor: pointer;\n }\n `;
                            addStyles(this, y, customStyles, state, entityId, "", "", t), addStyles(this, v, customStyles, state, entityId, stateChanged(entityId)), editor ? (t.classList.add("editor"), t.classList.remove("open-pop-up"), t.classList.remove("close-pop-up")) : t.classList.remove("editor")
                        } else this.host = this.getRootNode().host
                    },
                    i = this.config.trigger_entity ? this.config.trigger_entity : "",
                    o = this.config.trigger_state ? this.config.trigger_state : "",
                    a = !!this.config.trigger_close && this.config.trigger_close,
                    s = this.config.state;
                if (this.popUp !== this.getRootNode().querySelector("#root")) {
                    let K = setInterval((() => {
                        n(), this.popUp && clearInterval(K)
                    }), 20);
                    setTimeout((() => {
                        if (!this.popUp) throw this.errorTriggered = !0, clearInterval(K), new Error("Pop-up card must be placed inside a vertical_stack! If it's already the case, please ignore this error 🍻")
                    }), 4e3)
                } else !editor && this.wasEditing ? (n(), this.wasEditing = !1) : (popUpHash === window.hash && (stateChanged(entityId) || stateChanged(s)) || editor) && (n(), editor && (this.wasEditing = !0));
                if (this.popUp && stateChanged(i) && hass.states[i]) {
                    null === localStorage.getItem("previousTriggerState_" + popUpHash) && localStorage.setItem("previousTriggerState_" + popUpHash, ""), null === localStorage.getItem("isManuallyClosed_" + popUpHash) && localStorage.setItem("isManuallyClosed_" + popUpHash, "false"), null === localStorage.getItem("isTriggered_" + popUpHash) && localStorage.setItem("isTriggered_" + popUpHash, "false");
                    let Z = localStorage.getItem("previousTriggerState_" + popUpHash),
                        J = "true" === localStorage.getItem("isManuallyClosed_" + popUpHash),
                        Q = "true" === localStorage.getItem("isTriggered_" + popUpHash);
                    hass.states[i].state !== o || null !== Z || Q || (navigate("", popUpHash), Q = !0, localStorage.setItem("isTriggered_" + popUpHash, Q)), hass.states[i].state !== Z && (J = !1, localStorage.setItem("previousTriggerState_" + popUpHash, hass.states[i].state), localStorage.setItem("isManuallyClosed_" + popUpHash, J)), hass.states[i].state !== o || J ? hass.states[i].state !== o && a && this.popUp.classList.contains("open-pop-up") && Q && !J && (history.replaceState(null, null, location.href.split("#")[0]), popUpOpen = popUpHash + !1, Q = !1, J = !0, localStorage.setItem("isManuallyClosed_" + popUpHash, J), localStorage.setItem("isTriggered_" + popUpHash, Q)) : (navigate("", popUpHash), Q = !0, localStorage.setItem("isTriggered_" + popUpHash, Q))
                }
                break;
            case "horizontal-buttons-stack":
                const r = (t, e, n) => {
                    const i = document.createElement("button");
                    return i.setAttribute("class", `button ${e.substring(1)}`), i.innerHTML = `\n ${""!==n?`<ha-icon icon="${n}" class="icon" style="${""!==t?"margin-right: 8px;":""}"></ha-icon>`:""}\n ${""!==t?`<p class="name">${t}</p>`:""}\n `, i.hasListener || (i.addEventListener("click", (t => {
                        t.stopPropagation(), popUpOpen = location.hash + !0;
                        localStorage.getItem("isManuallyClosed_" + e);
                        popUpOpen !== e + !0 ? (navigate("", e), popUpOpen = e + !0) : (history.replaceState(null, null, location.href.split("#")[0]), popUpOpen = e + !1)
                    }), {
                        passive: !0
                    }), i.hasListener = !0), i
                };
                if (!this.buttonsAdded) {
                    const tt = document.createElement("div");
                    tt.setAttribute("class", "horizontal-buttons-stack-container"), this.content.appendChild(tt), this.buttonsContainer = tt
                }
                const l = (t, e) => {
                    if (hass.states[e].attributes.rgb_color) {
                        const n = hass.states[e].attributes.rgb_color,
                            i = isColorCloseToWhite(n) ? "rgba(255,220,200, 0.5)" : `rgba(${n}, 0.5)`;
                        t.style.backgroundColor = i, t.style.border = "1px solid rgba(0,0,0,0)"
                    } else hass.states[e].attributes.rgb_color || "on" != hass.states[e].state ? (t.style.backgroundColor = "rgba(0,0,0,0)", t.style.border = "1px solid var(--primary-text-color)") : (t.style.backgroundColor = "rgba(255,255,255,0.5)", t.style.border = "1px solid rgba(0,0,0,0)")
                };
                let c = [],
                    d = 1;
                for (; this.config[d + "_link"];) {
                    const et = d + "_",
                        nt = this.config[et + "name"] || "",
                        it = this.config[et + "pir_sensor"];
                    icon = this.config[et + "icon"] || "";
                    const ot = this.config[et + "link"],
                        at = this.config[et + "entity"];
                    c.push({
                        button: nt,
                        pirSensor: it,
                        icon: icon,
                        link: ot,
                        lightEntity: at
                    }), d++
                }
                if (this.config.auto_order && c.sort(((t, e) => {
                        if (t.pirSensor && e.pirSensor) {
                            if ("on" === hass.states[t.pirSensor].state && "on" === hass.states[e.pirSensor].state) {
                                return hass.states[t.pirSensor].last_updated < hass.states[e.pirSensor].last_updated ? 1 : -1
                            }
                            if ("on" === hass.states[t.pirSensor].state) return -1;
                            if ("on" === hass.states[e.pirSensor].state) return 1;
                            return hass.states[t.pirSensor].last_updated < hass.states[e.pirSensor].last_updated ? 1 : -1
                        }
                        return t.pirSensor ? e.pirSensor ? void 0 : -1 : 1
                    })), !this.buttonsAdded || editor) {
                    if (this.card.classList.add("horizontal-buttons-stack"), editor && this.buttonsContainer) {
                        for (; this.buttonsContainer.firstChild;) this.buttonsContainer.removeChild(this.buttonsContainer.firstChild);
                        localStorage.setItem("editorMode", !0)
                    } else localStorage.setItem("editorMode", !1);
                    const st = {};
                    c.forEach((t => {
                        const e = r(t.button, t.link, t.icon);
                        st[t.link] = e, this.buttonsContainer.appendChild(e)
                    })), this.buttonsAdded = !0, this.buttons = st
                }
                let h = 0,
                    p = 12;
                async function u() {
                    let t = [];
                    for (let e of c) {
                        this.buttons[e.link] && (t.push(localStorage.getItem(`buttonWidth-${e.link}`)), t.push(localStorage.getItem(`buttonContent-${e.link}`)))
                    }
                    let e = await Promise.all(t),
                        n = 0;
                    for (let t of c) {
                        let i = this.buttons[t.link];
                        if (i) {
                            let o = e[n],
                                a = e[n + 1];
                            n += 2, o && "0" !== o && a === i.innerHTML && this.previousConfig === this.config || (o = i.offsetWidth, await localStorage.setItem(`buttonWidth-${t.link}`, o), await localStorage.setItem(`buttonContent-${t.link}`, i.innerHTML), this.previousConfig = this.config), i.style.transform = `translateX(${h}px)`, h += parseInt(o) + p
                        }
                        t.lightEntity && l(i, t.lightEntity)
                    }
                }
                u.call(this);
                const g = `\n ha-card {\n border-radius: 0;\n }\n .horizontal-buttons-stack {\n width: 100%;\n margin-top: 0 !important;\n background: none !important;\n position: fixed;\n height: 51px;\n bottom: 16px;\n left: ${marginCenter};\n z-index: 1 !important; /* Higher value hide the more-info panel */\n }\n @keyframes from-bottom {\n 0% {transform: translateY(200px);}\n 20% {transform: translateY(200px);}\n 46% {transform: translateY(-8px);}\n 56% {transform: translateY(1px);}\n 62% {transform: translateY(-2px);}\n 70% {transform: translateY(0);}\n 100% {transform: translateY(0);}\n }\n .horizontal-buttons-stack-container {\n width: max-content;\n position: relative;\n height: 51px;\n }\n .button {\n display: flex;\n position: absolute;\n box-sizing: border-box !important;\n border: 1px solid var(--primary-text-color);\n align-items: center;\n height: 50px;\n white-space: nowrap;\n width: auto;\n border-radius: 25px;\n z-index: 1;\n padding: 16px;\n background: none;\n transition: background-color 1s, border 1s, transform 1s;\n color: var(--primary-text-color);\n }\n .icon {\n height: 24px;\n }\n .card-content {\n width: calc(100% + 18px);\n box-sizing: border-box !important;\n margin: 0 -36px !important;\n padding: 0 36px !important;\n overflow: scroll !important;\n -ms-overflow-style: none;\n scrollbar-width: none;\n -webkit-mask-image: linear-gradient(90deg, transparent 0%, rgba(0, 0, 0, 1) calc(0% + 28px), rgba(0, 0, 0, 1) calc(100% - 28px), transparent 100%);\n /* mask-image: linear-gradient(90deg, transparent 2%, rgba(0, 0, 0, 1) 6%, rgba(0, 0, 0, 1) 96%, transparent 100%); */\n /* -webkit-mask-image: linear-gradient(90deg, transparent 2%, rgba(0, 0, 0, 1) 6%, rgba(0, 0, 0, 1) 96%, transparent 100%); */\n }\n .horizontal-buttons-stack::before {\n content: '';\n position: absolute;\n top: -32px;\n left: -100%;\n display: block;\n background: linear-gradient(0deg, var(--background-color, var(--primary-background-color)) 50%, rgba(79, 69, 87, 0));\n width: 200%;\n height: 100px;\n }\n .card-content::-webkit-scrollbar {\n display: none;\n }\n @media only screen and (min-width: 768px) {\n .card-content {\n position: fixed;\n width: ${widthDesktop} !important;\n left: calc(50% - ${widthDesktopDivided[1]/2}${widthDesktopDivided[2]});\n margin-left: -13px !important;\n padding: 0 26px !important;\n }\n }\n @media only screen and (min-width: 870px) {\n .card-content {\n position: fixed;\n width: calc(${widthDesktop}${"%"!==widthDesktopDivided[2]||isSidebarHidden?"":" - var(--mdc-drawer-width)"}) !important;\n left: calc(50% - ${widthDesktopDivided[1]/2}${widthDesktopDivided[2]} + ${!0===isSidebarHidden?"0px":"var(--mdc-drawer-width) "+("%"===widthDesktopDivided[2]?"":"/ 2")});\n margin-left: -13px !important;\n padding: 0 26px !important;\n }\n }\n .horizontal-buttons-stack.editor {\n position: relative;\n bottom: 0;\n left: 0;\n overflow: hidden;\n }\n \n .horizontal-buttons-stack.editor::before {\n top: -32px;\n left: -100%;\n background: none;\n width: 100%;\n height: 0;\n }\n \n .horizontal-buttons-stack-container.editor > .button {\n transition: background-color 0s, border 0s, transform 0s;\n }\n \n .horizontal-buttons-stack-container.editor {\n margin-left: 1px;\n }\n \n .horizontal-buttons-stack.editor > .card-content {\n position: relative;\n width: calc(100% + 26px) !important;\n left: -26px;\n margin: 0 !important;\n padding: 0;\n }\n `;
                !window.hasAnimated && riseAnimation && (this.content.style.animation = "from-bottom 1.3s forwards", window.hasAnimated = !0, setTimeout((() => {
                    this.content.style.animation = "none"
                }), 1500)), addStyles(this, g, customStyles), editor ? (this.buttonsContainer.classList.add("editor"), this.card.classList.add("editor")) : (this.buttonsContainer.classList.remove("editor"), this.card.classList.remove("editor"));
                break;
            case "button":
                if (!this.buttonAdded) {
                    const rt = document.createElement("div");
                    rt.setAttribute("class", "button-container"), this.content.appendChild(rt)
                }
                const f = this.config.button_type || "switch";
                formatedState = hass.formatEntityState(hass.states[entityId]);
                const m = !!this.config.show_state && this.config.show_state;
                let b = entityId ? hass.states[entityId].attributes.brightness || 0 : "",
                    y = entityId ? hass.states[entityId].attributes.volume_level || 0 : "",
                    v = !1,
                    _ = b,
                    w = y,
                    x = 0,
                    k = 0,
                    C = 0,
                    $ = !1,
                    S = null;
                const E = stateChanged(entityId),
                    I = document.createElement("div");
                I.setAttribute("class", "icon-container"), this.iconContainer = I;
                const O = document.createElement("div");
                O.setAttribute("class", "name-container");
                const A = document.createElement("div");
                A.setAttribute("class", "switch-button");
                const L = document.createElement("div");
                L.setAttribute("class", "range-slider");
                const T = document.createElement("div");
                if (T.setAttribute("class", "range-fill"), !this.buttonContainer || editor) {
                    if (editor && this.buttonContainer) {
                        for (; this.buttonContainer.firstChild;) this.buttonContainer.removeChild(this.buttonContainer.firstChild);
                        this.eventAdded = !1, this.wasEditing = !0
                    }
                    this.buttonContainer = this.content.querySelector(".button-container"), "slider" !== f || this.buttonAdded && !editor ? ("switch" === f || "custom" === f || editor) && (this.buttonContainer.appendChild(A), A.appendChild(I), A.appendChild(O), this.switchButton = this.content.querySelector(".switch-button")) : (this.buttonContainer.appendChild(L), L.appendChild(I), L.appendChild(O), L.appendChild(T), this.rangeFill = this.content.querySelector(".range-fill")), createIcon(this, hass, entityId, icon, this.iconContainer), O.innerHTML = `\n <p class="name">${name}</p>\n ${m?`<p class="state">${formatedState}</p>`:""}\n `, this.buttonAdded = !0
                }

                function U(t) {
                    let e = t.querySelector(".feedback-element");
                    e || (e = document.createElement("div"), e.setAttribute("class", "feedback-element"), t.appendChild(e)), e.style.animation = "tap-feedback .5s", setTimeout((() => {
                        e.style.animation = "none", t.removeChild(e)
                    }), 500)
                }

                function H(t) {
                    x = t.pageX || (t.touches ? t.touches[0].pageX : 0), k = t.pageY || (t.touches ? t.touches[0].pageY : 0), C = L.value, t.target !== I && t.target !== I.querySelector("ha-icon") && (v = !0, document.addEventListener("mouseup", V, {
                        passive: !0
                    }), document.addEventListener("touchend", V, {
                        passive: !0
                    }), document.addEventListener("mousemove", D, {
                        passive: !0
                    }), document.addEventListener("touchmove", D, {
                        passive: !0
                    }), S = setTimeout((() => {
                        Y(t.pageX || t.touches[0].pageX), z(), S = null
                    }), 200))
                }

                function D(t) {
                    const e = t.pageX || (t.touches ? t.touches[0].pageX : 0),
                        n = t.pageY || (t.touches ? t.touches[0].pageY : 0);
                    Math.abs(n - k) > Math.abs(e - x) ? (clearTimeout(S), V()) : (document.removeEventListener("mousemove", D), document.removeEventListener("touchmove", D), document.addEventListener("mousemove", B, {
                        passive: !0
                    }), document.addEventListener("touchmove", B, {
                        passive: !0
                    }))
                }

                function V() {
                    v = !1, $ = !1, z(), document.removeEventListener("mouseup", V), document.removeEventListener("touchend", V), document.removeEventListener("mousemove", B), document.removeEventListener("touchmove", B)
                }

                function z() {
                    entityId.startsWith("light.") ? (b = _, hass.callService("light", "turn_on", {
                        entity_id: entityId,
                        brightness: b
                    })) : entityId.startsWith("media_player.") && (y = w, hass.callService("media_player", "volume_set", {
                        entity_id: entityId,
                        volume_level: y
                    }))
                }

                function B(t) {
                    const e = t.pageX || (t.touches ? t.touches[0].pageX : 0),
                        n = t.pageY || (t.touches ? t.touches[0].pageY : 0);
                    v && Math.abs(e - x) > 10 ? Y(e) : v && Math.abs(n - k) > 10 && (v = !1, L.value = C)
                }

                function Y(t) {
                    const e = L.getBoundingClientRect(),
                        n = Math.min(Math.max(t - e.left, 0), e.width) / e.width;
                    entityId.startsWith("light.") ? _ = Math.round(255 * n) : entityId.startsWith("media_player.") && (w = n), T.style.transition = "none", T.style.transform = `translateX(${100*n}%)`
                }
                if (m && formatedState && (this.content.querySelector(".state").textContent = formatedState), this.eventAdded || "switch" !== f ? this.eventAdded || "slider" !== f ? this.eventAdded || "custom" !== f || (A.addEventListener("click", (() => U(this.switchButton)), {
                        passive: !0
                    }), addActions(this, this.switchButton), this.eventAdded = !0) : (L.addEventListener("mousedown", H, {
                        passive: !0
                    }), L.addEventListener("touchstart", H, {
                        passive: !0
                    }), addActions(this, this.iconContainer), this.eventAdded = !0) : (A.addEventListener("click", (() => U(this.switchButton)), {
                        passive: !0
                    }), A.addEventListener("click", (function(t) {
                        t.target !== I && t.target !== I.querySelector("ha-icon") && toggleEntity(entityId)
                    }), {
                        passive: !0
                    }), addActions(this, this.iconContainer), this.eventAdded = !0), this.isDragging || "slider" !== f || (this.rangeFill.style.transition = "all .3s", entityId.startsWith("light.") ? this.rangeFill.style.transform = `translateX(${b/255*100}%)` : entityId.startsWith("media_player.") && (this.rangeFill.style.transform = `translateX(${100*y}%)`)), "slider" === f && (!this.colorAdded || E || this.wasEditing)) {
                    if (entityId.startsWith("light.")) {
                        const lt = hass.states[entityId].attributes.rgb_color;
                        this.rgbColorOpacity = lt ? isColorCloseToWhite(lt) ? "rgba(255,220,200,0.5)" : `rgba(${lt}, 0.5)` : stateOn ? "rgba(255,220,200, 0.5)" : "rgba(255, 255, 255, 0.5)", this.rgbColor = lt ? isColorCloseToWhite(lt) ? "rgb(255,220,200)" : `rgb(${lt})` : stateOn ? "rgba(255,220,200, 1)" : "rgba(255, 255, 255, 1)", this.iconFilter = lt ? isColorCloseToWhite(lt) ? "none" : "brightness(1.1)" : "none"
                    } else this.rgbColorOpacity = "var(--accent-color)", this.iconFilter = "brightness(1.1)";
                    this.colorAdded = !0, this.wasEditing = !1
                }
                const M = `\n ha-card {\n margin-top: 0 !important;\n background: none !important;\n opacity: ${"unavailable"!==state?"1":"0.5"};\n }\n \n .button-container {\n position: relative;\n width: 100%;\n height: 50px;\n z-index: 0;\n background-color: var(--background-color-2,var(--secondary-background-color));\n border-radius: 25px;\n mask-image: radial-gradient(white, black);\n -webkit-mask-image: radial-gradient(white, black);\n -webkit-backface-visibility: hidden;\n -moz-backface-visibility: hidden;\n -webkit-transform: translateZ(0);\n overflow: hidden;\n }\n \n .switch-button,\n .range-slider {\n display: inline-flex;\n position: absolute;\n height: 100%;\n width: 100%;\n transition: background-color 1.5s;\n background-color: ${stateOn&&["switch","custom"].includes(f)?"var(--accent-color)":"rgba(0,0,0,0)"};\n }\n \n .range-fill {\n position: absolute;\n top: 0;\n bottom: 0;\n left: 0;\n background-color: ${this.rgbColorOpacity};\n }\n \n .switch-button {\n cursor: pointer !important;\n }\n \n .range-slider {\n cursor: ew-resize;\n }\n \n .range-fill {\n z-index: 0;\n width: 100%;\n left: -100%;\n }\n \n .icon-container {\n position: absolute;\n display: flex;\n z-index: 1;\n width: 38px;\n height: 38px;\n margin: 6px;\n border-radius: 50%;\n cursor: pointer !important;\n background-color: var(--card-background-color,var(--ha-card-background));\n }\n \n .icon-container::after {\n content: '';\n position: absolute;\n display: block;\n opacity: ${entityId.startsWith("light.")?"0.2":"0"};\n width: 100%;\n height: 100%;\n transition: all 1s;\n border-radius: 50%;\n background-color: ${stateOn?this.rgbColor?this.rgbColor:"var(--accent-color)":"var(--card-background-color,var(--ha-card-background))"};\n }\n \n ha-icon {\n display: flex;\n position: absolute;\n margin: inherit;\n padding: 1px 2px;\n width: 22px; \n height: 22px;\n color: ${stateOn?this.rgbColor?this.rgbColor:"var(--accent-color)":"inherit"};\n opacity: ${stateOn?"1":"0.6"};\n filter: ${stateOn?this.rgbColor?this.iconFilter:"brightness(1.1)":"inherit"};\n }\n \n .entity-picture {\n display: flex;\n height: 38px;\n width: 38px;\n border-radius: 100%;\n }\n \n .name-container {\n position: relative;\n display: ${m?"block":"inline-flex"};\n margin-left: 58px;\n z-index: 1;\n font-weight: 600;\n align-items: center;\n line-height: ${m?"4px":"16px"};\n padding-right: 16px;\n }\n \n .state {\n font-size: 12px;\n opacity: 0.7;\n }\n \n .feedback-element {\n position: absolute;\n top: 0;\n left: 0;\n opacity: 0;\n width: 100%;\n height: 100%;\n background-color: rgb(0,0,0);\n }\n \n @keyframes tap-feedback {\n 0% {transform: translateX(-100%); opacity: 0;}\n 64% {transform: translateX(0); opacity: 0.1;}\n 100% {transform: translateX(100%); opacity: 0;}\n }\n `;
                addStyles(this, M, customStyles, state, entityId, E);
                break;
            case "separator":
                if (!this.separatorAdded || editor) {
                    if (editor && this.separatorContainer)
                        for (; this.separatorContainer.firstChild;) this.separatorContainer.removeChild(this.separatorContainer.firstChild);
                    this.separatorAdded || (this.separatorContainer = document.createElement("div"), this.separatorContainer.setAttribute("class", "separator-container")), this.separatorContainer.innerHTML = `\n <div>\n <ha-icon icon="${icon}"></ha-icon>\n <h4>${name}</h4>\n </div>\n <div></div>\n `, this.content.appendChild(this.separatorContainer), this.separatorAdded = !0
                }
                const q = "\n .separator-container {\n display: inline-flex;\n width: 100%;\n margin-top: 12px;\n }\n .separator-container div:first-child {\n display: inline-flex;\n max-width: calc(100% - 38px);\n }\n .separator-container div ha-icon{\n display: inline-flex;\n height: 24px;\n width: 24px;\n margin: 0 20px 0 8px;\n transform: translateY(-2px);\n }\n .separator-container div h4{\n display: inline-flex;\n margin: 0 20px 0 0;\n font-size: 17px;\n white-space: nowrap;\n overflow: hidden;\n text-overflow: ellipsis;\n }\n .separator-container div:last-child{\n display: inline-flex; \n border-radius: 6px; \n opacity: 0.3; \n margin-left: 10px; \n flex-grow: 1; \n height: 6px; \n align-self: center; \n background-color: var(--background-color,var(--secondary-background-color));\n ";
                addStyles(this, q, customStyles);
                break;
            case "cover":
                const R = this.config.icon_open ? this.config.icon_open : "mdi:window-shutter-open",
                    W = this.config.icon_close ? this.config.icon_close : "mdi:window-shutter",
                    P = this.config.open_service ? this.config.open_service : "cover.open_cover",
                    F = this.config.close_service ? this.config.close_service : "cover.close_cover",
                    j = this.config.stop_service ? this.config.stop_service : "cover.stop_cover",
                    N = this.config.icon_up ? this.config.icon_up : "mdi:arrow-up",
                    X = this.config.icon_down ? this.config.icon_down : "mdi:arrow-down";
                if (icon = "open" === hass.states[this.config.entity].state ? R : W, formatedState = this.config.entity ? hass.formatEntityState(hass.states[this.config.entity]) : "", !this.coverAdded || editor) {
                    if (editor && this.coverContainer)
                        for (; this.coverContainer.firstChild;) this.coverContainer.removeChild(this.coverContainer.firstChild);
                    this.coverContainer = document.createElement("div"), this.coverContainer.setAttribute("class", "cover-container"), this.coverContainer.innerHTML = `\n <div class="header-container">\n <div class="icon-container">\n </div>\n <div class="name-container">\n <p class="name">${name}</p>\n <p class="state">${formatedState}</p>\n </div>\n </div>\n <div class="buttons-container">\n <button class="button open">\n <ha-icon icon="${N}"></ha-icon>\n </button>\n <button class="button stop">\n <ha-icon icon="mdi:stop"></ha-icon>\n </button>\n <button class="button close">\n <ha-icon icon="${X}"></ha-icon>\n </button>\n </div>\n `, this.content.appendChild(this.coverContainer);
                    const ct = this.coverContainer.querySelector(".open"),
                        dt = this.coverContainer.querySelector(".stop"),
                        ht = this.coverContainer.querySelector(".close");
                    ct.addEventListener("click", (() => {
                        hass.callService(P.split(".")[0], P.split(".")[1], {
                            entity_id: entityId
                        })
                    }), {
                        passive: !0
                    }), dt.addEventListener("click", (() => {
                        hass.callService(j.split(".")[0], j.split(".")[1], {
                            entity_id: entityId
                        })
                    }), {
                        passive: !0
                    }), ht.addEventListener("click", (() => {
                        hass.callService(F.split(".")[0], F.split(".")[1], {
                            entity_id: entityId
                        })
                    }), {
                        passive: !0
                    }), this.iconContainer = this.content.querySelector(".icon-container"), addActions(this, this.iconContainer), this.coverAdded = !0
                }
                this.iconContainer && (this.iconContainer.innerHTML = `<ha-icon icon="${icon}" class="icon"></ha-icon>`, this.content.querySelector(".state").textContent = formatedState);
                const G = "\n ha-card {\n margin-top: 0 !important;\n background: none !important;\n }\n \n .header-container {\n display: flex;\n align-items: center;\n margin-bottom: 10px;\n }\n \n .cover-container {\n display: grid;\n }\n \n .icon-container {\n display: flex;\n margin: 0 !important;\n align-items: center;\n justify-content: center;\n cursor: pointer;\n /*z-index: 1;*/\n width: 48px;\n height: 48px;\n margin: 6px;\n border-radius: 50%;\n background-color: var(--card-background-color,var(--ha-card-background));\n border: 6px solid var(--background-color-2,var(--secondary-background-color));\n box-sizing: border-box;\n }\n \n .name-container {\n font-weight: 600;\n margin-left: 10px;\n line-height: 4px;\n }\n \n .buttons-container {\n display: grid;\n align-self: center;\n grid-auto-flow: column;\n grid-gap: 18px; \n }\n \n .state {\n font-size: 12px;\n opacity: 0.7;\n }\n \n ha-icon {\n display: flex; \n height: 24px; \n width: 24px; \n color: var(--primary-text-color);\n }\n \n .button {\n display: flex;\n background: var(--background-color-2,var(--secondary-background-color));\n height: 42px;\n border-radius: 32px;\n align-items: center;\n justify-content: center;\n cursor: pointer;\n border: none;\n }\n ";
                addStyles(this, G, customStyles, state, entityId);
                break;
            case "empty-column":
                if (!this.emptyCollumnAdded) {
                    const pt = document.createElement("div");
                    pt.setAttribute("class", "empty-column"), pt.innerHTML = '\n <div style="display: flex; width: 100%;"></div>\n ', this.content.appendChild(pt), this.emptyColumnAdded = !0
                }
        }
    }
    setConfig(t) {
        if ("pop-up" === t.card_type) {
            if (!t.hash) throw new Error("You need to define an hash. Please note that this card must be placed inside a vertical_stack to work as a pop-up.")
        } else if ("horizontal-buttons-stack" === t.card_type) {
            var e = {};
            for (var n in t)
                if (n.match(/^\d+_icon$/)) {
                    var i = n.replace("_icon", "_link");
                    if (void 0 === t[i]) throw new Error("You need to define " + i);
                    if (e[t[i]]) throw new Error("You can't use " + t[i] + " twice");
                    e[t[i]] = !0
                }
        } else if (("button" === t.card_type || "cover" === t.card_type) && !t.entity) throw new Error("You need to define an entity");
        this.config = t
    }
    getCardSize() {
        return 0
    }
    static getConfigElement() {
        return document.createElement("bubble-card-editor")
    }
}
console.info(`%c Bubble Card %c ${version} `, "background-color: #555;color: #fff;padding: 3px 2px 3px 3px;border-radius: 14px 0 0 14px;font-family: DejaVu Sans,Verdana,Geneva,sans-serif;text-shadow: 0 1px 0 rgba(1, 1, 1, 0.3)", "background-color: #506eac;color: #fff;padding: 3px 3px 3px 2px;border-radius: 0 14px 14px 0;font-family: DejaVu Sans,Verdana,Geneva,sans-serif;text-shadow: 0 1px 0 rgba(1, 1, 1, 0.3)"), customElements.define("bubble-card", BubbleCard);
const fireEvent = (t, e, n, i) => {
    i = i || {}, n = null == n ? {} : n;
    const o = new Event(e, {
        bubbles: void 0 === i.bubbles || i.bubbles,
        cancelable: Boolean(i.cancelable),
        composed: void 0 === i.composed || i.composed
    });
    return o.detail = n, t.dispatchEvent(o), o
};
customElements.get("ha-switch");
const LitElement = Object.getPrototypeOf(customElements.get("ha-panel-lovelace")),
    html = LitElement.prototype.html,
    css = LitElement.prototype.css;
class BubbleCardEditor extends LitElement {
    setConfig(t) {
        this._config = {
            ...t
        }
    }
    static get properties() {
        return {
            hass: {},
            _config: {}
        }
    }
    get _card_type() {
        return this._config.card_type || ""
    }
    get _button_type() {
        return this._config.button_type || "switch"
    }
    get _entity() {
        return this._config.entity || ""
    }
    get _name() {
        return this._config.name || ""
    }
    get _icon() {
        return this._config.icon || ""
    }
    get _state() {
        return this._config.state || ""
    }
    get _text() {
        return this._config.text || ""
    }
    get _hash() {
        return this._config.hash || "#pop-up-name"
    }
    get _trigger_entity() {
        return this._config.trigger_entity || ""
    }
    get _trigger_state() {
        return this._config.trigger_state || ""
    }
    get _trigger_close() {
        return this._config.trigger_close || !1
    }
    get _margin() {
        return this._config.margin || "7px"
    }
    get _margin_top_mobile() {
        return this._config.margin_top_mobile || "0px"
    }
    get _margin_top_desktop() {
        return this._config.margin_top_desktop || "0px"
    }
    get _width_desktop() {
        return this._config.width_desktop || "540px"
    }
    get _bg_color() {
        return this._config.bg_color || window.color
    }
    get _bg_opacity() {
        return void 0 !== this._config.bg_opacity ? this._config.bg_opacity : "88"
    }
    get _bg_blur() {
        return void 0 !== this._config.bg_blur ? this._config.bg_blur : "14"
    }
    get _shadow_opacity() {
        return void 0 !== this._config.shadow_opacity ? this._config.shadow_opacity : "0"
    }
    get _is_sidebar_hidden() {
        return this._config.is_sidebar_hidden || !1
    }
    get _rise_animation() {
        return void 0 === this._config.rise_animation || this._config.rise_animation
    }
    get _auto_close() {
        return this._config.auto_close || ""
    }
    get _back_open() {
        return this._config.back_open || !1
    }
    get _icon_open() {
        return this._config.icon_open || ""
    }
    get _icon_close() {
        return this._config.icon_close || ""
    }
    get _open_service() {
        return this._config.open_service || "cover.open_cover"
    }
    get _close_service() {
        return this._config.open_service || "cover.close_cover"
    }
    get _stop_service() {
        return this._config.open_service || "cover.stop_cover"
    }
    get _auto_order() {
        return this._config.auto_order || !1
    }
    get _show_state() {
        return this._config.show_state || !1
    }
    render() {
        if (!this.hass) return html``;
        if (!this.listsUpdated) {
            const t = t => ({
                label: t,
                value: t
            });
            this.allEntitiesList = Object.keys(this.hass.states).map(t), this.lightList = Object.keys(this.hass.states).filter((t => "light" === t.substr(0, t.indexOf(".")))).map(t), this.sensorList = Object.keys(this.hass.states).filter((t => "sensor" === t.substr(0, t.indexOf(".")))).map(t), this.binarySensorList = Object.keys(this.hass.states).filter((t => "binary_sensor" === t.substr(0, t.indexOf(".")))).map(t), this.coverList = Object.keys(this.hass.states).filter((t => "cover" === t.substr(0, t.indexOf(".")))).map(t), this.cardTypeList = [{
                label: "Button",
                value: "button"
            }, {
                label: "Cover",
                value: "cover"
            }, {
                label: "Empty column",
                value: "empty-column"
            }, {
                label: "Horizontal buttons stack",
                value: "horizontal-buttons-stack"
            }, {
                label: "Pop-up",
                value: "pop-up"
            }, {
                label: "Separator",
                value: "separator"
            }], this.buttonTypeList = [{
                label: "Switch",
                value: "switch"
            }, {
                label: "Slider",
                value: "slider"
            }], this.listsUpdated = !0
        }
        const t = this.allEntitiesList,
            e = (this.lightList, this.sensorList, this.coverList),
            n = this.cardTypeList,
            i = this.buttonTypeList;
        if ("pop-up" === this._config.card_type) return html` <div class="card-config"> ${this.makeDropdown("Card type","card_type",n)} <h3>Pop-up <span style=" font-size: 10px !important; background: rgb(0,90,140); padding: 2px 6px; border-radius: 8px; "> Regular mode </span> </h3> <ha-alert alert-type="info">This card allows you to convert any vertical stack into a pop-up. Each pop-up can be opened by targeting its link (e.g. '#pop-up-name'), with navigation_path or with the horizontal buttons stack that is included.<br><b>It must be placed within a vertical-stack card at the top most position to function properly. The pop-up will be hidden by default until you open it.</b><br><br><a href="https://github.com/Clooos/Bubble-Card#pop-up-optimization">How to get the optimized mode?</a></ha-alert> <ha-textfield label="Hash (e.g. #kitchen)" .value="${this._hash}" .configValue="${"hash"}" @input="${this._valueChanged}" style="width: 100%;" ></ha-textfield> <ha-textfield label="Optional - Name" .value="${this._name}" .configValue="${"name"}" @input="${this._valueChanged}" style="width: 100%;" ></ha-textfield> ${this.makeDropdown("Optional - Icon","icon")} ${this.makeDropdown("Optional - Entity to toggle (e.g. room light group)","entity",t)} ${this.makeDropdown("Optional - Entity state to display (e.g. room temperature)","state",t)} <ha-textfield label="Optional - Additional text" .value="${this._text}" .configValue="${"text"}" @input="${this._valueChanged}" style="width: 100%;" ></ha-textfield> <ha-textfield label="Optional - Auto close in milliseconds (e.g. 15000)" .value="${this._auto_close}" .configValue="${"auto_close"}" @input="${this._valueChanged}" style="width: 100%;" ></ha-textfield> <h3>Pop-up trigger</h3> <ha-alert alert-type="info">This allows you to open this pop-up based on the state of any entity, for example you can open a "Security" pop-up with a camera when a person is in front of your house. You can also create a toggle helper (input_boolean) and trigger its opening/closing in an automation.</ha-alert> ${this.makeDropdown("Optional - Entity to open the pop-up based on its state","trigger_entity",t)} <ha-textfield label="Optional - State to open the pop-up" .value="${this._trigger_state}" .configValue="${"trigger_state"}" @input="${this._valueChanged}" style="width: 100%;" ></ha-textfield> <ha-formfield .label="Optional - Close when the state is different"> <ha-switch aria-label="Optional - Close when the state is different" .checked=${this._trigger_close} .configValue="${"trigger_close"}" @change=${this._valueChanged} ></ha-switch> <div class="mdc-form-field"> <label class="mdc-label">Optional - Close when the state is different</label> </div> </ha-formfield> <h3>Styling options</h3> <ha-textfield label="Optional - Margin (fix centering on some themes) (e.g. 13px)" .value="${this._margin}" .configValue="${"margin"}" @input="${this._valueChanged}" style="width: 100%;" ></ha-textfield> <ha-textfield label="Optional - Top margin on mobile (e.g. -56px if your header is hidden)" .value="${this._margin_top_mobile}" .configValue="${"margin_top_mobile"}" @input="${this._valueChanged}" style="width: 100%;" ></ha-textfield> <ha-textfield label="Optional - Top margin on desktop (e.g. 50% for an half sized pop-up)" .value="${this._margin_top_desktop}" .configValue="${"margin_top_desktop"}" @input="${this._valueChanged}" style="width: 100%;" ></ha-textfield> <ha-textfield label="Optional - Width on desktop (100% by default on mobile)" .value="${this._width_desktop}" .configValue="${"width_desktop"}" @input="${this._valueChanged}" style="width: 100%;" ></ha-textfield> <ha-formfield .label="Optional - Fix when the sidebar is hidden on desktop (turn this to false if your sidebar is unmodified)"> <ha-switch aria-label="Optional - Fix when the sidebar is hidden on desktop (turn this to false if your sidebar is unmodified)" .checked=${this._is_sidebar_hidden} .configValue="${"is_sidebar_hidden"}" @change=${this._valueChanged} ></ha-switch> <div class="mdc-form-field"> <label class="mdc-label">Optional - Fix when the sidebar is hidden on desktop (turn this to false if your sidebar is unmodified)</label> </div> </ha-formfield> <ha-textfield label="Optional - Background color (any hex, rgb or rgba value)" .value="${this._bg_color}" .configValue="${"bg_color"}" @input="${this._valueChanged}" style="width: 100%;" ></ha-textfield> <div style="display: inline-flex;"> <ha-textfield label="Optional - Background opacity" .value="${this._bg_opacity}" .configValue="${"bg_opacity"}" @input="${this._valueChanged}" style="width: 50%;" ></ha-textfield> <ha-slider .value="${this._bg_opacity}" .configValue="${"bg_opacity"}" .min='0' .max='100' @change=${this._valueChanged} style="width: 50%;" ></ha-slider> </div> <div style="display: inline-flex;"> <ha-textfield label="Optional - Background blur" .value="${this._bg_blur}" .configValue="${"bg_blur"}" @input="${this._valueChanged}" style="width: 50%;" ></ha-textfield> <ha-slider .value="${this._bg_blur}" .configValue="${"bg_blur"}" .min='0' .max='100' @change=${this._valueChanged} style="width: 50%;" ></ha-slider> </div> <div style="display: inline-flex;"> <ha-textfield label="Optional - Shadow opacity" .value="${this._shadow_opacity}" .configValue="${"shadow_opacity"}" @input="${this._valueChanged}" style="width: 50%;" ></ha-textfield> <ha-slider .value="${this._shadow_opacity}" .configValue="${"shadow_opacity"}" .min='0' .max='100' @change=${this._valueChanged} style="width: 50%;" ></ha-slider> </div> <ha-alert alert-type="info">You can't set a value to 0 with the sliders for now, just change it to 0 in the text field if you need to.</ha-alert> <h3>Advanced settings</h3> <ha-formfield .label="Optional - Back button/event support"> <ha-switch aria-label="Optional - Back button/event support" .checked=${this._back_open?this._back_open:window.backOpen} .configValue="${"back_open"}" @change=${this._valueChanged} ></ha-switch> <div class="mdc-form-field"> <label class="mdc-label">Optional - Back button/event support</label> </div> </ha-formfield> <ha-alert alert-type="info"><b>Back button/event support</b> : This allow you to navigate through your pop-ups history when you press the back button of your browser. <b>This setting can be applied only once, you don't need to change it in all pop-ups. If it's not working just turn it on for each pop-ups.</b></ha-alert> ${this.makeVersion()} </div> `;
        if ("button" === this._config.card_type) return html` <div class="card-config"> ${this.makeDropdown("Card type","card_type",n)} <h3>Button</h3> <ha-alert alert-type="info">This card can be a slider or a button, allowing you to toggle your entities, control the brightness of your lights and the volume of your media players. To access color / control of an entity, simply tap on the icon.</ha-alert> ${this.makeDropdown("slider"!==this._button_type?"Entity (toggle)":"Entity (light or media_player)","entity",t)} ${this.makeDropdown("Button type","button_type",i)} <ha-textfield label="Optional - Name" .value="${this._name}" .configValue="${"name"}" @input="${this._valueChanged}" style="width: 100%;" ></ha-textfield> ${this.makeDropdown("Optional - Icon","icon")} <ha-formfield .label="Optional - Show entity state"> <ha-switch aria-label="Optional - Show entity state" .checked=${this._show_state} .configValue="${"show_state"}" @change=${this._valueChanged} ></ha-switch> <div class="mdc-form-field"> <label class="mdc-label">Optional - Show entity state</label> </div> </ha-formfield> ${this.makeVersion()} </div> `;
        if ("separator" === this._config.card_type) return html` <div class="card-config"> ${this.makeDropdown("Card type","card_type",n)} <h3>Separator</h3> <ha-alert alert-type="info">This card is a simple separator for dividing your pop-up into categories / sections. e.g. Lights, Devices, Covers, Settings, Automations...</ha-alert> <ha-textfield label="Name" .value="${this._name}" .configValue="${"name"}" @input="${this._valueChanged}" style="width: 100%;" ></ha-textfield> ${this.makeDropdown("Icon","icon")} ${this.makeVersion()} </div> `;
        if ("horizontal-buttons-stack" === this._config.card_type) {
            if (!this.buttonAdded && this.shadowRoot.querySelector("#add-button")) {
                const t = this.shadowRoot.querySelector("#add-button");
                for (this.buttonIndex = 0; this._config[this.buttonIndex + 1 + "_link"];) this.buttonIndex++;
                t.addEventListener("click", (() => {
                    this.buttonIndex++;
                    const e = t.style.opacity,
                        n = t.innerText;
                    t.style.opacity = "0.6", t.style.transition = "opacity 1s", t.innerText = "Loading...", setTimeout((() => {
                        t.style.opacity = e, t.innerText = n
                    }), 5e3)
                }), {
                    passive: !0
                }), this.buttonAdded = !0
            }
            return html` <div class="card-config"> ${this.makeDropdown("Card type","card_type",n)} <h3>Horizontal buttons stack</h3> <ha-alert alert-type="info">This card is the companion to the pop-up card, allowing you to open the corresponding pop-ups. It also allows you to open any page of your dashboard. In addition, you can add your motion sensors so that the order of the buttons adapts according to the room you just entered. This card is scrollable, remains visible and acts as a footer.<br><br>Please note that this card may take some time to load in edit mode.</ha-alert> <ha-formfield .label="Auto order"> <ha-switch aria-label="Toggle auto order" .checked=${this._auto_order} .configValue="${"auto_order"}" @change=${this._valueChanged} ></ha-switch> <div class="mdc-form-field"> <label class="mdc-label">Optional - Auto order (Presence/occupancy sensors needed)</label> </div> </ha-formfield> <div id="buttons-container"> ${this.makeButton()} </div> <button id="add-button">Add Button</button> <h3>Styling options</h3> <ha-textfield label="Optional - Margin (fix centering on some themes) (e.g. 13px)" .value="${this._margin}" .configValue="${"margin"}" @input="${this._valueChanged}" style="width: 100%;" ></ha-textfield> <ha-textfield label="Optional - Width on desktop (100% by default on mobile)" .value="${this._width_desktop}" .configValue="${"width_desktop"}" @input="${this._valueChanged}" style="width: 100%;" ></ha-textfield> <ha-formfield .label="Optional - Fix when the sidebar hidden on desktop"> <ha-switch aria-label="Optional - Fix when the sidebar hidden on desktop" .checked=${this._is_sidebar_hidden} .configValue="${"is_sidebar_hidden"}" @change=${this._valueChanged} ></ha-switch> <div class="mdc-form-field"> <label class="mdc-label">Optional - Fix when the sidebar is hidden on desktop</label> </div> </ha-formfield> <ha-formfield .label="Optional - Rise animation (Displays an animation once the page has loaded)"> <ha-switch aria-label="Optional - Rise animation (Displays an animation once the page has loaded)" .checked=${this._rise_animation} .configValue="${"rise_animation"}" @change=${this._valueChanged} ></ha-switch> <div class="mdc-form-field"> <label class="mdc-label">Optional - Rise animation (Displays an animation once the page has loaded)</label> </div> </ha-formfield> ${this.makeVersion()} </div> `
        }
        return "cover" === this._config.card_type ? html` <div class="card-config"> ${this.makeDropdown("Card type","card_type",n)} <h3>Cover</h3> <ha-alert alert-type="info">This card allows you to control your covers.</ha-alert> ${this.makeDropdown("Entity","entity",e)} <ha-textfield label="Optional - Name" .value="${this._name||""}" .configValue="${"name"}" @input="${this._valueChanged}" style="width: 100%;" ></ha-textfield> <ha-textfield label="Optional - Open service (cover.open_cover by default)" .value="${this._open_service}" .configValue="${"open_service"}" @input="${this._valueChanged}" style="width: 100%;" ></ha-textfield> <ha-textfield label="Optional - Stop service (cover.stop_cover by default)" .value="${this._stop_service}" .configValue="${"stop_service"}" @input="${this._valueChanged}" style="width: 100%;" ></ha-textfield> <ha-textfield label="Optional - Close service (cover.close_cover by default)" .value="${this._close_service}" .configValue="${"close_service"}" @input="${this._valueChanged}" style="width: 100%;" ></ha-textfield> ${this.makeDropdown("Optional - Open icon","icon_open")} ${this.makeDropdown("Optional - Closed icon","icon_close")} <h3>Styling options</h3> ${this.makeDropdown("Optional - Arrow down icon","icon_down")} ${this.makeDropdown("Optional - Arrow up icon","icon_up")} ${this.makeVersion()} </div> ` : "empty-column" === this._config.card_type ? html` <div class="card-config"> ${this.makeDropdown("Card type","card_type",n)} <h3>Empty column</h3> <ha-alert alert-type="info">Just an empty card to fill any empty column.</ha-alert> ${this.makeVersion()} </div> ` : this._config.card_type ? void 0 : html` <div class="card-config"> ${this.makeDropdown("Card type","card_type",n)} <ha-alert alert-type="info">You need to add a card type first.</ha-alert> <img style="width: 100%" src="https://user-images.githubusercontent.com/36499953/268039672-6dd13476-42c5-427c-a4d8-ad4981fc2db7.gif"> <p>Almost everything is available in the GUI editor, but in the YAML editor you can add your own <b>custom styles</b>, create <b>custom buttons</b> or modify the <b>tap actions</b> of all cards. You can find more details on my GitHub page.</p> <a href="https://github.com/Clooos/Bubble-Card"><img src="https://img.shields.io/badge/GitHub-Documentation-blue?logo=github"></a> <p>And if you like my project and want to support me, please consider making a donation. Any amount is welcome and very much appreciated! 🍻</p> <div style="display: inline-block;"> <a href="https://www.buymeacoffee.com/clooos"><img src="https://img.shields.io/badge/Donate-Buy%20me%20a%20beer-yellow?logo=buy-me-a-coffee"></a> <a href="https://www.paypal.com/donate/?business=MRVBV9PLT9ZPL&no_recurring=0&item_name=Hi%2C+I%27m+Clooos+the+creator+of+Bubble+Card.+Thank+you+for+supporting+me+and+my+passion.+You+are+awesome%21+%F0%9F%8D%BB&currency_code=EUR"><img src="https://img.shields.io/badge/Donate-PayPal-blue?logo=paypal"></img></a> </div> ${this.makeVersion()} </div> `
    }
    makeDropdown(t, e, n) {
        this.hass;
        return t.includes("icon") || t.includes("Icon") ? html` <div> <ha-icon-picker label="${t}" .value="${this["_"+e]}" .configValue="${e}" item-label-path="label" item-value-path="value" @value-changed="${this._valueChanged}" ></ha-icon-picker> </div> ` : html` <div> <ha-combo-box label="${t}" .value="${this["_"+e]}" .configValue="${e}" .items="${n}" @value-changed="${this._valueChanged}" ></ha-combo-box> </div> `
    }
    makeButton() {
        let t = [];
        for (let e = 1; e <= this.buttonIndex; e++) t.push(html` <div class="${e}_button"> <div class="button-header"> <ha-icon class="remove-button" icon="mdi:close" @click=${()=>this.removeButton(e)}></ha-icon> <span class="button-number">Button ${e}</span> </div> <ha-textfield label="Link / Hash to pop-up (e.g. #kitchen)" .value="${this._config[e+"_link"]||""}" .configValue="${e}_link" @input="${this._valueChanged}" style="width: 100%;" ></ha-textfield> <ha-textfield label="Optional - Name" .value="${this._config[e+"_name"]||""}" .configValue="${e}_name" @input="${this._valueChanged}" style="width: 100%;" ></ha-textfield> <ha-icon-picker label="Optional - Icon" .value="${this._config[e+"_icon"]||""}" .configValue="${e}_icon" item-label-path="label" item-value-path="value" @value-changed="${this._valueChanged}" ></ha-icon-picker> <ha-combo-box label="Optional - Light / Light group (For background color)" .value="${this._config[e+"_entity"]||""}" .configValue="${e}_entity" .items="${this.allEntitiesList}" @value-changed="${this._valueChanged}" ></ha-combo-box> <ha-combo-box label="Optional - Presence / Occupancy sensor (For button auto order)" .value="${this._config[e+"_pir_sensor"]||""}" .configValue="${e}_pir_sensor" .disabled=${!this._config.auto_order} .items="${this.binarySensorList}" @value-changed="${this._valueChanged}" ></ha-combo-box> </div> `);
        return t
    }
    makeVersion() {
        return html` <h4 style=" font-size: 12px !important; background: rgba(0,0,0,0.1); padding: 8px 16px; border-radius: 32px; "> Bubble Card <span style=" font-size: 10px; background: rgba(0,120,180,1); padding: 0px 8px; border-radius: 12px; margin-right: -6px; float: right; "> ${version} </span> </h4> `
    }
    removeButton(t) {
        delete this._config[t + "_name"], delete this._config[t + "_icon"], delete this._config[t + "_link"], delete this._config[t + "_entity"], delete this._config[t + "_pir_sensor"];
        for (let e = t; e < this.buttonIndex; e++) this._config[e + "_name"] = this._config[e + 1 + "_name"], this._config[e + "_icon"] = this._config[e + 1 + "_icon"], this._config[e + "_link"] = this._config[e + 1 + "_link"], this._config[e + "_entity"] = this._config[e + 1 + "_entity"], this._config[e + "_pir_sensor"] = this._config[e + 1 + "_pir_sensor"];
        delete this._config[this.buttonIndex + "_name"], delete this._config[this.buttonIndex + "_icon"], delete this._config[this.buttonIndex + "_link"], delete this._config[this.buttonIndex + "_entity"], delete this._config[this.buttonIndex + "_pir_sensor"], this.buttonIndex--, fireEvent(this, "config-changed", {
            config: this._config
        })
    }
    _valueChanged(t) {
        if (!this._config || !this.hass) return;
        const e = t.target,
            n = t.detail;
        e.configValue && ("ha-switch" === e.type ? this._config = {
            ...this._config,
            [e.configValue]: e.checked
        } : this._config = {
            ...this._config,
            [e.configValue]: void 0 === e.checked && n.value ? e.checked || n.value : e.value || e.checked
        }), fireEvent(this, "config-changed", {
            config: this._config
        })
    }
    static get styles() {
        return css` div { display: grid; grid-gap: 12px; } #add-button { height: 32px; border-radius: 16px; border: none; background-color: var(--accent-color); } .button-header { height: auto; width: 100%; display: inline-flex; align-items: center; } .button-number { display: inline-flex; width: auto; } .remove-button { display: inline-flex; border-radius: 50%; width: 24px; height: 24px; text-align: center; line-height: 24px; vertical-align: middle; cursor: pointer; } `
    }
}
customElements.define("bubble-card-editor", BubbleCardEditor), window.customCards = window.customCards || [], window.customCards.push({
    type: "bubble-card",
    name: "Bubble Card",
    preview: !1,
    description: "A minimalist card collection with a nice pop-up touch."
});