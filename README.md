# ETA - estimated time of arrival

Estimates remaining waiting time, hosted at https://entorb.net/eta/

## Use cases
* Standing in a queue
* Waiting for a process to finish
* Estimate when you finish your current book

## Key features
* Mode countdown (target = 0)
* Mode countup (target > 0)
* Table and chart of speed over time

## How to use this repo
These external libraries are manually downloaded and placed in `src/lib/` via `scripts/download_libs.sh`
* [Tabulator](https://tabulator.info/) 5.4
* [ECharts](https://echarts.apache.org) 5.4.1

Code quality checks
GitHub Actions are used to perform code quality checks upon PR creation. To run it locally:
* `npm ci` to install packages for the actions below
* `npm update` to update the packages versions used below
* `npm run format` to run code style check using Prettier
* `npm run lint` to run static code analysis using ESLint
* `npm test` to run unit tests using Jest
* `npm run testc` to run unit tests using Jest and display code coverage result
* note: tests are written for German timezone
