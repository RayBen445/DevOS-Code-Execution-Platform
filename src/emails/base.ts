/** Shared HTML wrapper for all DevOS emails */
export function emailWrapper(content: string, previewText = ""): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>DevOS</title>
  ${previewText ? `<div style="display:none;max-height:0;overflow:hidden;">${previewText}</div>` : ""}
</head>
<body style="margin:0;padding:0;background:#0d1117;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#e6edf3;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0d1117;padding:40px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#161b22;border-radius:12px;border:1px solid #30363d;overflow:hidden;max-width:560px;width:100%;">
        <tr><td style="padding:32px 40px 0;text-align:center;">
          <span style="font-size:22px;font-weight:700;color:#58a6ff;letter-spacing:-0.5px;">DevOS</span>
        </td></tr>
        <tr><td style="padding:28px 40px;">
          ${content}
        </td></tr>
        <tr><td style="padding:20px 40px 28px;border-top:1px solid #21262d;text-align:center;">
          <p style="margin:0;font-size:12px;color:#8b949e;">
            DevOS · <a href="https://devos.name.ng" style="color:#58a6ff;text-decoration:none;">devos.name.ng</a>
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export function btn(text: string, href: string): string {
  return `<a href="${href}" style="display:inline-block;padding:12px 24px;background:#2563eb;color:#fff;text-decoration:none;border-radius:8px;font-weight:600;font-size:14px;">${text}</a>`;
}

export function h1(text: string): string {
  return `<h1 style="margin:0 0 16px;font-size:22px;font-weight:700;color:#e6edf3;">${text}</h1>`;
}

export function p(text: string): string {
  return `<p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#8b949e;">${text}</p>`;
}
