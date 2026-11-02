import * as Print from "expo-print";

// Phone (Android/iOS): opens the system print dialog for an HTML page. Its
// printer list includes "Save as PDF", so this covers both printing and
// saving. The web build uses printHtml.web.js instead.
export async function printHtml(html) {
  await Print.printAsync({ html });
}
