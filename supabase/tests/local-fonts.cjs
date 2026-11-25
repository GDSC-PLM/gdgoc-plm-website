const rootRequire = process.getBuiltinModule("node:module").createRequire(process.cwd() + "/package.json");
const google = "next/dist/compiled/@next/font/dist/google/";
const { validateGoogleFontFunctionCall } = rootRequire(google + "validate-google-font-function-call");
const { getFontAxes } = rootRequire(google + "get-font-axes");
const { getGoogleFontsUrl } = rootRequire(google + "get-google-fonts-url");

// The build uses the real font configuration with a local CSS response.
for (const [name, options] of [
  ["Geist", {}],
  ["Geist_Mono", {}],
  ["Google_Sans_Flex", { axes: ["opsz"], display: "swap" }],
]) {
  const font = validateGoogleFontFunctionCall(name, { subsets: ["latin"], ...options });
  const axes = getFontAxes(font.fontFamily, font.weights, font.styles, font.selectedVariableAxes);
  const url = getGoogleFontsUrl(font.fontFamily, axes, font.display);
  module.exports[url] = "@font-face { font-family: '" + font.fontFamily + "'; src: local('Arial'); }";
}
