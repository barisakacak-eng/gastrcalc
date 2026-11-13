// PDF-Leser (pdf.js, liegt unter vendor/): wird beim ersten Gebrauch als Skript nachgeladen. Das Laden braucht document und window.
let pdfjs = null;
export async function pdfLaden() {
  if (pdfjs) return pdfjs;
  await new Promise((res, rej) => {
    const s = document.createElement("script"); s.src = new URL("../../vendor/pdfjs/pdf.min.js", import.meta.url).href; s.onload = res;
    s.onerror = () => rej(Object.assign(new Error("PDF-Leser nicht geladen"), { grund: "laden" })); document.head.appendChild(s);
  });
  pdfjs = window.pdfjsLib; pdfjs.GlobalWorkerOptions.workerSrc = new URL("../../vendor/pdfjs/pdf.worker.min.js", import.meta.url).href;
  return pdfjs;
}
