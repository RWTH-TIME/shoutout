import path from "node:path";
import { Font } from "@react-pdf/renderer";

let registered = false;

export function registerPdfFonts(): void {
  if (registered) {
    return;
  }
  const fontsDir = path.join(process.cwd(), "app/lib/pdf/fonts");
  Font.register({
    family: "NotoSans",
    fonts: [
      {
        src: path.join(fontsDir, "NotoSans-Regular.ttf"),
        fontWeight: "normal",
      },
      {
        src: path.join(fontsDir, "NotoSans-Bold.ttf"),
        fontWeight: "bold",
      },
    ],
  });
  Font.registerHyphenationCallback((word) => [word]);
  registered = true;
}
