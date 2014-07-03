'use strict';
var util = require('util');
var path = require('path');
var yeoman = require('yeoman-generator');
var yosay = require('yosay');
var chalk = require('chalk');
var sys = require('sys')
var exec = require('child_process').exec;

var userEmail = null;
var userName = null;

function getUserNameAndEmail(callback) {
  // executes `pwd`
  var cmd = "git config --global user.email"
  var child = exec(cmd, function (error, stdout, stderr) {
    if (error == null) {
      userEmail = stdout.replace('\n', '');
    }

    cmd = "git config --global user.name"
    child = exec(cmd, function (error, stdout, stderr) {
      if (error == null) {
        userName = stdout.replace('\n', '');
      }

      callback();
    });
  });
}

function validatePlugins(plugins) {
  var mongoPlugins = (plugins.MongoEngine ? 1 : 0) + (plugins.Motor ? 1 : 0) + (plugins.MotorEngine ? 1 : 0)

  if (mongoPlugins > 1) {
    console.log("Can't have more than one plugin for MongoDB. Choose either Motor, MongoEngine or MotorEngine.");
    return false;
  }

  return true;
}

var currentPath = path.basename(process.cwd());

var TornadoGenerator = yeoman.generators.Base.extend({
  init: function () {
    this.pkg = require('../package.json');
  },

  askFor: function () {
    var done = this.async();

    this.log(yosay('Welcome to the tornado generator\nRun this generator in the folder where your app will be created'));

    var pythonVersions = [
      { name: "Python 2.6", value: "2.6@py26@Python :: 2.6", checked: false },
      { name: "Python 2.7", value: "2.7@py27@Python :: 2.7", checked: true },
      { name: "Python 3.2", value: "3.2@py32@Python :: 3.2", checked: false },
      { name: "Python 3.3", value: "3.3@py33@Python :: 3.3", checked: false },
      { name: "Python 3.4", value: "3.4@py34@Python :: 3.4", checked: true },
      { name: "PyPy", value: "pypy@pypy@Python :: Implementation :: PyPy", checked: true },
    ];

    var services = [
      { name: "Redis", value: "redis", checked: false },
      { name: "MongoDB", value: "mongodb", checked: false }
    ];

    var plugins = [
      { name: "Redis (Sync Redis)", value: "redis", checked: false },
      { name: "Toredis (Async Redis)", value: "toredis", checked: false },
      { name: "Motor (Async MongoDB)", value: "motor", checked: false },
      { name: "MongoEngine (Sync MongoDB ORM)", value: "mongoengine", checked: false },
      { name: "MotorEngine (Async MongoDB ORM)", value: "motorengine", checked: false },
      { name: "Elastic Search", value: "elasticSearch", checked: false },
      { name: "SQL Alchemy", value: "sqlalchemy", checked: false },
    ];

    getUserNameAndEmail(function() {
      var prompts = [{
        type: 'input',
        name: 'packageName',
        message: 'App package name (the name that will be used when sending to pypi):',
        default: currentPath
      }, {
        type: 'input',
        name: 'authorName',
        message: 'App author name',
        default: userName
      }, {
        type: 'input',
        name: 'authorEmail',
        message: 'App author email',
        default: userEmail
      }, {
        type: 'checkbox',
        name: 'pythonVersions',
        message: 'App supported python versions',
        choices: pythonVersions
      }, {
        type: 'input',
        name: 'version',
        message: 'App initial version',
        default: '0.1.0'
      }, {
        type: 'input',
        name: 'description',
        message: 'App description (please be sure to update long_description in setup.py later):',
        default: 'an incredible tornado application'
      }, {
        type: 'input',
        name: 'keywords',
        message: 'App keywords (space separated keywords):'
      }, {
        type: 'input',
        name: 'url',
        message: 'App url (this url gets included in pypi):',
        default: 'https://github.com/someuser/someapp'
      }, {
        type: 'input',
        name: 'license',
        message: 'App license:',
        default: 'MIT'
      }, {
        type: 'checkbox',
        name: 'plugins',
        message: 'Plug-ins you want to use (will be configured for you):',
        choices: plugins
      }, {
        type: 'checkbox',
        name: 'services',
        message: 'Services you need to run',
        choices: services
      }];

      this.prompt(prompts, function (props) {
        var versions = [];
        var travis = [];
        var troves = [];

        for (var i=0; i < props.pythonVersions.length; i++) {
          var parts = props.pythonVersions[i].split('@');
          travis.push(parts[0]);
          versions.push(parts[1]);
          troves.push("Programming Language :: " + parts[2]);
        }

        var pkgServices = {
          mongodb: false,
          redis: false
        };
        for (var i=0; i < props.services.length; i++) {
          switch (props.services[i]) {
            case "mongodb": {
              pkgServices.mongodb = true;
              break;
            }
            case "redis": {
              pkgServices.redis = true;
              break;
            }
          }
        }

        var pkgPlugins = {
          redis: false,
          toredis: false,
          motor: false,
          mongoengine: false,
          motorengine: false,
          elasticSearch: false,
          sqlalchemy: false
        };

        for (var i=0; i < props.plugins.length; i++) {
          pkgPlugins[props.plugins[i]] = true;
        }
        if (!validatePlugins(pkgPlugins)) {
          process.exit(1);
        }

        console.log(pkgPlugins);

        var pythonPackageName = props.packageName.replace(/(\s|-)+/g, '_');

        this.package = {
          name: props.packageName,
          pythonName: pythonPackageName,
          author: {
            name: props.authorName,
            email: props.authorEmail
          },
          description: props.description,
          keywords: props.keywords,
          version: props.version,
          pythonVersions: versions,
          travis: travis,
          troves: troves,
          url: props.url,
          license: props.license,
          includePackageData: props.packageData,
          created: {
            day: new Date().getDay(),
            month: new Date().getMonth() + 1,
            year: new Date().getFullYear()
          },
          services: pkgServices
        };

        done();
      }.bind(this));
    }.bind(this));
  },

  app: function () {
    var pkg = this.package;
    this.mkdir(pkg.pythonName);
    this.mkdir('tests/');

    // root
    this.template('_setup.py', 'setup.py');
    this.template('_makefile', 'Makefile');
    this.template('_coveragerc', '.coveragerc');
    this.template('_tox.ini', 'tox.ini');
    this.template('_gitignore', '.gitignore');
    this.template('_travis.yml', '.travis.yml');

    if (pkg.services.redis) {
      this.template('_redis.conf', 'redis.conf');
      this.template('_redis_tests.conf', 'redis.tests.conf');
    }

    // pkg.name/
    this.template('_root_init.py', pkg.pythonName + '/__init__.py');
    this.template('_version.py', pkg.pythonName + '/version.py');

    // tests/
    this.template('_init.py', 'tests/__init__.py');
    this.template('_test_base.py', 'tests/base.py');
    this.template('_test_version.py', 'tests/test_version.py');
  },

  getUsageMessage: function() {
    var pkg = this.package;
    this.log("\n\nNow that your project is all created, here is what the make commands can do for you!\n");
    this.log("General commands:");
    this.log('* "make list" to list all available targets;');

    this.log('* "make setup" to install all dependencies (do not forget to create a virtualenv first);');
    this.log('* "make test" to test your application (tests in the tests/ directory);');

    if (pkg.services.redis) {
      this.log("\nRedis commands:");
      this.log('* "make redis" to get a redis instance up (localhost:4444);');
      this.log('* "make kill-redis" to kill this redis instance (localhost:4444);');
      this.log('* "make redis-test" to get a redis instance up for your unit tests (localhost:4448);');
      this.log('* "make kill-redis-test" to kill the test redis instance (localhost:4448);');
    }

    if (pkg.services.mongodb) {
      this.log("\nMongoDB commands:");
      this.log('* "make mongo" to get a mongodb instance up (localhost:3333);');
      this.log('* "make kill-mongo" to kill this mongodb instance (localhost:3333);');
      this.log('* "make clear-mongo" to clear all data in this mongodb instance (localhost: 3333);');
      this.log('* "make mongo-test" to get a mongodb instance up for your unit tests (localhost:3334);');
      this.log('* "make kill-mongo-test" to kill the test mongodb instance (localhost: 3334);');
    }

    this.log('* "make tox" to run tests against all supported python versions.');
  },

});

module.exports = TornadoGenerator;
