'use strict';
const crypto = require('crypto');
const winston = require('./Logger');
const server = require('./Server');
const provider = require('./providers/CredentialProvider');
const globals = require('./Globals');

var logger = winston.logger;
var app = server.app;
var sessionTimeout = 30 * 60 * 1000;
/* Default to 30 minutes */
var session = require('client-sessions');
var helmet = require('helmet');

var invalidRedirectPath = "/";
var adminCode = "Granted";
app.use(helmet());

app.use(session({
    cookieName: 'session',
    secret: globals.sessionConfig.secret,
    genid: function (req) {
        return sha512(genRandomString(16), genRandomString(16)).passwordHash;
    },
    duration: globals.sessionConfig.sessionTimeout,
    activeDuration: globals.sessionConfig.activeDuration
}));

app.use(function (req, res, next) {
    res.locals.messages = {"errors":[],"success":[]};
    res.locals.messages.errors = [];
    res.locals.messages.success = [];
    res.locals.admin = false;

    if (req.session && req.session.user) {
        req.user = req.session.user;
        req.userId = req.session.userId;
        req.sessionID = req.session.sessionToken;
        res.locals.user = req.session.user;
        if (req.session.admin) {
            req.admin = req.session.admin;
            res.locals.admin = true;
        }
    }
    next();
});

/* Determines if a username is in the database */
function validUser(req, res, next) {
    provider.getCredentialsByUserName(req.body.UserName, function (response) {
        if (response.status === provider.Statuses.Error || response.results.length == 0) {
            return next(false);
        }
        else
            return next(true);
    });
}

function validateUserPassword(userPassword, passwordHash, salt) {
    var userHashed = sha512(userPassword, salt).passwordHash;

    if (userHashed === passwordHash) {
        logger.info("Valid creds");
        return true;
    }

    logger.error("Invalid creds");
    return false;
}

function requireLogon(req, res, next) {
    if (req.user)
        next();
    else
        res.redirect(invalidRedirectPath);
}

function requireAdmin(req, res, next) {
    requireLogon(req, res, function () {
        winston.logSession(req.sessionID, "Admin validation required", 'debug');

        provider.getAdminByUserName(req.user, function(result) {
            if(result.status === provider.Statuses.Error || !result.firstResult || result.firstResult.Active == 0) {
                winston.logSession((req.sessionID, "Admin validation failed"), 'debug');
                res.redirect(invalidRedirectPath);
            }
            else {
                winston.logSession(req.sessionID, "Admin validation successful", 'debug');
                next();
            }
        });
    });
}

/* https://github.com/SpaceG/salt-hash-password */
/**
 *  * generates random string of characters i.e salt
 *   * @function
 *    * @param {number} length - Length of the random string.
 *     */
function genRandomString(length) {
    return crypto.randomBytes(Math.ceil(length / 2))
        .toString('hex') /** convert to hexadecimal format */
        .slice(0, length);
    /** return required number of characters */
}

/**
 *  * hash password with sha512.
 *   * @function
 *    * @param {string} password - List of required fields.
 *     * @param {string} salt - Data to be validated.
 *      */
function sha512(password, salt) {
    var hash = crypto.createHmac('sha512', salt);
    /** Hashing algorithm sha512 */
    hash.update(password);
    var value = hash.digest('hex');
    return {
        salt: salt,
        passwordHash: value
    };
}

function getRandomString(length) {
    return crypto.randomBytes(Math.ceil(length / 2))
        .toString('hex') /** convert to hexadecimal format */
        .slice(0, length);
    /** return required number of characters */
}

function saltHashPassword(userpassword) {
    var salt = genRandomString(16);
    /** Gives us salt of length 16 */
    var passwordData = sha512(userpassword, salt);
    return passwordData;
}

/* TODO: Add password requirements */
var validPassword = function(password){
    return true;
};

    module.exports = {
    adminCode: adminCode,
    validUser: validUser,
    validateUserPassword: validateUserPassword,
    requireLogon: requireLogon,
    requireAdmin: requireAdmin,
    genRandomString: getRandomString,
    sha512: sha512,
    getRandomString: getRandomString,
    saltHashPassword: saltHashPassword,
    validPassword: validPassword
};
