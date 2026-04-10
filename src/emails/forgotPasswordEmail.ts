import { emailWrapper, h1, p, btn } from "./base";

export function forgotPasswordEmail(params: { displayName: string; resetLink: string }): { subject: string; html: string } {
  return {
    subject: "Reset your DevOS password",
    html: emailWrapper(
      `${h1("Reset your password")}
      ${p(`Hi ${params.displayName}, we received a request to reset your DevOS password.`)}
      ${p("Click the button below. This link expires in 1 hour.")}
      <p style="margin:24px 0;">${btn("Reset Password", params.resetLink)}</p>
      ${p("If you didn't request this, you can safely ignore this email.")}`,
      "Reset your DevOS password"
    ),
  };
}
