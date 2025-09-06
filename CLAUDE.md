# GitPocket - Developer Guide

## Project Philosophy

GitPocket is designed with a **mobile-first, simplicity-first** philosophy. The core principles are:

1. **Accessibility Everywhere**: GitHub management should be possible from any mobile device without installing native apps
2. **Zero Backend**: Direct client-to-GitHub API communication ensures privacy and eliminates server costs
3. **Progressive Enhancement**: Works as a website but can be installed as a PWA for app-like experience
4. **Minimal Dependencies**: To keep the app lightweight and fast
5. **User Privacy**: Tokens are stored locally, no tracking, no analytics, no third-party services

## Build Process

### Technology Stack
- **Build Tool**: Vite 5.0 (modern, fast bundler)
- **Framework**: None yet - Pure HTML/CSS/JavaScript for maximum performance
- **Deployment**: GitHub Pages via GitHub Actions
- **Package Manager**: npm

### Build Commands

```bash
# Development server with hot reload
npm run dev

# Production build (outputs to dist/)
npm run build

# Preview production build locally
npm run preview
```

### Project Structure After Vite Migration

```
gitpocket/
├── src/                    # Source files
│   └── index.html         # Single-page application (entry point)
├── dist/                  # Build output (git-ignored)
├── vite.config.js         # Vite configuration
├── package.json           # Dependencies and scripts
└── .github/
    └── workflows/
        └── deploy.yml     # Auto-deployment to GitHub Pages
```

### Vite Configuration Details

The `vite.config.js` file configures:
- **Root**: Set to `src` directory where the source files live
- **Base**: Set to `/gitpocket/` for GitHub Pages subdirectory deployment
- **Build Output**: Outputs to `../dist` (relative to src)
- **Entry Point**: Explicitly set to `src/index.html`

### Development Workflow

1. **Local Development**:
   - Run `npm install` to install dependencies
   - Run `npm run dev` to start Vite dev server
   - Open http://localhost:5173/gitpocket/ in your browser
   - Changes to source files auto-reload in browser

2. **Building for Production**:
   - Run `npm run build` to create optimized production build
   - Build output goes to `dist/` directory
   - Vite handles minification, bundling, and optimization

3. **Deployment**:
   - Push to `main` branch triggers GitHub Actions
   - Workflow automatically runs `npm run build`
   - Deploys `dist/` contents to GitHub Pages
   - Available at https://ideonate.github.io/gitpocket/

### Key Design Decisions

1. **Single HTML File**: Everything is contained in one HTML file once deployed for simplicity and fast loading
2. **Inline PWA Manifest**: Base64-encoded manifest eliminates extra network request
3. **No Build Step for Styles**: CSS is currently embedded directly in the HTML
4. **GitHub API Only**: No custom backend, reducing complexity and maintenance
5. **Token-Based Auth**: Uses GitHub's fine-grained personal access tokens for security

### PWA Implementation

The app includes full PWA support:
- Service worker for offline capability (planned)
- Web app manifest for installability
- App-like mobile experience when installed
- Theme color integration with OS

### Browser Compatibility

Tested and supported on:
- Chrome/Edge 90+ (Recommended)
- Safari 14+ (iOS/macOS)
- Firefox 88+
- Any Chromium-based mobile browser

### Performance Optimizations

- Minimal JavaScript footprint
- Lazy loading of GitHub data
- Local storage for token persistence
- Efficient DOM manipulation

### Security Considerations

- Tokens never leave the device
- Direct GitHub API communication (no proxy)
- No cookies or tracking
- HTTPS-only deployment
- Fine-grained permission model

## Future Enhancements

Potential improvements while maintaining simplicity:
- Offline support via service worker
- Search and filtering capabilities
- Markdown preview for comments
- Dark/light theme toggle
- Notification support for updates
