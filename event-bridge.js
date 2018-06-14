class EventBridge {
    constructor(detect, max){
        
        this.detect = detect;
        this.max = max;

        detect.on('tmt', args => max.emitEvent('tmt', args));
        detect.on('reconnected', args => max.emitEvent('reconnected', args));
        detect.on('namechanged', args => max.emitEvent('namechanged', args));
        detect.on('newDev', args => max.emitEvent('newDev', args));
        detect.on('data', (buffer, device) => max.emitEvent('data', buffer, device));
        detect.on('encoded', args => max.emitEvent('encoded', args));
        detect.on('recorded', args =>max.emitEvent('recorded', args));
        detect.on('uploaded', args => max.emitEvent('uploaded', args));

        max.on('closed', args => detect.emitEvent('tmt', args));
        max.on('data', packet => detect.emitEvent('data', packet));
    }
}

module.exports = EventBridge;