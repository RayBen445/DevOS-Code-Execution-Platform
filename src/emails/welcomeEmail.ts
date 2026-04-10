import { emailWrapper, h1, p, btn } from "./base";

export function welcomeEmail(params: { displayName: string; username: string }): { subject: string; html: string } {
  return {
    subject: `Welcome to DevOS, ${params.displayName}!`,
    html: emailWrapper(
      `${h1(`Welcome, ${params.displayName} 👋`)}
      ${p("Your DevOS account is ready. Build, deploy, and collaborate — all in one place.")}
      ${p(`Your username: <strong style="color:#e6edf3;">@${params.username}</strong>`)}
      <p style="margin:24px 0 0;text-align:center;">${btn("Open DevOS", "https://devos.name.ng")}</p>`,
      `Welcome to DevOS, ${params.displayName}`
    ),
  };
}
