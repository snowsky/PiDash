//var piDashApp = require('../../content/js/PiDashApp');
angular.module('PiDashApp.ServerManagerController',[])
    .controller('serverManagerController',function($scope, $interval, serverManagerService){
        var refreshRate = 1000; // ms, TODO: abstract this
        $scope.processes = [];
        $scope.apps = [];
        $scope.piDashApps = new Object();
        $scope.activeApp = [];
        $scope.activeAppIndex = 0;
        $scope.command = "";
        $scope.startAppButtonText = "Start App";
        $scope.deleteAppButtonText = "Delete App";
        $scope.userId = "";
        $scope.userName = "";
        var maxNewApps = 100;

        var Statuses = {"Starting":"Starting","Running":"Running","Stopped":"Stopped"};
        var MessageSourceTypes = {"Out": "stdout", "In":"stdin","Error":"stderr","Close": "close"};

        var initialize = function(){
            serverManagerService.getUser(function(res) {
                $scope.userId = res.userId;
                $scope.userName = res.userName;
                $scope.retrieveApps();
            })
        };
        initialize();
        $interval(function(){
            if($scope.activeApp.status === Statuses.Running || $scope.activeApp.status === Statuses.Starting ) {
                $scope.refreshConsole($scope.activeApp);
            }
            },refreshRate);

        var getNextNewAppId = function() {
            var i;
            for(i=-1; i>-maxNewApps; i--) {
                if($scope.piDashApps[i])
                    continue;
                return i;
            }
            return i;
        };

        $scope.setActiveApp = function(index) {
            $scope.activeApp = $scope.piDashApps[index].app;
            if(!$scope.activeApp.messages)
                $scope.activeApp.messages = [];
            if(!$scope.activeApp.status)
                $scope.activeApp.status = Statuses.Stopped;

        };

        $scope.addApplication = function() {
            var newPiDashApp = createDefaultPiDashApp($scope.userName, $scope.userId);
            newPiDashApp.app.appId = getNextNewAppId();
            newPiDashApp.app.name = "New App";
            $scope.piDashApps[newPiDashApp.app.appId] = newPiDashApp;
            $scope.setActiveApp(newPiDashApp.app.appId);
            console.log($scope.apps.length + " " + $scope.activeApp.name);
        };

        $scope.deleteActiveApplication = function(){
            delete $scope.piDashApps[$scope.activeApp.appId];
        };

        $scope.deleteApplication = function(){
            delete $scope.piDashApps[appId];
        };

        var deleteApplication = function(appId){
            delete $scope.piDashApps[appId];
        };

        $scope.saveApplication = function() {
            $scope.apps.push(angular.copy($scope.activeApp));
        };

        $scope.refreshApps = function() {
            $scope.refreshConsoles();
        };

        $scope.refreshConsoles = function() {
            for(var app in $scope.apps) {
                $scope.refreshConsole(app);
            }
        };

        function isStopped(messages) {
            for(var i=0; i<messages.length; i++) {
                console.log(messages[i].Source);
                if(messages[i].Source ===  MessageSourceTypes.Close)
                    return true;
            }
            return false;
        }

        $scope.refreshConsole = function(app) {
            serverManagerService.getConsoleByPid(app.pid,function (response) {
                if(response.Status !== "Error")
                    app.console = formatMessageOutput(response);

                    if(isStopped(response)) {
                        app.status = Statuses.Stopped;
                        $scope.startAppButtonText = "Start App";
                    }
                    else {
                        app.status = Statuses.Running;
                        $scope.startAppButtonText = "Stop App";
                    }

            });
        };

        var spawnProcess = function(app) {
            app.status = Statuses.Starting;
            serverManagerService.spawnProcess(app.startCommand,function (response) {
                app.status = Statuses.Running;
                if (response) {
                    app.pid = response.Pid;
                    $scope.refreshConsole(app);
                }
            });
        };

        var formatMessageOutput = function(messages) {
            var output = "";
            for(var i=0; i<messages.length; i++) {
                output += messages[i].Message + "\n";
            }
            return output;
        };

        $scope.executeCommand = function(app, command, callback) {
            serverManagerService.runCommand(app.pid,command, callback);
        };

        $scope.executeCommandActive = function() {
            $scope.executeCommand($scope.activeApp,$scope.command,function(response) {
                $scope.refreshConsole($scope.activeApp);
            });
        };

        $scope.toggleActiveAppStart = function() {
            if($scope.activeApp.status === Statuses.Stopped) {
                $scope.startActiveApp();
                $scope.startAppButtonText = "Stop App";

            }
            else {
                $scope.stopActiveApp();
                $scope.startAppButtonText = "Start App";
            }
        };

        $scope.startActiveApp = function() {
            spawnProcess($scope.activeApp);

        };

        $scope.stopActiveApp = function() {
            $scope.killApp($scope.activeApp);
        };

        $scope.killApp = function(app) {
            serverManagerService.killProcess(app.pid,function() {
                $scope.refreshConsole(app);
            });
        };

        $scope.retrieveApps2 = function() {
            serverManagerService.getPiDashApp("",function(res) {
                $scope.addApplication();
                var newApp = buildPiDashAppFromResponse(res);
                $scope.piDashApps.push(newApp);
                //$scope.activeApp = newApp;
                //$scope.activeApp.appName = newApp.app.name;
                //$scope.activeApp.startCommand = newApp.app.startCommand;
            });
        };

        $scope.retrieveApps = function() {
            serverManagerService.getPiDashApps(function(res) {
                //$scope.addApplication();
                if(res) {
                    //for(var i=0; i<res.apps.length; i++) {
                        var userApps = buildPiDashAppsFromResponse(res);
                        if(userApps)
                            for( var i in userApps)
                                $scope.piDashApps[userApps[i].app.appId] = userApps[i];
                }

                //$scope.piDashApps.push(newApp);
                //$scope.activeApp = newApp;
                //$scope.activeApp.appName = newApp.app.name;
                //$scope.activeApp.startCommand = newApp.app.startCommand;
            });
        };

        $scope.addPiDashApp = function() {
            alert($scope.activeApp.appName);
            serverManagerService.addPiDashApp($scope.piDashApps[$scope.activeApp.appId], function(res) {
                $scope.activeApp = buildPiDashAppFromResponse(res.app);
                alert("App Added!");
            });
        }


    });