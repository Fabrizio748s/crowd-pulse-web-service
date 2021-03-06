'use strict';

var Q = require('q');
var fs = require('q-io/fs');
var express = require('express');
var cpLauncher = require('../lib/cpLauncher');
var qSend = require('../lib/expressQ').send;
var qErr = require('../lib/expressQ').error;
var config = require('../lib/config');
var router = express.Router();

module.exports = function(crowdPulse) {

  router.route('/projects')
    .get(function(req, res) {
      return crowdPulse.Project.getAll().then(qSend(res)).catch(qErr(res));
    })
    .post(function(req, res) {
      var project = crowdPulse.Project.newFromObject(req.body);
      return Q(project.save()).then(qSend(res)).catch(qErr(res));
    });

  router.route('/projects/:projectId')
    .get(function(req, res) {
      return crowdPulse.Project.getById(req.params.projectId).then(qSend(res)).catch(qErr(res));
    })
    .put(function(req, res) {
      var project = crowdPulse.Project.fromPreObject(req.body);
      return project.updateElement().then(qSend(res)).catch(qErr(res));
    })
    .delete(function(req, res) {
      return crowdPulse.Project.safeDelete(req.params.projectId).then(qSend(res)).catch(qErr(res));
    });

  // POST to start a run
  router.route('/projects/:projectId/runs')
    .post(function(req, res) {
      var newRun;
      return crowdPulse.Project.getById(req.params.projectId)
        .then(function(project) {
          return project.createNewRun(config.logs.path);
        })
        .spread(function(project, run) {
          newRun = run;
          return [project, run];
        })
        // launch the run
        .spread(cpLauncher.executeProjectRun)
        // send the run information
        .then(qSend(res))
        // in case there's an error
        .catch(function(error) {
          // if the new run was saved, set it to errored and send it to the client
          if (newRun) {
            newRun.status = 1;
            newRun.dateEnd = new Date();
            return Q(newRun.save())
              .then(qSend(res))
              .catch(qErr(res));
          }
          // if the run wasn't saved, it means the error comes from previous steps, send it
          return qErr(res)(error);
        });
    });

  router.route('/projects/:projectId/runs/:runId')
    .get(function(req, res) {
      return crowdPulse.ProjectRun.getById(req.params.runId).then(qSend(res)).catch(qErr(res));
    })
    // DELETE to stop a run
    .delete(function(req, res) {
      return crowdPulse.ProjectRun
        // mark the run as stopped
        .stopRun(req.params.runId)
        // stop the run PID
        .then(cpLauncher.stopProjectRun)
        .then(qSend(res))
        .catch(qErr(res));
    });

  router.route('/projects/:projectId/runs/:runId/log')
    .get(function(req, res) {
      return crowdPulse.ProjectRun.getById(req.params.runId)
        .then(function(run) {
          res.type('text/plain');
          return fs.read(run.log)
        })
        .then(qSend(res))
        .catch(qErr(res));
    });

  return router;
};