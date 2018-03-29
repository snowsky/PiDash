var winston = require('./Logger');
var logger = winston.logger;
var piDashApp = require('../content/js/PiDashApp')

const {exec} = require('child_process');

/* Stores process information for spawned processes */
var processes = new Object();

/* Timeout for killing child process's */
var killTimeout = 3000;

/* Function for listening to shell outputs */
function listenToProcess(process) {
    logger.log('Debug', "Started listening Pid" + process.pid);

    process.process.stdout.on('data', function(data) {
        logger.log('debug', "Writing to process, Pid: " + process.process.pid + " Command: " + data.toString());
        process.writeOut(data.toString());
        logger.log('debug', data.toString());

    });

    process.process.stderr.on('data', function(data) {
        process.writeErr(data.toString());
        logger.log('debug', data.toString());
    });

    process.process.on('close', function(code) {
        process.writeClose("Process closed, Pid: " + process.pid + " Exit code: " + code);
        logger.log('debug', code);
    });

}

var spawnProcess = function(command, callback) {
    var childProcess = exec(command);

    var pid = childProcess.pid;
    var newProcess = new piDashApp.Process(childProcess,false);
    processes[pid] = newProcess;

    listenToProcess(newProcess);
    if(callback)
        callback(newProcess);
};

var killProcess = function(pid, callback) {
    var command = "pkill -P " + pid;
    logger.debug("Killing process, Pid: " + pid);
    var childProcess = exec(command,function(error,stdout,stderr){
        var result = new Object();
        if(error) {
            logger.debug("Child process not killed")
        }

        var parentCommand = "kill " + pid;
        var parentProcess = exec(parentCommand,function(error,stdout,stderr) {
            if(error) {
                logger.debug("Error killing parent process Pid: " + pid);
                result.status = "Error";
                result.message = "Error killing parent";
            }
            else {
                logger.debug("Process killed Pid: " + pid);
                result.status = "Success";
                result.message = "Process killed";
            }
            callback(result);
        });
    });
};

module.exports = {
    listenToProcess: listenToProcess,
    spawnProcess: spawnProcess,
    killProcess: killProcess,
    processes: processes
};