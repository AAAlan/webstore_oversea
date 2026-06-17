function escapeHtml(text) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function sectionsToContentHtml(sections) {
  return (sections ?? [])
    .map((section) => {
      const title = section.title?.trim() ?? "";
      const body = (section.paragraphs ?? [])
        .map((p) => p.trim())
        .filter(Boolean)
        .map((p) => `<p>${escapeHtml(p)}</p>`)
        .join("");
      return title ? `<h4>${escapeHtml(title)}</h4>${body}` : body;
    })
    .join("");
}

export function normalizeRechargeTipsForForm(tips) {
  if (!tips) {
    return { contentHtml: "" };
  }
  if (tips.contentHtml?.trim()) {
    return { contentHtml: tips.contentHtml };
  }
  if (tips.sections?.length) {
    return { contentHtml: sectionsToContentHtml(tips.sections) };
  }
  return { contentHtml: "" };
}
