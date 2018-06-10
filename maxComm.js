const dgram = require('dgram')
const Logger = require('./logger');
const EventEmitter = require('events').EventEmitter;

log = new Logger();

class MaxComm extends EventEmitter {
    constructor(){
        super();
        this.detect = new EventEmitter();
        this.udp = dgram.createSocket('udp4');
        this.udp.on('error', (e) => {
            log.error(e)
        });
        this.detect.on('newDev', dev => this.sendDeviceStatus(dev, 'newDevice'));
        this.detect.on('tmt', dev => this.sendDeviceStatus(dev, 'tmt'));
        this.detect.on('reconnected', dev => this.sendDeviceStatus(dev, 'reconnected'));
        this.detect.on('namechanged', dev => this.sendDeviceStatus(dev, 'namechanged'));
    }
    emitEvent(event, args){
        this.detect.emit(event, args);
    }
    sendDeviceStatus(device, status){

        let deviceName = device.name.replace(/\s+/g, '');
        let mess = `${status} ${device.ip} ${device.name}`;
        let out = Buffer.from(mess);

        this.udp.send(out, 10003, '127.0.0.1', (ret) => {
            log.info(`Message: "${mess}" was send to Max`);
        })
    }

}

module.exports = MaxComm;