# DevOS CLI Setup Guide

A comprehensive guide for installing, configuring, and using the **DevOS CLI** to manage projects, deployments, environments, and more from your terminal.

---

## Prerequisites

| Requirement | Minimum version |
|-------------|----------------|
| Node.js     | ≥ 18           |
| npm         | ≥ 9            |

Verify with:

```bash
node --version   # v18.x.x or higher
npm --version    # 9.x.x or higher
```

---

## Installation

```bash
npm install -g @devos/cli
```

Confirm the installation:

```bash
devos --version
```

---

## Authentication

### Interactive login (browser OAuth)

```bash
devos login
```

A browser window opens and prompts you to sign in with your DevOS account. After authorising, your credentials are stored locally.

### Token-based login (CI / headless environments)

```bash
devos login --token YOUR_API_KEY
```

Generate an API key from **Settings → API Keys** in the DevOS dashboard. In CI pipelines, store the key as a secret (see [CI/CD](#cicd) below).

### Log out

```bash
devos logout
```

---

## Project Initialisation

### Initialise the current directory

```bash
devos init
```

Creates a `devos.json` configuration file in the current directory.

### Create a new project from a template

```bash
devos new my-app --template react
```

Available built-in templates: `blank`, `react`, `vue`, `static`, `node-api`.  
Browse the full marketplace with `devos templates list`.

---

## Core Commands

### Push local files to DevOS

```bash
devos push
```

Syncs all files (respecting `.devosignore`) to the remote project.

### Pull remote files to local

```bash
devos pull
```

Downloads the latest remote snapshot to your local working directory.

### Deploy your project

```bash
devos deploy                         # deploy to preview
devos deploy --env production        # deploy to production
devos deploy --env preview           # explicit preview deploy
devos deploy --watch                 # redeploy on file changes
```

### Run a project command remotely

```bash
devos run <command>
```

Example: `devos run npm test`

---

## `.devosignore`

Create a `.devosignore` file in your project root using the same syntax as `.gitignore` to exclude files from `devos push`:

```
node_modules/
.env
.env.*
dist/
*.log
```

---

## Environment Variables

```bash
devos env list                        # list all env vars for current project
devos env set KEY=VALUE               # set a single variable
devos env set KEY1=VALUE1 KEY2=VALUE2 # set multiple variables
devos env unset KEY                   # remove a variable
devos env pull                        # download env vars to local .env file
```

> **Security note:** secrets set with `devos env set` are encrypted at rest and never exposed in build logs.

---

## Logs

```bash
devos logs                  # latest log lines
devos logs --follow         # stream logs in real time
devos logs --tail 100       # last 100 lines
```

---

## Projects

```bash
devos projects list         # list all your projects
devos projects use <name>   # set the active project for subsequent commands
devos projects delete <id>  # delete a project (irreversible)
```

---

## Organizations

```bash
devos org list                     # list organisations you belong to
devos push --org <slug>            # push to a project owned by an org
```

Switch your active organisation context:

```bash
devos org use <slug>
```

---

## Credits

```bash
devos credits balance              # show current credit balance
devos credits history              # show recent credit transactions
```

---

## CI/CD

### GitHub Actions example

```yaml
# .github/workflows/deploy.yml
name: Deploy to DevOS

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Set up Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install DevOS CLI
        run: npm install -g @devos/cli

      - name: Deploy
        run: devos deploy --env production
        env:
          DEVOS_TOKEN: ${{ secrets.DEVOS_TOKEN }}
```

Store your API key as a repository secret named **`DEVOS_TOKEN`** in **Settings → Secrets and variables → Actions**.

---

## Troubleshooting

| Problem | Likely cause | Fix |
|---------|-------------|-----|
| `command not found: devos` | CLI not installed or not in PATH | Re-run `npm install -g @devos/cli`; check `npm bin -g` is in PATH |
| `Authentication required` | Not logged in | Run `devos login` or set `DEVOS_TOKEN` |
| `Project not found` | Wrong project context | Run `devos projects use <name>` |
| `Quota exceeded` | Credit balance empty | Check `devos credits balance`; top up in the dashboard |
| `Deploy failed` | Build error | Run `devos logs --tail 200` for details |
| `.env` uploaded accidentally | Missing `.devosignore` | Add `.env` and `.env.*` to `.devosignore` and re-push |
