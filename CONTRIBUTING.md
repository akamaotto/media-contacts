# Contributing to Media Contacts Manager

Thank you for your interest in contributing to Media Contacts Manager! This document provides guidelines and instructions for contributing to this project.

## Code of Conduct

By participating in this project, you agree to abide by our [Code of Conduct](CODE_OF_CONDUCT.md).

## How to Contribute

### Reporting Bugs

If you find a bug, please create an issue with the following information:

- A clear, descriptive title
- Steps to reproduce the issue
- Expected behavior
- Actual behavior
- Screenshots (if applicable)
- Environment details (browser, OS, etc.)

### Suggesting Features

We welcome feature suggestions! Please create an issue with:

- A clear, descriptive title
- Detailed description of the proposed feature
- Any relevant mockups or examples
- Explanation of why this feature would be useful

### Pull Requests

1. Fork the repository
2. Create a new branch: `git checkout -b feature/your-feature-name`
3. Make your changes
4. Run tests: `npm run test:e2e`
5. Commit your changes: `git commit -m 'Add some feature'`
6. Push to the branch: `git push origin feature/your-feature-name`
7. Open a pull request

#### Pull Request Guidelines

- Follow the existing code style
- Include tests for new features
- Update documentation as needed
- Keep pull requests focused on a single topic
- Link to relevant issues

## Development Setup

### Prerequisites

- Node.js 18+ (LTS recommended)
- PostgreSQL 14+ (for local development)
- npm or yarn

### Setup Instructions

1. Clone the repository
   ```bash
   git clone https://github.com/yourusername/media-contacts.git
   cd media-contacts
   ```

2. Install dependencies
   ```bash
   npm install
   ```

3. Set up environment variables
   ```bash
   cp .env.example .env
   ```

4. Set up the database
   ```bash
   npx prisma migrate dev
   npm run prisma:seed
   ```

5. Start the development server
   ```bash
   npm run dev
   ```

## Testing

Run tests with:
```bash
npm run test:e2e
```

## License

By contributing to Media Contacts Manager, you agree that your contributions will be licensed under the project's [MIT License](LICENSE).
