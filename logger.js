/** Logger Module for Hl-Server
 * @module logger
*/
const winston = require('winston');
const chalk = require('chalk');

if(global.consoleLevel != undefined) global.consoleLevel = 'silly';

/** Logger Class for HL-Project
 * @class HeleniumLogger
*/
class HeleniumLogger {
    /** constructor
     * @param {object} opts options
     * @param {Array/String} opts.logFilename Files to log in
     * @param {Array/String} opts.level Specific logging levels
     * @param {String} opts.consoleLevel Console Log Level
     * @param {String} opts.modulePrefix [Console Log Prefix]
     * @param {any} opts.createStandardWinston create a Standard Winston Logger
     * @param {winstonLogger} opts.winstonLogger custom Logger
    */
    constructor(opts) {
        this.levels = {
            error: 0,
            warn: 1,
            note: 2,
            info: 3,
            silly: 4,
        };

        this.outputSilent = false;

        if (opts != undefined) {
            if (opts.hasOwnProperty('consoleLevel')) {
                this.consoleLevel = opts.consoleLevel;
            } else {
                this.consoleLevel = 'silly';
            }
            if (opts.hasOwnProperty('winstonLogger')) {
                this.winslog = opts.winstonLogger;
                this.winslog.info('Winston Logger loaded');
            }
            if (opts.hasOwnProperty('modulePrefix')) {
                this.modulePrefix = opts.modulePrefix;
            } else this.modulePrefix = chalk.grey('[LOG]');

            if (opts.hasOwnProperty('createStandardWinston')) {
                this.winslog = winston.createLogger({
                    transports: [
                        new winston.transports.File({
                            filename: 'hl-server.log',
                        }),
                    ],
                });
            }
            if (opts.hasOwnProperty('logFilename')) {
                let transportFiles = [];

                if (Array.isArray(opts.logFilename)) {
                    for (let i = 0; i < opts.logFilename.length; i++) {
                        transportFiles.push(new winston.transports.File({
                            filename: opts.logFilename[i],
                            level: (opts.hasOwnProperty('level')) ?
                                ((opts.level[i] != undefined) ?
                                    opts.level[i] : 'silly') : 'silly',
                        }));
                    }
                } else {
                    transportFiles = [
                    new winston.transports.File({
                        filename: opts.logFilename,
                        level: (opts.hasOwnProperty('level')) ?
                            opts.level : 'silly',
                    })];
                }

                this.winslog = winston.createLogger({
                    transports: transportFiles,
                    levels: this.levels,
                });
            }
        } else {
            let transportFiles = [
                new winston.transports.File({
                    filename: 'hl-server.log',
                    level: 'silly',
                })];
            this.winslog = winston.createLogger({
                transports: transportFiles,
                levels: this.levels,
            });
            this.consoleLevel = 'silly';
            this.modulePrefix = '[LOG]';
        }
    }

    /** Simply Log a message
     * @param {String} level [info, warning, error]
     * @param {any} message the message
     */
    log(level, message) {
        let msgout = '';

        if (typeof message === 'string') {
            msgout = message;
        } else if (typeof message === 'number') {
            msgout = message;
        } else {
            msgout = '\n' + JSON.stringify(message, null, '\t');
        }
        let raw = msgout;
        let pre = '';

        if (this.hasOwnProperty('modulePrefix')) {
            pre = chalk.bold(this.modulePrefix) + ' ' + pre;
        }

        switch (level) {
            case 'silly':
                pre = pre + ' ' + chalk.magenta('silly:') + ' ';
                msgout = (msgout);
                break;
            case 'debug':
                pre = pre + ' ' + chalk.blue('debug:') + ' ';
                msgout = chalk.blue(msgout);
                break;
            case 'info':
                pre = pre + ' ' + chalk.green('info:') + ' ';
                msgout = chalk.green(msgout);
                break;
            case 'note':
                pre = pre + ' ' + chalk.magenta('notice:') + ' ';
                msgout = chalk.magentaBright(msgout);
                break;
            case 'warn':
                pre = pre + ' ' + chalk.bgYellow.black.bold('warning: ') + ' ';
                msgout = chalk.yellow(msgout);
                break;
            case 'error':
                pre = pre + ' ' + chalk.bold.white.bgRed('error:') + ' ';
                msgout = chalk.red(msgout);
                break;
        }

        if (!(this.outputSilent) &&
            this.levels[level] <= this.levels[this.consoleLevel] &&
                this.levels[level] <= this.levels[global.consoleLevel]) {
            console.log( chalk.grey(getFormattedDate()) + ' '
                                    + pre + ' ' + msgout );
            this.outputSilent = false;
        }

        if (this.hasOwnProperty('winslog')) this.winslog.log(level, raw);
    }

    /** set Console Output Silent
     * @function silent
     * @return {object} this (chainable)
     */
    silent() {
        this.outputSilent = true;
        return this;
    }


    /** Log Message with silly Level
     * @param {any} msg
     */
    silly(msg) {
        this.log('silly', msg);
    }

    /** Log Message with debug Level
     * @param {any} msg
     */
    debug(msg) {
        this.log('debug', msg);
    }

    /** Log Message with verbose Level
     * @param {any} msg
     */
    info(msg) {
        this.log('info', msg);
    }

    /** Log Message with info Level
     * @param {any} msg
     */
    note(msg) {
        this.log('note', msg);
    }

    /** Log Message with warning Level
     * @param {any} msg
     */
    warn(msg) {
        this.log('warn', msg);
    }

    /** Log Message with error Level
     * @param {any} msg
     */
    error(msg) {
        this.log('error', msg);
    }
}

/** Returns Date in Human readable Form
 * @return {String} Date
 */
function getFormattedDate() {
    let date = new Date();

    let month = date.getMonth() + 1;
    let day = date.getDate();
    let hour = date.getHours();
    let min = date.getMinutes();
    let sec = date.getSeconds();

    month = (month < 10 ? '0' : '') + month;
    day = (day < 10 ? '0' : '') + day;
    hour = (hour < 10 ? '0' : '') + hour;
    min = (min < 10 ? '0' : '') + min;
    sec = (sec < 10 ? '0' : '') + sec;

    let str = date.getFullYear() + '-' + month +
    '-' + day + '_' + hour + ':'
    + min + ':' + sec;
    return str;
}

module.exports = HeleniumLogger;
