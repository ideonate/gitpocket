# GitPocket - GitHub Mobile Manager PWA

A Progressive Web App (PWA) for managing GitHub issues and pull requests from your mobile phone. GitPocket provides a mobile-optimized interface to view and interact with your GitHub repositories on the go.

## Features

- 📱 **Mobile-First Design**: Optimized for touch interfaces and small screens
- 🔍 **Universal Access**: View issues and PRs from all your accessible repositories
- 💬 **Interactive**: Add comments to issues and pull requests
- 🌙 **Dark Mode Support**: Automatically adapts to your system theme
- ⚡ **PWA Ready**: Install as a native app on your phone
- 🔒 **Secure**: Uses GitHub Fine-grained Personal Access Tokens

## Live Demo

Visit the app at: https://ideonate.github.io/gitpocket/

## Development

### Prerequisites
- Node.js 20 or higher
- npm

### Setup
```bash
# Clone the repository
git clone https://github.com/ideonate/gitpocket.git
cd gitpocket

# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

### Project Structure
```
gitpocket/
├── src/                  # Source files
│   └── index.html       # Main PWA application
├── dist/                # Build output (generated)
├── .github/
│   └── workflows/
│       └── deploy.yml   # GitHub Actions deployment
├── vite.config.js       # Vite configuration
├── package.json         # Project dependencies
└── README.md
```

### Deployment
The app is automatically deployed to GitHub Pages when changes are pushed to the main branch. The GitHub Actions workflow handles:
1. Building the project with Vite
2. Deploying the built files to GitHub Pages

## Quick Start

1. **Visit the app** on your mobile browser
2. **Generate a GitHub Token**:
   - Go to [GitHub Personal Access Tokens](https://github.com/settings/personal-access-tokens/fine-grained)
   - Click "Generate new token"
   - Choose "Selected repositories" and pick your repos
   - Set the following permissions:
     - **Issues**: Read and write
     - **Pull requests**: Read and write
     - **Metadata**: Read
3. **Sign in** with your token
4. **Install the PWA** (optional): Add to your home screen for app-like experience

## Features in Detail

### Issue Management
- View all open and closed issues across your repositories
- See issue details, descriptions, and comments
- Add new comments to issues
- Real-time status badges (Open/Closed)

### Pull Request Tracking
- Monitor all pull requests across repositories
- View PR status (Open/Closed/Draft)
- Check merge status
- Add comments to PRs

### Repository Overview
- Automatic loading of all accessible repositories
- Repository name displayed for each issue/PR
- Quick refresh to get latest updates

## Technical Details

### Built With
- Pure HTML/CSS/JavaScript (no framework dependencies)
- GitHub REST API v3
- Progressive Web App standards
- Responsive Material Design

### Browser Compatibility
- Chrome/Edge (Recommended)
- Safari (iOS/macOS)
- Firefox
- Any modern mobile browser

### Data Storage
- Uses localStorage for token persistence
- Falls back to in-memory storage if localStorage is unavailable
- No backend server required

## Security

- **Token Storage**: Tokens are stored locally in your browser
- **API Access**: Direct communication with GitHub API
- **No Third-Party Servers**: Your data never passes through external servers
- **Fine-Grained Permissions**: Only requests necessary permissions

## Installation as PWA

### iOS (Safari)
1. Open the app in Safari
2. Tap the Share button
3. Select "Add to Home Screen"
4. Choose a name and tap "Add"

### Android (Chrome)
1. Open the app in Chrome
2. Tap the menu (three dots)
3. Select "Add to Home screen"
4. Follow the prompts

## Development

### Local Setup
```bash
# Clone the repository
git clone https://github.com/ideonate/gitpocket.git

# Navigate to the directory
cd gitpocket

# Serve locally (Python 3)
python -m http.server 8000

# Or with Node.js
npx serve

# Open in browser
# http://localhost:8000
```

### Project Structure
```
gitpocket/
├── index.html      # Single-page application
└── README.md       # Documentation
```

## Troubleshooting

### "No issues/PRs found"
- Ensure your token has the correct permissions
- Check that you've selected the right repositories
- Try refreshing the app

### Token not working
- Verify the token hasn't expired
- Ensure you're using a Fine-grained Personal Access Token
- Check that the required permissions are granted

### PWA not installing
- Ensure you're accessing via HTTPS
- Clear browser cache and try again
- Check browser compatibility

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is open source and available under the MIT License.

## Support

For issues, questions, or suggestions, please [open an issue](https://github.com/ideonate/gitpocket/issues).

## Acknowledgments

- GitHub API for providing comprehensive REST endpoints
- Material Design principles for UI/UX guidance
- PWA community for best practices

---

Made with ❤️ for the GitHub mobile community