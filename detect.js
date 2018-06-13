/*
*   Raum++ Auto detection Script
*   (c) Jonas Ohland
*
*   listens on 10001, sends on 10003
*/


const dgram = require('dgram');
const Netmask = require('netmask').Netmask;
const internalIPFinder = require('internal-ip');
const chalk = require('chalk');
const Logger = require('./logger'); 
const EventEmitter = require('events').EventEmitter;
const log = new Logger();


class Detect extends EventEmitter {
    constructor(opts){
        super();

        this.devices = {};

        this.internalIP = internalIPFinder.v4.sync();

        this.cidr = this.internalIP.concat('/24');
        this.ipblock = new Netmask(this.cidr);
        
        this.udp = dgram.createSocket('udp4');
        this.answer = dgram.createSocket('udp4');

        this.localudp = dgram.createSocket('udp4');

        // collect messages from local and broadcast socket
        this.messbridge = new EventEmitter();
        this.udp.on('message', (mess, address) => {
            this.messbridge.emit('message', mess, address);
        });
        this.localudp.on('message', (mess, address) => {
            this.messbridge.emit('message', mess, address);
        })
        

        //message handler
        //from clients <--
        this.messbridge.on('message', (mess, rinfo) =>{

            let str = stringfromUdpBuffer(mess);

            log.silly(`received Message: \'${str}\' from: ${rinfo.address} ond Port: ${rinfo.address} Device:`);
            if (this.devices.hasOwnProperty(rinfo.address)) log.silly(this.devices[rinfo.address].name);

            // discovery message
            if(str.slice(0,8) === 'discover'){
                
                let deviceName = str.slice(9);

                //device exists
                if(this.devices.hasOwnProperty(rinfo.address)){
                    //is online
                    if(this.devices[rinfo.address].status === 'online'){
                        //changed name
                        if(deviceName !== this.devices[rinfo.address].name){
                            log.warn(`${deviceName} changed Name from ${this.devices[rinfo.address].name}`);
                            this.devices[rinfo.address].name = deviceName;
                            // to max -->
                            this.emit('namechanged', this.devices[rinfo.address]);
                        }
                        //refresh tmt
                        this.devices[rinfo.address].tmt.refresh();

                    //timed out before
                    } else if (this.devices[rinfo.address].status === 'tmt') {
                        //changed name
                        if(deviceName !== this.devices[rinfo.address].name){
                            log.warn(`${deviceName} changed Name from ${this.devices[rinfo.address].name}`);
                            this.devices[rinfo.address].name = deviceName;
                            // to max -->
                            this.emit('namechanged', this.devices[rinfo.address]);
                        }
                        //refresh tmt and status
                        this.devices[rinfo.address].status = 'online';
                        this.devices[rinfo.address].tmt.refresh();
                        log.note(`${deviceName} has reconnected`);
                        // to max -->
                        this.emit('reconnected', this.devices[rinfo.address]);
                    }  
               
                } else {
                    this.devices[rinfo.address] = new RaumPPdevice(rinfo.address, deviceName);
                    this.devices[rinfo.address].on('tmt', (args) => {
                        let mess = Buffer.from(`timeout ${args.name} ${args.ip}`)
                        // to max -->
                        this.emit('tmt', this.devices[rinfo.address]);
                    });
                    log.note(`new Device ${deviceName}, ip: ${rinfo.address}, connected`);
                    this.emit('newDev', this.devices[rinfo.address]);
                }
                this.answer.send(Buffer.from('server'), 10011, rinfo.address, (err, bytes) => {
                    if(err) return log.error(err);
                    log.silly(`answered ${bytes} bytes`);
                });
                //answer 

            } else if(str === 'recorded' || str === 'encoded' || str === 'uploaded') {
                if(this.devices.hasOwnProperty(rinfo.address)){
                    // to max -->
                    this.emit(str, this.devices[rinfo.address]);
                    let name = this.devices[rinfo.address].name;
                    switch(str){
                        case 'recorded' : 
                            log.note(`${name} finished recording, starts encoding`);
                            break;
                        case 'encoded' : 
                            log.note(`${name} finished encoding, will upload`);
                            break;
                        case 'uploaded' :
                            log.note(`${name} finished uploading`);
                    } 
                }
            } else if(str.slice(0, 4) === 'data') {
                if(this.devices.hasOwnProperty(rinfo.address)){
                    this.emit('data', mess, this.devices[rinfo.address]);
                    log.silly('data sent to max-comm');
                }
            }

        });


        // binding n shit
        this.udp.on('listening', () => {
            const address = this.udp.address();
            this.udp.setBroadcast(true);
            log.note(`server listening ${address.address}:${address.port}`);
        });

        this.localudp.on('listening', () => {
            const address = this.localudp.address();
            this.udp.setBroadcast(true);
            log.note(`server listening ${address.address}:${address.port}`);
        });

        this.udp.bind(10001, this.ipblock.broadcast, () =>{
            this.udp.setBroadcast(true);
        }).on('error', (e) => {
            if(e.code = 'EADDRNOTAVAIL'){
                log.error('IP Adress not available');
                return 0;
            }
            log.error(e);
        });

        this.localudp.bind(10001, this.internalIP, () => {

        }).on('error', (e) => {
            if(e.code = 'EADDRNOTAVAIL'){
                log.error('IP Adress not available');
                return 0;
            }
            log.error(e);
        });


        this.maxComm = new EventEmitter();
        this.maxComm.on('data', packet => {
            let raw = stringfromUdpBuffer(packet);
            let str = raw.slice(5);
            let targetDevice = this.deviceFromMessage(str);
            if(targetDevice != undefined){
                log.silly(targetDevice.name);
                str = str.slice(targetDevice.name.length);
                log.silly(`attempting to send to ${targetDevice.ip}`);
                this.answer.send(Buffer.from('data' + str), 10011, targetDevice.ip, () => {
                    log.silly('packet sent to client');
                });
            }
            
        });



    }
    emitEvent(event, args){
        this.maxComm.emit(event, args);
    }

    deviceFromMessage(message){ 
        let deviceOut;
        Object.keys(this.devices).forEach((deviceId)=> {

            if(message.indexOf(this.devices[deviceId].name) === 0){
                deviceOut = this.devices[deviceId];
            }
        });
        return deviceOut;
    }

}

function isIP(ipaddress) {  
    if (/^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/.test(ipaddress)) {  
      return (true)  
    }
    return (false)  
  }  

module.exports = Detect;

function stringfromUdpBuffer(buf){
    let numbers = [];
    for(const b of buf){
        numbers.push(b);
    }
    return String.fromCharCode(...numbers);
}

class RaumPPdevice extends EventEmitter {
    constructor(ip, name){


        super();
        this.ip = ip;
        this.name = name;
        this.status = 'online';   

        this.tmt = setTimeout(() => {
            this.status = 'tmt';
            log.warn(`${this.name} timed out`);
            this.emit('tmt', {
                name: this.name,
                ip: this.ip,
            });
        }, 5000);

    }
    getPrettyStatus(){
        switch(this.status){
            case 'online':
                return chalk.green('online');
                break;
        }
    }
}