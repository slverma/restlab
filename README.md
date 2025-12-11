# RESTLab

A modern REST API client for Visual Studio Code. Test, debug, and manage your APIs with a beautiful, intuitive interface.

## ✨ Features

### 🚀 Full HTTP Request Support

- All HTTP methods: GET, POST, PUT, PATCH, DELETE, HEAD, OPTIONS
- Custom headers with autocomplete
- Multiple content types: JSON, XML, Form URL Encoded, Form Data, Plain Text, HTML

### 📁 Organized Collections

- Create folders to organize your requests
- Set base URLs and default headers at the folder level
- All requests in a folder inherit the folder's configuration

### 📝 Request Editor

- Modern, clean interface
- Editable request names
- Headers with key-value editor and autocomplete
- Body editor with content type support
- Form data support with file uploads

### 📊 Response Viewer

- Formatted JSON/XML responses
- Response headers display
- Status code, response time, and size indicators
- Copy and download response data

### 🔧 Developer Tools

- Copy as cURL command
- Save and organize requests
- Persistent storage across sessions

## 🚀 Usage

1. Click the RESTLab icon in the Activity Bar (left sidebar)
2. Create a folder to organize your requests
3. Click the ⚙️ icon to configure folder settings (base URL, headers)
4. Click the ➕ icon to add a new request
5. Configure your request and click Send!

## 📋 Requirements

- VS Code 1.85.0 or higher

## 🔄 Release Notes

### 0.0.1

Initial release:

- Create and manage request folders
- Full HTTP request support
- Form data with file upload support
- Response viewer with copy/download
- cURL command generation
- Modern gradient UI theme

---

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

## License

MIT

---

**Enjoy testing your APIs with RESTLab!** 🧪
