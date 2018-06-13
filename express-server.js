const express = require('express');
const Logger = require('./logger');
const fileupload = require('express-fileupload');
const fs = require('fs');
const prob = require('prob.js');

const log = new Logger({
    logFilename: 'express.log',
    level: 'warn',
    modulePrefix: '[HTTP]',
})

const app = express();

const filePath = '/Users/jonasohland/raumpp/audio_files';



function expressBuild(dt, max) {

    const server = app.listen(10080, () => {
        log.note(`listening on ${server.address().address}:${server.address().port}`);
    });

    app.on('error', (err) => {
        log.error(err);
    });

    app.use(fileupload());

    app.post('/new', (req, res) => {
        if (!req.files)
            return res.status(400).send('No files were uploaded.');

        let sampleFile = req.files.file;

        let now = new Date();

        let indexstring = fs.readFileSync(filePath + '/index.json', 'utf8');
        let index = JSON.parse(indexstring);

        let newfilePath = '/Users/jonasohland/raumpp/audio_files/'.concat(Date.now().toString() + '_' + now.getMilliseconds() + '.mp3');
        index.fileArray.unshift(newfilePath);
        indexstring = JSON.stringify(index);

        sampleFile.mv(newfilePath, function (err) {
            if (err) return res.status(500).send(err);
            res.send('File uploaded! ' + sampleFile.name);
            log.note('File uploaded! ' + sampleFile.name);
        });

        fs.writeFileSync(filePath + '/index.json', indexstring, 'utf8');

    });

    app.get('/get', (req, res) => {
        log.note('served file');
        res.sendFile(getnewfile());

    });
}



function getnewfile(){

    let indexstring = fs.readFileSync(filePath + '/index.json', 'utf8');
    let index = JSON.parse(indexstring);
    let dist = prob.zipf(2, (index.fileArray.length > 0) ? index.fileArray.length : 1);
    let n = dist();
    log.note(n);
    log.note(index.fileArray[n-1]);

    return(index.fileArray[n-1]);
    
}


module.exports = expressBuild;