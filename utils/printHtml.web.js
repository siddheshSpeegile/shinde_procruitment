// Web (PWA): prints an HTML page through a hidden frame, so only the report
// is printed (not the app screen). The browser's print dialog also offers
// "Save as PDF".
export async function printHtml(html) {
  const frame = document.createElement("iframe");
  frame.style.position = "fixed";
  frame.style.right = "0";
  frame.style.bottom = "0";
  frame.style.width = "0";
  frame.style.height = "0";
  frame.style.border = "0";
  document.body.appendChild(frame);

  const doc = frame.contentWindow.document;
  doc.open();
  doc.write(html);
  doc.close();

  await new Promise((resolve) => setTimeout(resolve, 300));
  frame.contentWindow.focus();
  frame.contentWindow.print();
  // Remove the frame once the dialog has had time to take its copy
  setTimeout(() => frame.remove(), 60000);
}
