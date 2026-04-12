# Organizations vs Personal Accounts

Understanding when to use a **personal account** and when to use an **organization** on DevOS.

---

## Quick Comparison

| Feature | Personal account | Organization |
|---------|-----------------|-------------|
| **Owner** | Individual user | Shared among members |
| **Projects** | Owned by user | Shared across org members |
| **Members** | N/A (single user) | Multiple members with roles |
| **Subdomain** | `username.devos.name.ng` | `orgslug.devos.name.ng` |
| **Credits** | Personal credit pool | Shared org credit pool |
| **Billing** | Billed to user | Billed to org owner |
| **Visibility** | Public profile / portfolio | Public org page |

---

## Personal Accounts

Every DevOS user has a personal account that includes:

- **Subdomain** — your projects live at `yourusername.devos.name.ng`.
- **Personal credits** — a credit balance used for deployments and compute.
- **Portfolio** — a customisable public profile showcasing your projects.
- **Followers** — other users can follow you to see your public activity.
- **Feed** — posts, reposts, and activity visible to followers.

Personal accounts are perfect for individual side projects, experiments, open-source work, and building a developer portfolio.

---

## Organizations

An organization is a shared workspace for teams and groups:

- **Shared projects** — all org projects are visible to and managed by org members.
- **Role-based access control** — three roles govern what members can do:

  | Role | Permissions |
  |------|------------|
  | **Owner** | Full control: billing, deleting org, managing members and roles |
  | **Admin** | Manage projects, members, join requests, and settings |
  | **Member** | View and contribute to projects; limited settings access |

- **Org subdomain** — org projects live at `orgslug.devos.name.ng`, separate from personal subdomains.
- **Shared credit pool** — org credits are drawn from the org's balance, not individual members' balances.
- **Org page** — a public landing page listing org members and projects.
- **Activity feed** — org-level activity log for project changes, deployments, and member events.

---

## When to Use an Org vs Personal

**Use a personal account when:**
- You're working alone on personal or hobby projects.
- You want a portfolio to showcase your work.
- You're experimenting or learning.

**Use an organization when:**
- Multiple developers need to collaborate on the same projects.
- You need shared credit billing (e.g. a company or team budget).
- You want an org-branded subdomain.
- You need granular access control (admins, moderators, members).
- You're building a product or service under a team or company name.

---

## How They Interact

Organizations and personal accounts live in **separate namespaces**, similar to GitHub:

- A project named `api` under the org `acme` is distinct from a project named `api` on your personal account.
- You can be a member of many organizations while keeping your personal account independent.
- Credits are never shared between your personal pool and an org pool automatically.

---

## Creating an Organization

1. Click your avatar → **New Organization** (or navigate to `/create-org`).
2. Enter an **org name** and a unique **slug** (e.g. `acme` → `acme.devos.name.ng`).
3. Set the **join policy**:
   - *Open* — anyone can join immediately.
   - *Request* — users request to join; an admin approves or rejects.
4. Click **Create Organization**.
5. Invite members from the org page by sharing the org URL or approving join requests.

---

## Switching Context in the IDE

When creating a new project, a dropdown lets you choose the **owner**:

- Select your **username** to create a personal project.
- Select an **org slug** to create a project under that organization.

You can also use the CLI:

```bash
# Create a project under the 'acme' org
devos new my-project --org acme

# Push to an org project
devos push --org acme
```

---

## Billing & Credits

| Scenario | Credit source |
|----------|--------------|
| You deploy a personal project | Your personal credit balance |
| You deploy an org project | The org's shared credit balance |
| You redeem a code on your account | Your personal balance |
| An admin redeems a code for the org | The org's balance |

Top up credits from **Settings → Credits** (personal) or the **Org Settings → Credits** page.

---

## Deleting Your Account or Organization

### Personal account

Navigate to **Settings → Account → Delete Account**. You will be asked to confirm by typing your username. All your personal projects, portfolio, and data will be permanently removed.

> **Note:** You must leave all organizations before deleting your personal account.

### Organization

Only the **org owner** can delete an organization. Navigate to **Org Settings → Danger Zone → Delete Organization**. All org projects, member records, and the org subdomain will be permanently removed. Remaining credits in the org pool are not refunded.
