// @flow

const { createReporter } = require(`yurnalist`)
const { get } = require(`lodash`)
const path = require(`path`)
const ProgressBar = require(`progress`)
const chalk = require(`chalk`)
const calcElapsedTime = require(`../../../util/calc-elapsed-time`)

const VERBOSE = process.env.gatsby_log_level === `verbose`
const reporter = createReporter({ emoji: true, verbose: VERBOSE })

/**
 * Reporter module.
 * @module reporter
 */
module.exports = {
  /**
   * Toggle verbosity.
   * @param {boolean} [isVerbose=true]
   */
  setVerbose(isVerbose = true) {
    reporter.isVerbose = !!isVerbose
  },
  /**
   * Turn off colors in error output.
   */
  setColors() {},

  success: reporter.success.bind(reporter),
  error: details => {
    const origError = get(details, `error.message`, null)

    let locString = details.filePath
      ? path.relative(process.cwd(), details.filePath)
      : null

    if (locString) {
      const lineNumber = get(details, `location.start.line`, null)
      if (lineNumber) {
        locString += `:${lineNumber}`
        const columnNumber = get(details, `location.start.column`, null)
        if (columnNumber) {
          locString += `:${columnNumber}`
        }
      }
    }

    const text = `${details.id ? chalk.red(`#${details.id} `) : ``}${
      details.type ? `${chalk.red(details.type)} ` : ``
    }${origError ? origError : ``}\n\n${details.text}${
      locString ? `\n\nFile: ${chalk.blue(locString)}` : ``
    }${
      details.docsUrl
        ? `\n\nSee our docs page for more info on this error: ${details.docsUrl}`
        : ``
    }`

    reporter.error(text)
  },
  verbose: reporter.verbose.bind(reporter),
  info: reporter.info.bind(reporter),
  warn: reporter.warn.bind(reporter),
  log: reporter.log.bind(reporter),

  createActivity: activity => {
    let start

    if (activity.type === `spinner`) {
      const spinner = reporter.activity()
      let status

      return {
        update: newState => {
          if (newState.startTime) {
            start = newState.startTime
            spinner.tick(activity.id)
          }
          if (newState.status) {
            status = newState.status
            spinner.tick(`${activity.id} — ${newState.status}`)
          }
        },
        done: () => {
          const str = status
            ? `${activity.id} — ${calcElapsedTime(start)} — ${status}`
            : `${activity.id} — ${calcElapsedTime(start)}`
          reporter.success(str)
          spinner.end()
        },
      }
    }

    if (activity.type === `progress`) {
      const bar = new ProgressBar(
        ` [:bar] :current/:total :elapsed s :percent ${activity.id}`,
        {
          total: 0,
          width: 30,
          clear: true,
        }
      )
      return {
        update: newState => {
          if (newState.startTime) {
            start = newState.startTime
          }
          if (newState.total) {
            bar.total = newState.total
          }
          if (newState.current) {
            bar.tick()
          }
        },
        done: () => {
          reporter.success(
            `${activity.id} — ${bar.curr}/${bar.total} - ${calcElapsedTime(
              start
            )} s`
          )
        },
      }
    }

    return {
      update: () => {},
      done: () => {},
    }
  },
}
