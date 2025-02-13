# ClientHub

Monorepo for all MellonPass client applications (websites, SPAs, mobiles, and shared packages).

## Table of Contents

- [Getting Started](#getting-started)
- [Project Structure](#project-structure)
- [Scripts](#scripts)
- [Contributing](#contributing)
- [License](#license)

# Getting started

### Prerequisites

Make sure you have the following installed on your machine:

- [node](https://nodejs.org/) (>= 18.x)
- [npm](https://www.npmjs.com/) (>= 9.x)

### Installation

1. Cloning the repository:

    ```sh
    git clone git@github.com:mellonpass/clienthub.git
    ```

1. Installing dependencies:

    ```sh
    npm i --only=dev -w <workspace/path>
    ```

    If you want to run the web application:

    ```sh
    npm i --only=dev -w apps/web
    ```

### Running the applications

```sh
npm run <script> -w <workspace/path>
```

See [Scripts](#scripts) for more details.

# Project structure

```sh
clienthub/
├── apps/
│   ├── web/
│   └── ...
├── .gitignore
├── LICENSE
├── package-lock.json
├── package.json
├── README.md
```

- `apps/`: Contains all the applications.
    - `web/`: The web application.

# Scripts

The following scripts are available in the root package.json:

- `npm run dev -w apps/web`: Start the development web server.
- `npm run check:watch -w apps/web`: Start the realtime svelte-check diagnostics.

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
