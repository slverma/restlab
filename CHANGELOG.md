# Changelog

All notable changes to the RESTLab extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

---

## [0.0.1] - 2024-12-16

### Added

#### Core Features

- **REST API Client** - Full-featured REST API client integrated into VS Code sidebar
- **Request Editor Panel** - Dedicated webview panel for composing and sending HTTP requests
- **Response Viewer** - View response body, headers, and metadata with syntax highlighting

#### Collection Management

- **Collections (Folders)** - Organize requests into collections/folders
- **Nested Subfolders** - Support for hierarchical folder structure with unlimited nesting depth
- **Request Management** - Create, edit, duplicate, and delete requests within collections
- **Auto-expand** - Folders automatically expand when adding new requests or subfolders

#### HTTP Methods Support

- Full support for GET, POST, PUT, PATCH, DELETE, HEAD, OPTIONS methods
- Color-coded method badges for easy visual identification

#### Request Editor Features

- **URL Input** - Smart URL input with base URL resolution
- **Custom Headers** - Add/edit/remove headers with autocomplete suggestions
- **Multiple Body Types**:
  - JSON with syntax highlighting
  - XML
  - Form URL Encoded
  - Form Data with file upload support
  - Plain Text
  - HTML
- **Editable Request Names** - Click to rename requests inline

#### Response Features

- **Formatted Response Body** - Syntax highlighted output for JSON, XML, HTML
- **Response Headers** - Full headers display with copy functionality
- **Response Metadata** - Status code, response time, and size indicators
- **Copy Response** - One-click copy response to clipboard
- **Download Response** - Save response as file
- **Copy as cURL** - Export request as cURL command for terminal use

#### Collection Configuration

- **Base URL** - Set base URL per collection for easier request management
- **Default Headers** - Configure headers at collection level
- **Configuration Inheritance** - Child folders inherit parent folder configuration

#### Import Features

- **RESTLab Format** - Native format with lossless import (preserves all configuration)
- **Postman Collection v2.1** - Import from Postman exported collections
- **Thunder Client Format** - Import Thunder Client JSON exports
- **Import Dropdown** - User-friendly dropdown menu for selecting import provider

#### Export Features

- **RESTLab Format** - Native format export (preserves all settings)
- **Postman Collection v2.1** - Export to Postman compatible format
- **Thunder Client Format** - Export to Thunder Client format
- **Export Dropdown** - Quick export access from collection action buttons

#### User Interface

- **Modern Sidebar Design** - Clean, gradient-styled sidebar with RESTLab branding
- **Custom Tooltips** - Helpful tooltips on all action buttons
- **Empty State** - Friendly empty state with guidance for new users
- **Expandable Folders** - Chevron-based folder expand/collapse with smooth animations
- **Contextual Actions** - Action buttons appear on hover:
  - Add Subfolder
  - Add Request
  - Collection Settings (Base URL & Headers)
  - Export Collection
  - Delete Collection
  - Delete Request

#### Visual Design

- Sky Blue to Indigo gradient theme throughout
- Glass-effect backgrounds with subtle blur
- Method-specific color badges:
  - GET = Green
  - POST = Blue
  - PUT = Orange
  - PATCH = Purple
  - DELETE = Red
  - HEAD = Gray
  - OPTIONS = Teal
- Accent glow effects on interactive elements
- Smooth hover and focus transitions

#### Technical

- Built with React 18 and TypeScript
- VS Code Webview API for seamless integration
- Persistent storage using VS Code globalState
- esbuild for fast compilation
- Modular component architecture

---

## Future Roadmap

The following features are being considered for future releases:

- [ ] Environment variables support
- [ ] Request history
- [ ] Authentication helpers (Bearer, Basic, OAuth)
- [ ] Pre-request scripts
- [ ] Test scripts
- [ ] Drag and drop reordering
- [ ] Code generation (multiple languages)
- [ ] WebSocket support
- [ ] GraphQL support

---

_RESTLab - A modern REST API client for VS Code_
