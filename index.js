const Logger = require('./logger');
const Detect = require('./detect');
const Max = require('./maxComm');
const EventBridge = require('./event-bridge');
const expressBuild = require('./express-server');
const EventEmitter = require('events').EventEmitter;

const listen_ip = process.argv[2];

global.consoleLevel = 'note';
const log = new Logger({
    logFilename: 'dings.log',
    level: 'error',
});

const dt = new Detect({
    ip:listen_ip
});

const max = new Max();
const bridge = new EventBridge(dt, max);

expressBuild(dt, max);