# RESTLab

A VS Code extension for REST API testing and management.

## Features

- **Sidebar Panel**: Click the RESTLab icon in the activity bar to open the sidebar
- **Folder Management**: Create and organize folders for your API requests
- **Folder Configuration**: Click on a folder to open its configuration panel

## Development

### Prerequisites

- Node.js 18+
- npm

### Setup

```bash
# Install dependencies
npm install

# Build the extension
npm run build

# Watch for changes during development
npm run watch
```

### Running the Extension

1. Open this folder in VS Code
2. Press `F5` to launch a new Extension Development Host window
3. Click the RESTLab icon in the sidebar to start using the extension

## Project Structure

```
restlab/
├── src/
│   ├── extension.ts          # Extension entry point
│   ├── providers/
│   │   ├── SidebarProvider.ts    # Sidebar webview provider
│   │   └── FolderEditorProvider.ts # Folder editor provider
│   ├── utils/
│   │   └── getNonce.ts       # Security utility
│   └── webview/
│       ├── sidebar/          # React sidebar UI
│       │   ├── index.tsx
│       │   ├── Sidebar.tsx
│       │   └── styles.css
│       └── editor/           # React folder editor UI
│           ├── index.tsx
│           ├── FolderEditor.tsx
│           └── styles.css
├── resources/
│   └── restlab-icon.svg      # Extension icon
├── dist/                     # Compiled output
├── package.json
├── tsconfig.json
└── esbuild.js               # Build configuration
```

## License

MIT
