# Quartier User Guide

Welcome to Quartier! This guide will help you get started with collaborative editing of Quarto documents.

## Table of Contents

- [Getting Started](#getting-started)
- [Authentication](#authentication)
- [Creating and Editing Documents](#creating-and-editing-documents)
- [Collaboration](#collaboration)
- [Keyboard Shortcuts](#keyboard-shortcuts)
- [Tips and Tricks](#tips-and-tricks)
- [Troubleshooting](#troubleshooting)

---

## Getting Started

### What is Quartier?

Quartier is a web-based collaborative editor for Quarto documents. It combines the power of markdown editing with real-time collaboration, making it easy to work on research papers, reports, and documentation with your team.

### Key Features

- **Markdown & Quarto Editor**: WYSIWYG editor with full markdown support
- **GitHub Integration**: Direct file access, commits, and branch management
- **Real-time Collaboration**: Live cursor tracking and simultaneous editing
- **Offline Support**: Continue working even without internet connection
- **Dual Authentication**: Support for both repository owners (Host mode) and collaborators (Guest mode)

---

## Authentication

### Host Mode (Repository Owners)

Host mode is for users who own or have write access to GitHub repositories.

**To log in as a Host**:

1. Click "Login with GitHub" on the landing page
2. Authorize Quartier to access your repositories
3. You'll be redirected back to the app with full access

**Capabilities**:
- Browse all your repositories
- Read and write files
- Commit changes directly to GitHub
- Create and share collaboration sessions
- Manage branches

### Guest Mode (Collaborators)

Guest mode is for users who are invited to collaborate on specific files or folders.

**To join as a Guest**:

1. Receive a share link from a Host (e.g., `https://app.quartier.dev/s/brave-bears-shake`)
2. Click the link and authenticate via Cloudflare Access (Google, email OTP, etc.)
3. Access the shared files with appropriate permissions

**Capabilities**:
- View and edit shared files
- See live cursors of other collaborators
- Sync changes with other users
- Cannot commit directly to GitHub (changes saved to session)

---

## Creating and Editing Documents

### Opening a Repository

**For Hosts**:

1. Click the repository selector in the sidebar
2. Choose a repository from your list
3. Browse the file tree
4. Click on a file to open it

**For Guests**:

1. Use the share link provided to you
2. Available files will be shown in the sidebar
3. Click on a file to open it

### Editor Modes

Quartier supports two editor modes:

#### WYSIWYG Mode (Default)

- Visual markdown editor
- See formatting as you type
- Support for:
  - Headers, lists, tables
  - Code blocks with syntax highlighting
  - Math equations (LaTeX)
  - Diagrams (Mermaid)
  - Links and images

**Keyboard Shortcuts (WYSIWYG)**:
- `Ctrl/Cmd + B`: Bold
- `Ctrl/Cmd + I`: Italic
- `Ctrl/Cmd + K`: Insert link
- `Ctrl/Cmd + Shift + C`: Code block
- `Esc`: Blur editor

#### Source Mode

- Raw markdown editing
- Syntax highlighting
- Direct control over markdown source

**To switch modes**:
- Click the "Source" button in the toolbar
- Or use the command palette (Ctrl/Cmd + K)

### Saving Changes

#### Hosts (Commit to GitHub)

1. Make your edits
2. Click the "Save" button (or Ctrl/Cmd + S)
3. Enter a commit message
4. Click "Commit" to push to GitHub

**Note**: Commits are made to the current branch.

#### Guests (Sync to Session)

Changes are automatically synced to the collaboration session and other users. You cannot commit directly to GitHub, but the Host can commit on behalf of the session.

---

## Collaboration

### Creating a Session (Hosts Only)

1. Open a file or folder you want to share
2. Click the "Share" button in the header
3. Configure session settings:
   - **Paths**: Select which files/folders to share
   - **Permission**: Choose "edit" or "view"
   - **Expiration**: Optional expiration date
4. Copy the share link and send to collaborators

### Joining a Session (Guests)

1. Click on the share link provided
2. Authenticate with Cloudflare Access
3. You'll see the shared files in the sidebar
4. Open a file to start collaborating

### Real-time Features

**Live Cursors**:
- See where other users are editing
- Each user has a unique color
- Hover over a cursor to see the user's name

**Awareness**:
- See who's online in the session
- Connection status indicator shows sync status
- Green dot: Connected
- Yellow dot: Connecting
- Gray dot: Disconnected

**Conflict Resolution**:
- Yjs automatically merges concurrent edits
- No need to worry about conflicts
- Changes sync in real-time

### Managing Sessions

**View Your Sessions**:
1. Click "Shared Sessions" in the sidebar
2. See all sessions you've created or joined
3. Click on a session to open it

**Delete a Session**:
1. Open the "Shared Sessions" dialog
2. Click "Delete" on a session you own
3. Confirm deletion

---

## Keyboard Shortcuts

### Global Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl/Cmd + K` | Open command palette |
| `Ctrl/Cmd + S` | Save file (commit) |
| `Ctrl/Cmd + /` | Toggle sidebar |
| `Esc` | Close dialogs/blur editor |

### Editor Shortcuts (WYSIWYG)

| Shortcut | Action |
|----------|--------|
| `Ctrl/Cmd + B` | Bold text |
| `Ctrl/Cmd + I` | Italic text |
| `Ctrl/Cmd + K` | Insert link |
| `Ctrl/Cmd + Shift + C` | Code block |
| `Ctrl/Cmd + Z` | Undo |
| `Ctrl/Cmd + Shift + Z` | Redo |
| `Tab` | Indent list item |
| `Shift + Tab` | Outdent list item |

### Editor Shortcuts (Source)

| Shortcut | Action |
|----------|--------|
| `Ctrl/Cmd + /` | Toggle comment |
| `Ctrl/Cmd + ]` | Indent |
| `Ctrl/Cmd + [` | Outdent |
| `Ctrl/Cmd + F` | Find |
| `Ctrl/Cmd + H` | Replace |

---

## Tips and Tricks

### Offline Editing

Quartier works offline! Your changes are saved locally and will sync when you're back online.

**How it works**:
- Files are cached in your browser's IndexedDB
- Edits are stored locally
- Automatic sync when connection is restored

### File Browser Tips

1. **Context Menu**: Right-click on files for quick actions
2. **Search**: Use Ctrl/Cmd + P to quickly find files
3. **Breadcrumbs**: Click breadcrumbs to navigate up the tree

### Markdown Tips

1. **Tables**: Use GitHub Flavored Markdown table syntax
2. **Math**: Use `$inline$` for inline math, `$$block$$` for block math
3. **Diagrams**: Use ` ```mermaid ` code blocks for diagrams
4. **Code**: Use ` ```language ` for syntax-highlighted code

### Collaboration Best Practices

1. **Communicate**: Use external chat for coordination
2. **Save Often**: Commit changes frequently
3. **Be Specific**: Use clear commit messages
4. **Respect Access**: Only edit files within your permission scope

---

## Troubleshooting

### Common Issues

#### "Unauthorized" Error

**Problem**: Can't access repositories or files

**Solutions**:
- **Host**: Re-login with GitHub
- **Guest**: Check that you're using the correct share link
- **Both**: Verify your internet connection

#### Connection Status Stuck on "Connecting"

**Problem**: Collaboration isn't syncing

**Solutions**:
1. Check your internet connection
2. Refresh the page
3. Try reopening the file
4. Contact the Host to verify session is still active

#### Changes Not Saving

**Problem**: Edits aren't persisted

**Solutions**:
- **Host**: Ensure you have write access to the repository
- **Guest**: Check that session hasn't expired
- **Both**: Verify you're not in read-only mode

#### File Browser Shows No Files

**Problem**: Sidebar is empty

**Solutions**:
- **Host**: Select a repository from the selector
- **Guest**: Verify share link is correct and session is active
- **Both**: Refresh the page

#### Editor Won't Load

**Problem**: Editor remains blank

**Solutions**:
1. Check browser console for errors
2. Try a different browser
3. Clear browser cache and reload
4. Ensure JavaScript is enabled

### Browser Requirements

**Supported Browsers**:
- Chrome/Edge 90+
- Firefox 88+
- Safari 14+

**Required Features**:
- JavaScript enabled
- Cookies enabled
- IndexedDB support
- WebRTC support (for real-time collaboration)

### Getting Help

If you're still experiencing issues:

1. **Check Documentation**: Review this guide and other docs
2. **GitHub Issues**: Search existing issues or create a new one
3. **Contact Support**: Reach out to your organization's admin

---

## Best Practices

### For Repository Owners (Hosts)

1. **Session Management**:
   - Create specific sessions for different projects
   - Set expiration dates for temporary collaborations
   - Regularly review and clean up old sessions

2. **Access Control**:
   - Only share necessary files/folders
   - Use view-only permission when appropriate
   - Revoke access when collaboration ends

3. **Commit Hygiene**:
   - Write clear, descriptive commit messages
   - Commit related changes together
   - Test changes before committing

### For Collaborators (Guests)

1. **Respect Boundaries**:
   - Only edit files within your shared scope
   - Follow project contribution guidelines
   - Ask before making major changes

2. **Communication**:
   - Coordinate edits with other collaborators
   - Notify others before large refactoring
   - Use external communication tools

3. **Local Backups**:
   - Understand that guest edits are temporary
   - Save important work locally
   - Wait for Host to commit before closing

---

## Advanced Features

### Preview Mode

Toggle preview to see rendered markdown alongside the editor:

1. Click "Preview" button in toolbar
2. Split view shows editor and rendered output
3. Preview updates in real-time as you type

### Branch Management (Hosts Only)

Switch between branches to work on different features:

1. Click branch selector in header
2. Choose a different branch
3. All file operations now target that branch

**Note**: Creating new branches is not yet supported through the UI.

### File Operations (Hosts Only)

**Create File**:
1. Right-click on a folder in the sidebar
2. Select "New File"
3. Enter file name with extension
4. File is created and committed to GitHub

**Delete File**:
1. Right-click on a file
2. Select "Delete"
3. Confirm deletion
4. File is deleted and committed to GitHub

**Rename File**:
1. Right-click on a file
2. Select "Rename"
3. Enter new name
4. File is renamed via GitHub API

---

## Privacy and Security

### Data Storage

- **Local**: Files cached in browser's IndexedDB
- **Server**: Session metadata stored in Cloudflare KV
- **GitHub**: Source of truth for all file content

### Authentication

- **Host Mode**: GitHub OAuth with encrypted tokens
- **Guest Mode**: Cloudflare Access with email verification
- **Sessions**: Encrypted session IDs with expiration

### What We Collect

- Email address (for authentication)
- Repository access (via GitHub OAuth)
- Session metadata (owner, members, paths)
- File content (temporarily cached)

### What We Don't Collect

- Personal information beyond email
- File content on our servers (except temporary cache)
- Editing history or analytics
- Payment information (free to use)

---

## Feedback and Contributions

### Report Issues

Found a bug? Have a suggestion?

- **GitHub Issues**: https://github.com/anschmieg/quartier/issues
- **Feature Requests**: Use issue templates
- **Security Issues**: See SECURITY.md

### Contributing

Interested in contributing?

1. Read [CONTRIBUTING.md](./CONTRIBUTING.md)
2. Set up development environment
3. Make your changes
4. Submit a pull request

---

## Version History

- **v0.9.37** (Current): Initial public release
  - Core editing features
  - Collaboration support
  - GitHub integration
  - Comprehensive documentation

---

## Additional Resources

- [Architecture Documentation](./ARCHITECTURE.md)
- [API Reference](./API.md)
- [Security Guide](./SECURITY.md)
- [Environment Variables](./ENVIRONMENT.md)
- [Contributing Guide](./CONTRIBUTING.md)
