var winston = require('./Logger');
var logger = winston.logger;
var server = require('./Server');
var app = server.app;
var provider = require('./Provider');
var validation = require('./Validation');


app.get("/LogonRegister", function (req, res) {
    res.redirect("/LogonRegister/Logon");
});

app.get("/LogonRegister/Logon", function (req, res) {
    res.render("logon");
});

app.post("/LogonRegister/Logon", function (req, res) {
    logger.log('debug', "Validation started, UserName: " + req.body.UserName);
    provider.getCredentialsByUserName(req.body.UserName, function (returnObject) {
        if (returnObject.status === provider.Statuses.Error || returnObject.results.length < 1) {
            logger.error("User not found, UserName: " + req.body.UserName);
            res.locals.messages.errors.push("Invalid Credentials");
            res.render("logon");
        }
        else {
            if (validation.validateUserPassword(req.body.Password, returnObject.results[0].Hash, returnObject.results[0].Salt)) {
                req.session.user = req.body.UserName;
                req.session.userId = returnObject.firstResult.UserId;
                req.body.user = req.body.UserName;
                provider.getAdminByUserName(req.body.UserName, function (returnObject) {
                    if (returnObject.Status !== provider.Statuses.Error && returnObject.results.length > 0) {
                        req.session.admin = validation.adminCode;
                    }

                    res.locals.messages.success.push("Logon Successful");
                    res.redirect("/");
                });
            }
            else {
                res.locals.messages.errors.push("Invalid Credentials");
                res.render("logon");
            }
        }
    });
});

app.get("/LogonRegister/Register", function (req, res) {
    res.render("register");
});

app.post("/LogonRegister/Register", function (req, res) {
    logger.log('debug', "Registration started, UserName: " + req.body.UserName);
            provider.addUserToUsersTable(req.body.UserName, req.body.PrimaryEmailAddress, req.body.FirstName, req.body.MiddleName, req.body.LastName, req.body.BirthDay, req.body.BirthMonth, req.body.BirthYear, function (result) {
                if (result.status === provider.Statuses.Error) {
                    logger.error("Error registering user Error message: " + result.message);
                    logger.error("Unable to create user credentials, registration failed");
                    res.locals.messages.errors.push(result.message);
                    res.render("register");
                    return;
                }
                else {
                    console.info("User registered, UserName: " + req.body.UserName);
                    var saltHash = validation.saltHashPassword(req.body.Password);
                    provider.addCredentialsByUserName(req.body.UserName, saltHash.passwordHash, saltHash.salt, function (result) {
                        if (result.status === provider.Statuses.Error) {
                            logger.error("Unable to create user credentials, registration failed");
                            res.locals.messages.errors.push(result.message);
                            res.render("register.ejs");
                            return;
                        }
                        else {
                            res.locals.messages.success.push("Registration Successful");
                            res.render("logon");
                        }

                    });

                }
            });
});

app.get("/LogonRegister/User", validation.requireLogon, function(req,res) {
    var response = new Object();
    response.userName = req.user;
    response.userId = req.userId;
    res.json(response);
});


app.post("/LogonRegister/User", validation.requireLogon, function(req,res) {

    if(req.body.UserId) {
        provider.getUserByUserId(req.body.UserId,function(result) {
            if(result.status === provider.Statuses.Error || result.results.length < 1) {
                logger.error("/LogonRegister/User: Error getting user details");
                res.json({status:'error'});
            }
            else {
                var response = new Object();
                response.userName = result.firstResult.UserName;
                response.userId = req.body.UserId;
                res.json(response);
            }
        });
    }
    else if(req.body.UserName) {
        provider.getUserByUserName(req.body.UserName,function(result) {
            if(result.status === provider.Statuses.Error || result.results.length < 1) {
                logger.error("/LogonRegister/User: Error getting user details");
                res.json({status:'error'});
            }
            else {
                var response = new Object();
                response.userName = req.body.UserName;
                response.userId = result.firstResult.UserId;
                res.json(response);
            }
        });
    }
    else {
        res.json({status:"error"});
    }
});
