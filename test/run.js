import * as FS from "fs";
import {
    RESET,
    HIGHLIGHT,
    DIM,
    RED,
    GREEN,
    YELLOW,
    BLUE,
} from "./colors.js";
import {
    SUBLINE,
    document,
    window,
    body,
    head,
    loadHtmlAsync,
    querySelectorAll,
    loadCSS,
    matchCSS,
} from "./system.js";


const hasHtmlTag = /<\s*html(\s+lang\s*=\s*"?\w*"?)?>/;
const hasHeadTag = /<\s*head\s*>/;
const hasBodyTag = /<\s*body\s*>/;


(async () => {
    await loadHtmlAsync("index.html");
    test("index.html", {
        g() {
            if (!validateFileExists("index.html")) return;
            const raw = FS.readFileSync("index.html", { encoding: "utf8" });

            // Starts with doctype
            if (/^\s*<!DOCTYPE\s+html\s*>\s*\n/.test(raw) == false) {
                testError(`Filen ska börja med ${GREEN}<!DOCTYPE html>${RESET}`);
            }
            let hasRootErrors = false;
            if (!hasHtmlTag.test(raw)) {
                testError(`Ett ${GREEN}<html>${RESET} element måste finnas`);
                hasRootErrors = true;
            }
            if (!hasHeadTag.test(raw)) {
                testError(`Ett ${GREEN}<head>${RESET} element måste finnas`);
                hasRootErrors = true;
            }
            if (!hasBodyTag.test(raw)) {
                testError(`Ett ${GREEN}<body>${RESET} element måste finnas`);
                hasRootErrors = true;
            }
            if (hasRootErrors) return;

            if (!validate(querySelectorAll("html"), [
                d => d.one(`${RED}<html">${RESET}`),
            ])) {
                return;
            }

            validate(head.charset, [
                d => d.one(`<meta ${RED}charset="UTF-8"${RESET}>`),
                d => d.first()
                    .attribute("charset")
                    .matches("UTF-8", `Felaktig <meta charset=${RED}"%s"${RESET}> användes`),
                d => d.first()
                    .attribute("name")
                    .notExists(`${GREEN}<meta charset="UTF-8">${RESET} borde inte innehålla ${RED}name="%s"${RESET}`),
            ]);
            if (validate(head.css, [
                d => d.min(1, "Det finns ingen CSS-fil länkad"),
                d => d.each(v => v
                    .attribute("href")
                    .exists("Alla <link rel=\"stylesheet\"> element ska ha en href attribut som anger en .css fil")
                ),
                d => d.each(v => v
                    .attribute("href")
                    .matches(/.+.css/, "Alla <link rel=\"stylesheet\"> element ska ha en href attribut som anger en .css fil")
                ),
                d => d.each(v => v
                    .attribute("name")
                    .notExists(`${GREEN}<link rel="stylesheet"/>${RESET} borde inte innehålla ${RED}name="%s"${RESET}`),
                ),
            ])) {
                const styles = head.css.filter(x => x.getAttribute("href") == "styles.css");
                if (styles.length == 0) {
                    testError(`Det finns ingen länk till ${BLUE}styles.css${RESET}`);
                }
                else if (styles.length > 1) {
                    testError(`Det finns ${styles.length} länkar till samma ${BLUE}styles.css${RESET} fil`);
                }
            }

            validate(querySelectorAll('img'), [
                d => d.min(2, `Minst ${GREEN}två${RESET} <img> bilder ska användas`),
                d => d.each(v => v
                    .attribute("src")
                    .exists(`Bilderna måste använda ett ${RED}src=""${RESET} attribut`)
                ),
            ]);
            validate(querySelectorAll('a'), [
                d => d.min(1, `Minst ${GREEN}en${RESET} <a> länk ska användas`),
                d => d.each(v => v
                    .attribute("href")
                    .exists(`Länkarna måste använda ett ${RED}href=""${RESET} attribut`)
                ),
            ]);

            if (querySelectorAll('h1').length == 0) {
                testError(`Minst ${GREEN}en${RESET} <h1> rubrik ska användas`);
            }
        },
        vg() {
            const lang = querySelectorAll("html")[0]?.getAttribute("lang");
            const lowerCaseLang = lang?.toLowerCase();
            if (!lang) {
                testError(`Sätt språket på sidan via <html ${GREEN}lang=""${RESET}>`);
            }
            else if (lowerCaseLang != "sv" && lowerCaseLang != "en") {
                testError(`<html lang=${RED}"${lang}"${RESET}> är inte ett giltigt värde, använd svenska (${GREEN}sv${RESET}) eller engelska (${GREEN}en${RESET})`);
            }

            validate(querySelectorAll('head > title'), [
                d => d.one(`Använd ${HIGHLIGHT}ett${RESET} ${GREEN}<title>${RESET} element på rätt plats`, true),
                d => d.first()
                    .attribute("name")
                    .notExists(`${GREEN}<meta charset="UTF-8">${RESET} borde inte innehålla ${RED}name="%s"${RESET}`),
            ]);
            validate(head.viewport, [
                d => d.one(`Använd ${HIGHLIGHT}ett${RESET} <meta name=${GREEN}"viewport"${RESET} /> element på rätt plats`, true),
                d => d.first()
                    .attribute("content")
                    .matches(
                        /^width\s*=\s*device-width\s*,\s*initial-scale\s*=\s*1(.0)?$/,
                        `Felaktig <meta name="viewport" content=${RED}"%s"${RESET}/>${SUBLINE}Förväntat: ${GREEN}"width=device-width, initial-scale=1"${RESET}`),
                d => d.first()
                    .attribute("charset")
                    .notExists(`${GREEN}<meta name="viewport">${RESET} borde inte innehålla ${RED}charset="%s"${RESET}`),
            ]);
            validate(querySelectorAll('h2'), [
                d => d.min(1, `Använd minst en ${RED}<h2>${RESET} rubrik`),
            ]);

            validate(querySelectorAll('img'), [
                d => d.each(v => v
                    .attribute("alt")
                    .exists(`Bilderna använder ${RED}alt=""${RESET} attributet`)
                ),
            ]);
        }
    });

    test("styles.css", {
        g() {
            const css = loadCSS("styles.css", testError);
            if (css.error != null) {
                testError(css.error);
                return;
            }

            css.validateColor("#001A23", "Ink Black");
            css.validateColor("#31493C", "Pine Teal");
            css.validateColor("#7A9E7E", "Muted Teal");
            css.validateColor("#B3EFB2", "Celadon");
            css.validateColor("#E8F1F2", "Alice Blue");

            css.validateCount({
                name: "font-size",
                property: "font-size",
                value: matchCSS.notZeroOrNegative,
                min: 1,
            });
            css.validateCount({
                name: "color",
                property: "color",
                min: 2,
            });
            css.validateCount({
                name: "background",
                property: /background(-color)?/,
                min: 2,
            });

            // No empty rules
            const emptyRules = [...css.rules.filter(x => x.empty), ...css.media.flatMap(m => m.rules).filter(x => x.empty)];
            if (emptyRules.length > 0) {
                for (const e of emptyRules) {
                    testError(`Ta bort selektor utan innehåll: ${BLUE}${css.path}:${e.position.start.line}:${e.position.start.column}${RESET}`);
                }
            }

            // No empty media queries
            const emptyMediaQueries = css.media.filter(x => x.empty);
            if (emptyMediaQueries.length > 0) {
                for (const e of emptyMediaQueries) {
                    testError(`Ta bort media-regel utan innehåll: ${BLUE}${css.path}:${e.position.start.line}:${e.position.start.column}${RESET}`);
                }
            }
        },
        vg() {
            const css = loadCSS("styles.css", testError);
            if (css.error != null) return;

            // Media queries
            validate(css.media, [
                d => d.min(1, `Använd minst ${GREEN}1${RESET} ${HIGHLIGHT}media-regel${RESET}`),
            ]);

            // Rules
            css.validateCount({
                name: "display: flex",
                property: "display",
                value: "flex",
                min: 1,
            });
            css.validateCount({
                name: "flex-grow",
                property: "flex-grow",
                value: matchCSS.notZeroOrNegative,
                min: 1,
            });
            css.validateCount({
                name: "max-width",
                property: "max-width",
                value: matchCSS.notZeroOrNegative,
                min: 1,
            });
        }
    });

    if (shouldReturnError) process.exit(1);


    var shouldReturnError = false;
    var test_returnErrorOnFail = true;
    var test_success = true;
    var test_log = [];
    var test_numerrors = 0;

    function resetTests() {
        test_returnErrorOnFail = true;
        test_success = true;
        test_log = [];
        test_numerrors = 0;
    }

    function test(name, tests) {
        resetTests();
        tests.g();
        let errorText = "";
        if (test_numerrors > 0) {
            errorText += `${RED}✖  ${name}${RESET} har ${HIGHLIGHT}${test_numerrors}${RESET} fel`;
            // console.log(`${RED}✖  ${name}${RESET} har ${HIGHLIGHT}${test_numerrors}${RESET} fel`);
            for (let log of test_log) {
                errorText += "\n  " + log;
                // console.log("  " + log);
            }
        }
        else if (!tests.vg) {
            console.log(`${GREEN}✔  ${name}${RESET} (${HIGHLIGHT}${GREEN}G${RESET})`);
            console.log();
            return;
        }

        resetTests();
        test_returnErrorOnFail = false;
        tests.vg();
        if (test_numerrors > 0) {
            if (errorText.length == 0) {
                console.log(`${GREEN}✔  ${name}${RESET} (${HIGHLIGHT}${GREEN}G${RESET})`);
                console.log(`   Det kvarstår ${HIGHLIGHT}${test_numerrors}${RESET} ${test_numerrors == 1 ? "sak" : "saker"} för att uppnå ${HIGHLIGHT}VG${RESET} ⭐:`);
            }
            else {
                console.log(errorText + "\n");
                console.log(`   Utöver det kvarstår ${HIGHLIGHT}${test_numerrors}${RESET} ${test_numerrors == 1 ? "sak" : "saker"} för att uppnå ${HIGHLIGHT}VG${RESET} ⭐:`);
            }
            for (let log of test_log) {
                console.log("  " + log);
            }
        }
        else {
            if (errorText.length > 0) console.log(errorText);
            else console.log(`${GREEN}✔  ${GREEN}${name}${RESET} (${HIGHLIGHT}${GREEN}VG${RESET}) ⭐`);
        }
        console.log();
    }

    function testError(error) {
        test_log.push(`${RED} • ${RESET}${error}${RESET}`);
        test_success = false;
        test_numerrors++;
        if (test_returnErrorOnFail) shouldReturnError = true;
    }

    function validateFileExists(path) {
        if (!FS.existsSync(path)) {
            testError(`Filen ${BLUE}${path}${RESET} finns inte`);
            return false;
        }
        return true;
    }

    function validate(data, checks) {
        const defaultFunctions = gen(data);
        for (let check of checks) {
            const result = check(defaultFunctions);

            if (result) {
                testError(result);
                return false;
            }
        }

        return true;

        function gen(data) {
            const num = Array.isArray(data) ? data.length : data;
            const str = data instanceof String ? data : (data + "");

            const generated = {};

            generated.max = (limit, warning) => {
                if (num > limit) return warning.replaceAll("%s", str);
            };
            generated.min = (limit, warning) => {
                if (num < limit) return warning.replaceAll("%s", str);
            };
            generated.one = (name, customDesc) => {
                return generated.max(1, customDesc ? name.replaceAll("%s", str) : `Det finns för många ${name}`)
                    ?? generated.min(1, customDesc ? name.replaceAll("%s", str) : `Det finns ingen ${name}`);
            };
            generated.attribute = (name) => gen(data.getAttribute(name));
            generated.first = () => gen(Array.isArray(data) ? data[0] : data);
            generated.each = (action) => {
                if (Array.isArray(data)) {
                    for (let element of data) {
                        const result = action(gen(element));
                        if (result) return result;
                    }
                }
                else {
                    for (let key of Object.keys(data)) {
                        const result = action(gen(data[key]));
                        if (result) return result;
                    }
                }
            };
            generated.exists = (warning) => {
                if (data == null || data == undefined) return warning.replaceAll("%s", str);
                if ((typeof data === 'string' || data instanceof String) && data.length == 0) return warning.replaceAll("%s", str);
            };
            generated.notExists = (warning) => {
                if (data != null && data != undefined) return warning.replaceAll("%s", str);
            };
            generated.matches = (query, warning) => {
                warning = warning.replaceAll("%s", str);
                if (query instanceof RegExp) {
                    if (!query.test(str)) return warning;
                }
                else {
                    if (str != query) return `${warning}${SUBLINE}Förväntat: ${GREEN}"${query}"${RESET}${SUBLINE}Nuvarande: ${RED}"${str}"${RESET}`;
                }
            };
            return generated;
        };
    }
})();
