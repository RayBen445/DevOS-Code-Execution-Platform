import { emailWrapper, h1, p, btn } from "./base";

export function eventRsvpEmail(params: {
  displayName: string;
  eventTitle: string;
  eventDate: string;
  eventUrl: string;
}): { subject: string; html: string } {
  return {
    subject: `RSVP confirmed: ${params.eventTitle}`,
    html: emailWrapper(
      `${h1(`You're going to ${params.eventTitle}!`)}
      ${p(`Hi ${params.displayName}, your RSVP has been confirmed.`)}
      ${p(`<strong style="color:#e6edf3;">Date:</strong> ${params.eventDate}`)}
      <p style="margin:24px 0 0;text-align:center;">${btn("View Event", params.eventUrl)}</p>`,
      `RSVP confirmed for ${params.eventTitle}`
    ),
  };
}

export function eventReminderEmail(params: {
  displayName: string;
  eventTitle: string;
  eventDate: string;
  eventUrl: string;
}): { subject: string; html: string } {
  return {
    subject: `Reminder: ${params.eventTitle} is coming up`,
    html: emailWrapper(
      `${h1(`Reminder: ${params.eventTitle}`)}
      ${p(`Hi ${params.displayName}, just a reminder that this event starts soon.`)}
      ${p(`<strong style="color:#e6edf3;">Date:</strong> ${params.eventDate}`)}
      <p style="margin:24px 0 0;text-align:center;">${btn("View Event", params.eventUrl)}</p>`,
      `Reminder: ${params.eventTitle}`
    ),
  };
}
