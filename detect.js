/*
*   Raum++ Auto detection Script
*   (c) Jonas Ohland
*/


dgram = require('dgram');
const Netmask = require('netmask').Netmask;
const internalIP = require('internal-ip');
const chalk = require('chalk');
Logger = require('./logger'); 
const EventEmitter = require('events').EventEmitter;
const devLog = new Logger();


let devices = {};

class Detect extends EventEmitter {
    constructor(opts){
        super();

        this.internalIPObject = internalIP.v4.sync();

        this.cidr = this.internalIPObject.concat('/24');
        this.ipBlock = new Netmask(this.cidr);
        
        this.broadcastIP = this.ipBlock.broadcast;

        this.udp = dgram.createSocket('udp4');
        this.maxComm = dgram.createSocket('udp4');

        this.maxComm.on('error', (err) => {
            devLog.error(err);
        });


        //message handler
        this.udp.on('message', (message, rinfo) =>{


            let numbers = [];
            for(const b of message){
                numbers.push(b);
            }

            
            var str = String.fromCharCode(...numbers);
            devLog.info(`received Message: \'${str}\'`);
            devLog.info('from ip: ' + rinfo.address);
            devLog.info('from port: ' + rinfo.port);

            if(str.slice(0,8) === 'discover'){
                
                let deviceName = str.slice(9);

                //device exists
                if(devices.hasOwnProperty(rinfo.address)){
                    //is online
                    if(devices[rinfo.address].status === 'online'){
                        //changed name
                        if(deviceName !== devices[rinfo.address].name){
                            devLog.warn(`${deviceName} changed Name from ${devices[rinfo.address].name}`);
                            devices[rinfo.address].name = deviceName;
                        }
                        //refresh tmt
                        devices[rinfo.address].tmt.refresh();

                    //timed out before
                    } else if (devices[rinfo.address].status === 'tmt') {
                        //changed name
                        

                        devLog.note(`${deviceName} has reconnected`)
                        if(deviceName !== devices[rinfo.address].name){
                            devLog.warn(`${deviceName} changed Name from ${devices[rinfo.address].name}`);
                            devices[rinfo.address].name = deviceName;
                        }

                        devices[rinfo.address].status = 'online';
                        devices[rinfo.address].tmt.refresh();
                    }  
               
                } else {
                    devices[rinfo.address] = new RaumPPdevice(rinfo.address, deviceName);
                    devices[rinfo.address].on('tmt', (args) => {
                        let mess = Buffer.from(`timeout ${args.name} ${args.ip}`)
                        this.maxComm.send(mess, 10003, '127.0.0.1', () => {
                            devLog.info('Sent Message to Max');
                        });
                    });
                    devLog.note(`new Device ${deviceName}, ip: ${rinfo.address}, connected`);
                }

            }

        });

        this.udp.on('listening', () => {
            const address = this.udp.address();
            this.udp.setBroadcast(true);
            devLog.note(`server listening ${address.address}:${address.port}`);
        });

        if(opts != undefined){
            if(opts.hasOwnProperty('ip')){
                if(isIP(opts.ip)){
                    devLog.note(`provided ${opts.ip} as IP`);
                } else {devLog.warn(`No IP provided, using ${this.broadcastIP}`); opts.ip = this.broadcastIP;} 
            } else {devLog.warn(`No IP provided, using ${this.broadcastIP}`); opts.ip = this.broadcastIP;}
        } else {devLog.warn(`No IP provided, using ${this.broadcastIP}`); opts.ip = this.broadcastIP;}

        this.udp.bind(10001, opts.ip, () =>{
            this.udp.setBroadcast(true);
        }).on('error', (e) => {
            if(e.code = 'EADDRNOTAVAIL'){
                devLog.error('IP Adress invalid');
                return 0;
            }
            devLog.error(e);
        });
        
        
        
        
        
        

    }
    maxNewDevice(name, ip){
        const mess = Buffer.from(`newDevice ${name} ${ip}`);
        this.maxComm.send(mess, 54434, 'localhost', () => {
        });
    }
    
}

function isIP(ipaddress) {  
    if (/^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/.test(ipaddress)) {  
      return (true)  
    }
    return (false)  
  }  

module.exports = Detect;


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