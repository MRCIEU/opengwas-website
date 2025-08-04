export async function includeHTML(selector, url) {
  const element = document.querySelector(selector);
  if (!element) return;
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Failed to load ${url}`);
    const html = await res.text();
    element.innerHTML = html;
  } catch (err) {
    console.error(err);
  }
}
