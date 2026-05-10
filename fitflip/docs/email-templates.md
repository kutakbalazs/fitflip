# FitFlip email template-ek (Supabase)

Másold be ezeket a Supabase dashboard-on:
**Authentication → Emails → Email Templates**

A nyelvválasztás automatikus a `user_metadata.lang` alapján (signup-kor mentjük). Ha nincs lang metadata, magyar a default.

---

## 1. Confirm signup

### Subject
```
{{ if eq .Data.lang "en" }}Confirm your FitFlip account{{ else }}Erősítsd meg a FitFlip fiókodat{{ end }}
```

### Message body (HTML)

```html
<!DOCTYPE html>
<html>
  <body style="margin:0;padding:0;background:#f5f5f4;font-family:-apple-system,BlinkMacSystemFont,'Inter','Segoe UI',sans-serif;color:#0a0a0a;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f5f5f4;padding:40px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden;">
            <tr>
              <td style="padding:40px 40px 0 40px;text-align:center;">
                <span style="font-family:Georgia,'Times New Roman',serif;font-size:22px;font-weight:500;letter-spacing:-0.01em;color:#0a0a0a;">FitFlip</span><span style="font-family:Georgia,'Times New Roman',serif;font-size:13px;color:#a8a29e;margin-left:4px;">.app</span>
              </td>
            </tr>
            <tr>
              <td style="padding:32px 40px 8px 40px;">
                <h1 style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:28px;font-weight:500;letter-spacing:-0.02em;color:#0a0a0a;line-height:1.2;">
                  {{ if eq .Data.lang "en" }}Welcome to FitFlip{{ else }}Üdv a FitFlipben{{ end }}
                </h1>
              </td>
            </tr>
            <tr>
              <td style="padding:8px 40px 24px 40px;">
                <p style="margin:0;font-size:15px;line-height:1.6;color:#44403c;">
                  {{ if eq .Data.lang "en" }}Tap the button below to confirm your email and start scanning sneakers, vintage, and streetwear.{{ else }}Erősítsd meg az email címedet az alábbi gombbal, és kezdheted is azonosítani a sneakerjeidet, vintage és streetwear darabjaidat.{{ end }}
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:8px 40px 8px 40px;">
                <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                  <tr>
                    <td style="background:#0a0a0a;border-radius:999px;">
                      <a href="{{ .ConfirmationURL }}" style="display:inline-block;padding:14px 28px;font-size:14px;font-weight:500;color:#ffffff;text-decoration:none;letter-spacing:-0.005em;">
                        {{ if eq .Data.lang "en" }}Confirm email{{ else }}Email megerősítése{{ end }}
                      </a>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:24px 40px 8px 40px;">
                <p style="margin:0;font-size:13px;line-height:1.6;color:#78716c;">
                  {{ if eq .Data.lang "en" }}Or paste this link into your browser:{{ else }}Vagy másold be ezt a linket a böngésződbe:{{ end }}
                </p>
                <p style="margin:6px 0 0 0;font-size:13px;line-height:1.4;color:#0a0a0a;word-break:break-all;">
                  <a href="{{ .ConfirmationURL }}" style="color:#0a0a0a;text-decoration:underline;">{{ .ConfirmationURL }}</a>
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:32px 40px 40px 40px;border-top:1px solid #f5f5f4;margin-top:24px;">
                <p style="margin:24px 0 0 0;font-size:12px;line-height:1.6;color:#a8a29e;">
                  {{ if eq .Data.lang "en" }}If you didn't sign up for FitFlip, you can safely ignore this email.{{ else }}Ha nem te regisztráltál a FitFlipre, nyugodtan figyelmen kívül hagyhatod ezt az emailt.{{ end }}
                </p>
                <p style="margin:16px 0 0 0;font-size:12px;color:#a8a29e;">
                  <a href="https://fitflip.app" style="color:#a8a29e;text-decoration:none;">fitflip.app</a>
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
```

---

## 2. Reset Password

### Subject
```
{{ if eq .Data.lang "en" }}Reset your FitFlip password{{ else }}FitFlip jelszó visszaállítása{{ end }}
```

