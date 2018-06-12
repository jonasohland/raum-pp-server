const express = require('express');
const Logger = require('./logger');
const fileupload = require('express-fileupload');

const log = new Logger({
    logFilename: 'express.log',
    level: 'warn',
    modulePrefix : '[HTTP]',
})

const app = express();
app.use(fileupload());

app.post('/new', (req, res) => {
    if (!req.files)
        return res.status(400).send('No files were uploaded.');
    let sampleFile = req.files.file;
 
    sampleFile.mv('/Users/jonasohland/raumpp/audio_files/'.concat(Date.now().toString() + '.mp3'), function(err) {
        if (err) return res.status(500).send(err);
        res.send('File uploaded! ' + sampleFile.name);
        log.note('File uploaded! ' + sampleFile.name);
    });
});

function init(){
    const server = app.listen(10080, () => {
        log.note(`listening on ${server.address().address}:${server.address().port}`);
    });
}


module.exports = init;