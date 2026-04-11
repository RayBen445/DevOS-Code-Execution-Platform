import { emailWrapper, h1, p, btn } from "./base";

export function deploySuccessEmail(params: {
  displayName: string;
  projectName: string;
  url: string;
  framework?: string;
}): { subject: string; html: string } {
  return {
    subject: `✅ ${params.projectName} deployed successfully`,
    html: emailWrapper(
      `${h1(`${params.projectName} is live!`)}
      ${p(`Hi ${params.displayName}, your project was deployed successfully.`)}
      ${params.framework ? p(`<strong style="color:#e6edf3;">Framework:</strong> ${params.framework}`) : ""}
      ${p(`<strong style="color:#e6edf3;">URL:</strong> <a href="${params.url}" style="color:#58a6ff;">${params.url}</a>`)}
      <p style="margin:24px 0 0;text-align:center;">${btn("Open Live Site", params.url)}</p>`,
      `${params.projectName} deployed`
    ),
  };
}

export function deployFailureEmail(params: {
  displayName: string;
  projectName: string;
  error: string;
  ideUrl: string;
}): { subject: string; html: string } {
  return {
    subject: `❌ Deployment failed: ${params.projectName}`,
    html: emailWrapper(
      `${h1(`Deployment failed`)}
      ${p(`Hi ${params.displayName}, your deployment of <strong style="color:#e6edf3;">${params.projectName}</strong> failed.`)}
      ${p(`<strong style="color:#f85149;">Error:</strong> ${params.error}`)}
      <p style="margin:24px 0 0;text-align:center;">${btn("Open IDE", params.ideUrl)}</p>`,
      `Deployment failed: ${params.projectName}`
    ),
  };
}
