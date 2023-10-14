# ETA - estimated time of arrival

Estimates remaining waiting time, hosted at <https://entorb.net/eta/>

## Use cases

* Standing in a queue
* Waiting for a process to finish
* Book reading finish time
* Exercising (homework or sport)

## Key features

* Mode countdown (target = 0)
* Mode countup (target > 0)
* Display of table and chart of speed over time

## How to use this repository

This tool is coded in plain JavaScript, sources are in `src/`

These external libraries are manually downloaded and placed in `src/lib/` via `scripts/download_libs.sh`

* [Tabulator](https://tabulator.info/) 5.4
* [ECharts](https://echarts.apache.org) 5.4.1

Code quality checks
GitHub Actions are used to perform automated code quality checks upon PR creation. To run it locally:

* `npm ci` to install packages for the actions below
* `npm update` to update the packages versions used below
* `npm run format` to run code style check using Prettier
* `npm run lint` to run static code analysis using ESLint
* `npm test` to run unit tests using Jest
* `npm run testc` to run unit tests using Jest and display code coverage result
* note: tests are written for German timezone

Spell checking via CSpell
See `spelling.json` for custom dictionary

## Credits

* the notification sound `481151__matrixxx__cow-bells-01.wav` is from [freesound.org](https://freesound.org/people/MATRIXXX_/sounds/481151/)
