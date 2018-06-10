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
const devLog = new Logger();


class Detect extends EventEmitter {
    constructor(opts){
        super();

        this.devices = {}
        this.internalIp = internalIPFinder.v4.sync();

        this.cidr = this.internalIp.concat('/24');
        this.ipblock = new Netmask(this.cidr);
        
        this.udp = dgram.createSocket('udp4');
        this.answer = dgram.createSocket('udp4');

        this.localudp = dgram.createSocket('udp4');

        this.messbridge = new EventEmitter();

        this.udp.on('message', (mess, address) => {
            this.messbridge.emit('message', stringfromUdpBuffer(mess), address);
        });
        this.localudp.on('message', (mess, address) => {
            this.messbridge.emit('message', stringfromUdpBuffer(mess), address);
        })
        

        //message handler
        this.messbridge.on('message', (str, rinfo) =>{

            devLog.info(`received Message: \'${str}\'`);
            devLog.info('from ip: ' + rinfo.address);
            devLog.info('from port: ' + rinfo.port);

            if(str.slice(0,8) === 'discover'){
                
                let deviceName = str.slice(9);

                //device exists
                if(this.devices.hasOwnProperty(rinfo.address)){
                    //is online
                    if(this.devices[rinfo.address].status === 'online'){
                        //changed name
                        if(deviceName !== this.devices[rinfo.address].name){
                            devLog.warn(`${deviceName} changed Name from ${this.devices[rinfo.address].name}`);
                            this.devices[rinfo.address].name = deviceName;
                            this.emit('namechanged', this.devices[rinfo.address]);
                        }
                        //refresh tmt
                        this.devices[rinfo.address].tmt.refresh();

                    //timed out before
                    } else if (this.devices[rinfo.address].status === 'tmt') {
                        //changed name
                        if(deviceName !== this.devices[rinfo.address].name){
                            devLog.warn(`${deviceName} changed Name from ${this.devices[rinfo.address].name}`);
                            this.devices[rinfo.address].name = deviceName;
                            this.emit('namechanged', this.devices[rinfo.address]);
                        }
                        //refresh tmt and status
                        this.devices[rinfo.address].status = 'online';
                        this.devices[rinfo.address].tmt.refresh();
                        devLog.note(`${deviceName} has reconnected`);
                        this.emit('reconnected', this.devices[rinfo.address]);
                    }  
               
                } else {
                    this.devices[rinfo.address] = new RaumPPdevice(rinfo.address, deviceName);
                    this.devices[rinfo.address].on('tmt', (args) => {
                        let mess = Buffer.from(`timeout ${args.name} ${args.ip}`)
                        this.emit('tmt', this.devices[rinfo.address]);
                    });
                    devLog.note(`new Device ${deviceName}, ip: ${rinfo.address}, connected`);
                    this.emit('newDev', this.devices[rinfo.address]);
                }
                this.answer.send(Buffer.from('server'), 10011, rinfo.address, (err, bytes) => {
                    if(err) return log.error(err);
                    log.silly(`answered ${bytes} bytes`);
                });
                //answer 

            } else if(str = 'rec') {
                if(this.devices.hasOwnProperty(rinfo.address)){
                    this.emit('recording', this.devices[rinfo.address]);
                    log.note(`${this.devices[rinfo.address].name} started recording`);
                }
            }

        });

        this.udp.on('listening', () => {
            const address = this.udp.address();
            this.udp.setBroadcast(true);
            devLog.note(`server listening ${address.address}:${address.port}`);
        });

        this.localudp.on('listening', () => {
            const address = this.localudp.address();
            this.udp.setBroadcast(true);
            devLog.note(`server listening ${address.address}:${address.port}`);
        });

        this.udp.bind(10001, this.ipblock.broadcast, () =>{
            this.udp.setBroadcast(true);
        }).on('error', (e) => {
            if(e.code = 'EADDRNOTAVAIL'){
                devLog.error('IP Adress invalid');
                return 0;
            }
            devLog.error(e);
        });

        this.localudp.bind(10001, this.internalIp, () => {

        }).on('error', (e) => {
            if(e.code = 'EADDRNOTAVAIL'){
                devLog.error('IP Adress invalid');
                return 0;
            }
            devLog.error(e);
        });

        this.maxComm = new EventEmitter();

    }
    emitEvent(event, args){
        this.maxComm.emit(event, args);
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
            devLog.warn(`${this.name} timed out`);
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