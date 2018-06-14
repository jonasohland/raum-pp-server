const dgram = require('dgram')
const Logger = require('./logger');
const EventEmitter = require('events').EventEmitter;

log = new Logger({
    modulePrefix:'[LOCAL]',
});

class MaxComm extends EventEmitter {
    constructor(){
        super();
        this.detect = new EventEmitter();
        this.udp = dgram.createSocket('udp4');
        this.maxin = dgram.createSocket('udp4');

        this.maxin.on('message', (packet) => {
            let message = stringfromUdpBuffer(packet);
            if(message.slice(0, 4) === 'data'){
                log.silly('data from Max');
                this.emit('data', packet);
            }
        });

        this.maxin.on('listening', () => {
            log.note('listening to Max on Port 32323');
        })

        this.maxin.bind(32323);

        this.udp.on('error', (e) => {
            log.error(e)
        });

        this.detect.on('newDev', dev => this.sendDeviceStatus(dev, 'online'));
        this.detect.on('tmt', dev => this.sendDeviceStatus(dev, 'tmt'));
        this.detect.on('reconnected', dev => this.sendDeviceStatus(dev, 'reconnected'));
        this.detect.on('namechanged', dev => this.sendDeviceStatus(dev, 'namechanged'));
        this.detect.on('recorded', dev => this.sendDeviceStatus(dev, 'recorded'));
        this.detect.on('encoded', dev => this.sendDeviceStatus(dev, 'encoded'));
        this.detect.on('uploaded', dev => this.sendDeviceStatus(dev, 'uploaded'));
        this.detect.on('data', (buf, device) => this.sendDataBuffer(buf, device));
    }

    emitEvent(event, args, moreargs){
        this.detect.emit(event, args, moreargs);
    }

    sendDeviceStatus(device, status){

        let deviceName = device.name.replace(/\s+/g, '');
        let mess = `${device.name} ${status} ${device.ip}`;
        let out = Buffer.from(mess);

        this.udp.send(out, 32324, '127.0.0.1', (ret) => {
            log.silly(`Message: "${mess}" was send to Max`);
        })
    }
    sendDataBuffer(buf, device){

        let str = stringfromUdpBuffer(buf);
        str = str.slice(0, -2);
        this.udp.send(Buffer.from(device.name + ' ' + str), 32324, '127.0.0.1', () => {});
    }

}

function stringfromUdpBuffer(buf){
    let numbers = [];
    for(const b of buf){
        numbers.push(b);
    }
    return String.fromCharCode(...numbers);
}


module.exports = MaxComm;