### Message body (HTML)

```html
<!DOCTYPE html>
<html>
  <body style="margin:0;padding:0;background:#f5f5f4;font-family:-apple-system,BlinkMacSystemFont,'Inter','Segoe UI',sans-serif;color:#0a0a0a;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f5f5f4;padding:40px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden;">
            <tr>
              <td style="padding:40px 40px 0 40px;text-align:center;">
                <span style="font-family:Georgia,'Times New Roman',serif;font-size:22px;font-weight:500;letter-spacing:-0.01em;color:#0a0a0a;">FitFlip</span><span style="font-family:Georgia,'Times New Roman',serif;font-size:13px;color:#a8a29e;margin-left:4px;">.app</span>
              </td>
            </tr>
            <tr>
              <td style="padding:32px 40px 8px 40px;">
                <h1 style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:28px;font-weight:500;letter-spacing:-0.02em;color:#0a0a0a;line-height:1.2;">
                  {{ if eq .Data.lang "en" }}Reset your password{{ else }}Jelszó visszaállítása{{ end }}
                </h1>
              </td>
            </tr>
            <tr>
              <td style="padding:8px 40px 24px 40px;">
                <p style="margin:0;font-size:15px;line-height:1.6;color:#44403c;">
                  {{ if eq .Data.lang "en" }}Tap the button below to set a new password for your FitFlip account.{{ else }}Kattints a gombra, és állíts be új jelszót a FitFlip fiókodhoz.{{ end }}
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:8px 40px 8px 40px;">
                <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                  <tr>
                    <td style="background:#0a0a0a;border-radius:999px;">
                      <a href="{{ .ConfirmationURL }}" style="display:inline-block;padding:14px 28px;font-size:14px;font-weight:500;color:#ffffff;text-decoration:none;letter-spacing:-0.005em;">
                        {{ if eq .Data.lang "en" }}Set new password{{ else }}Új jelszó beállítása{{ end }}
                      </a>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:24px 40px 8px 40px;">
                <p style="margin:0;font-size:13px;line-height:1.6;color:#78716c;">
                  {{ if eq .Data.lang "en" }}Or paste this link into your browser:{{ else }}Vagy másold be ezt a linket a böngésződbe:{{ end }}
                </p>
                <p style="margin:6px 0 0 0;font-size:13px;line-height:1.4;color:#0a0a0a;word-break:break-all;">
                  <a href="{{ .ConfirmationURL }}" style="color:#0a0a0a;text-decoration:underline;">{{ .ConfirmationURL }}</a>
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:32px 40px 40px 40px;border-top:1px solid #f5f5f4;margin-top:24px;">
                <p style="margin:24px 0 0 0;font-size:12px;line-height:1.6;color:#a8a29e;">
                  {{ if eq .Data.lang "en" }}If you didn't request this, you can safely ignore this email — your password will not change.{{ else }}Ha nem te kérted ezt, nyugodtan figyelmen kívül hagyhatod — a jelszavad nem fog megváltozni.{{ end }}
                </p>
                <p style="margin:16px 0 0 0;font-size:12px;color:#a8a29e;">
                  <a href="https://fitflip.app" style="color:#a8a29e;text-decoration:none;">fitflip.app</a>
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
```

---

## Megjegyzések

- **Nyelv**: `{{ if eq .Data.lang "en" }}...{{ else }}...{{ end }}` — alapértelmezett a magyar, ha nincs `lang` mező a user metadatában. Régi user-eknél amíg fel nem nyitják az appot a kód automatikusan beállítja.
- **Magic Link template**: ezt a flow-t kivettük az UI-ból, így alapból nem kell brandelni. Ha mégis akarod, ugyanezt a layoutot lemásolhatod hozzá.
- **Invite user template**: jelenleg nem használunk meghívásos flow-t, hagyhatod default-on.
- **Subject sor**: ha a Supabase-ed nem támogatja a Go template-et a subject mezőben (régebbi verziók), használj kétnyelvű subject-et: `Erősítsd meg a fiókod / Confirm your account`.
