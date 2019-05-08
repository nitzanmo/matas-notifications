const app = require('../app');
var express = require('express');
var router = express.Router();
var cors = require('cors');

var whitelist = [undefined, 'http://localhost:3000', 'https://https://matas-dev.azurewebsites.net', 'https://matas-iaf.com'];

var corsOptions = {
  origin: function (origin, callback) {
    if (whitelist.indexOf(origin) !== -1) {
      callback(null, true)
    } else {
      callback(new Error('Not allowed by CORS'))
    }
  }
}

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Express' });
});

router.get('/subscribeToTopic/:token/:topic', cors(corsOptions), (req, res) => {
  app.subscribeToTopic(req.params.token, req.params.topic)
      .then(value => {
          res.sendStatus(200);
      })
      .catch(value => {
        res.sendStatus(500);
      });
});

router.get('/unsubscribeToTopic/:token/:topic', cors(corsOptions), (req, res) => {
  app.unsubscribeToTopic(req.params.token, req.params.topic)
      .then(value => {
        res.sendStatus(200);
      })
      .catch(value => {
        res.sendStatus(500);
      });
});

router.get('/sendTopic/:token/:topic/:data', cors(corsOptions), (req, res) => {
  app.sendTopic(req.params.token, req.params.topic, req.params.data)
      .then(value => {
        res.sendStatus(200);
      })
      .catch(value => {
        res.sendStatus(500);
      });
});

module.exports = router;
