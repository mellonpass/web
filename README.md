# Web

MellonPass web application.

## Table of Contents

- [Getting Started](#getting-started)
- [Scripts](#scripts)
- [Deployment](#deployment)
- [Contributing](#contributing)
- [License](#license)

# Getting started

### Prerequisites

Make sure you have the following installed on your machine:

- [node](https://nodejs.org/) (>= 18.x)
- [npm](https://www.npmjs.com/) (>= 9.x)

### Installation

1. Cloning the repository:

    ```
    git clone git@github.com:mellonpass/web.git
    ```

1. Installing dependencies:

    ```
    npm i --only=dev
    ```

### Running the application

1. Setup local environment variables.

    ```
    touch .env.example .env
    ```

1. Starting the development server:

    ```
    npm run dev
    ```

# Scripts

The following scripts are available in the package.json:

- `npm run dev`: Start the development web server.
- `npm run check:watch`: Start the realtime svelte-check diagnostics.
- `npm run build`: To build production readt distibution.

# Contributing

To contribute, follow these steps:

- Fork the repository.
- Create a new branch (`git checkout -b feat/your-feature`).
- Make your changes.
- Commit your changes. See [conventional-commits](https://gist.github.com/roelzkie15/3fe7635c542aee64c568535eb8ea25d3) for composing commit messages.
- Push to the branch (`git push origin feat/your-feature`).
- Open a pull request.

# License

This project is licensed under the GPL v3 License. See the [LICENSE](/LICENSE) file for details.
