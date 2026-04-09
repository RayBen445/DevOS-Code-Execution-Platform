# DevOS CLI

Deploy projects to DevOS from your terminal.

## Installation

```bash
npm install -g @devos/cli
```

## Usage

### Authenticate
```bash
devos login
```
Paste your API token from **DevOS → Settings → API Tokens**.

### Initialise a project config
```bash
devos init
```
Creates a `devos.json` in the current directory:
```json
{
  "name": "my-project",
  "build": "npm run build",
  "output": "dist"
}
```

### Deploy
```bash
devos deploy
```
- Auto-detects project type (HTML / Vite / Next.js / Node)
- Uploads your project to DevOS
- Runs the build command
- Returns your live URL: `https://<username>.devos.name.ng`

### Check who you're logged in as
```bash
devos whoami
```

### Log out
```bash
devos logout
```

## Config File — `devos.json`

| Field    | Description                         | Default       |
|----------|-------------------------------------|---------------|
| `name`   | Project name on DevOS               | Directory name|
| `build`  | Build command                       | `npm run build`|
| `output` | Output directory after build        | `dist`        |

## Options

```
devos deploy --dir <path>      Deploy from a specific directory
devos deploy --name <name>     Override project name
devos deploy --build <cmd>     Override build command
devos deploy --output <dir>    Override output directory
```

## Supported Project Types

| Type    | Detection                      |
|---------|-------------------------------|
| HTML    | `index.html` in root          |
| Vite    | `vite.config.*` present       |
| Next.js | `next.config.*` present       |
| Node    | `package.json` present        |
