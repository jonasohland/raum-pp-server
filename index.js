const Logger = require('./logger');
const Detect = require('./detect');

const listen_ip = process.argv[2];

global.consoleLevel = 'note';
const log = new Logger({
    logFilename: 'dings.log',
});

log.info('hello');

const dt = new Detect({
    ip:listen_ip
});

dt.on('event', () => {
    log.info('event happened');
});
