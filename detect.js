dgram = require('dgram');


Logger = require('./logger'); 
const EventEmitter = require('events').EventEmitter;

let onlineDevices = {};

class Detect extends EventEmitter {
    constructor(opts){
        super();
        this.log = new Logger({
            modulePrefix: '[DETECT]',
        });
        

        this.udp = dgram.createSocket('udp4');
        this.udp.on('message', (message, rinfo) =>{


            let numbers = [];
            for(const b of message){
                numbers.push(b);
            }

            this.log.info('received Message');
            this.log.info('from ip: ' + rinfo.address);
            this.log.info('from port: ' + rinfo.port);
            var str = String.fromCharCode(...numbers).slice(0,-2);

            if(str.slice(0,8) === 'discover'){
                
                let deviceName = str.slice(9);
                this.log.note(`device ${deviceName} still Online`);
                this.maxNewDevice(deviceName, rinfo.address);

            }
            

        });

        this.udp.on('listening', () => {
            const address = this.udp.address();
            this.log.note(`server listening ${address.address}:${address.port}`);
        });

        if(opts != undefined){
            if(opts.hasOwnProperty('ip')){
                if(isIP(opts.ip)){
                    this.log.note(`provided ${opts.ip} as IP`);
                } else {this.log.warn('No IP provided, using 0.0.0.0'); opts.ip = '0.0.0.0';} 
            } else {this.log.warn('No IP provided, using 0.0.0.0'); opts.ip = '0.0.0.0';}
        } else {this.log.warn('No IP provided, using 0.0.0.0'); opts.ip = '0.0.0.0';}

        this.udp.bind(3310, opts.ip, () =>{

        }).on('error', (e) => {
            if(e.code = 'EADDRNOTAVAIL'){
                this.log.error('IP Adress invalid');
                return 0;
            }
            this.log.error(e);
        });
        
        this.maxComm = dgram.createSocket('udp4');

        this.maxComm.on('error', (err) => {
            this.log.error(err);
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