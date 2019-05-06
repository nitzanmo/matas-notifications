var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var admin = require('firebase-admin');
var serviceAccount = require('./firebase/maps-ext-47253069-firebase-adminsdk-8yu6h-44d3c3b03c.json');
var request = require('request');

var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({extended: false}));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', indexRouter);
app.use('/users', usersRouter);

// catch 404 and forward to error handler
app.use(function (req, res, next) {
    next(createError(404));
});

// error handler
app.use(function (err, req, res, next) {
    // set locals, only providing error in development
    res.locals.message = err.message;
    res.locals.error = req.app.get('env') === 'development' ? err : {};

    // render the error page
    res.status(err.status || 500);
    res.render('error');
});


admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://maps-ext-47253069.firebaseio.com"
});

var points = new Set();

var registrationToken = 'YOUR_REGISTRATION_TOKEN';

request.get('https://www.matas-iaf.com/data/aircrafts.json', function (error, response, body) {
    if (!error && response.statusCode == 200) {
        var aircraft = JSON.parse(body).aircrafts;
        var currentPath;


        // TODO: read more data to find out when are shows and notify about it
        aircraft.forEach(aircraft => {
            aircraft.path.forEach(point => points.add(point.pointId));
        });

        // Just to test, notifying all of the cities
        points.forEach(pointId => {
            // The topic name can be optionally prefixed with "/topics/".
            var topic = `point-${pointId}`;

            var message = {
                notification: {
                    title: 'Hello'
                },
                topic: topic
            };

            // Send a message to devices subscribed to the provided topic.
            admin.messaging().send(message)
                .then((response) => {
                    // Response is a message ID string.
                    console.log('Successfully sent message:', response);
                })
                .catch((error) => {
                    console.log('Error sending message:', error);
                });
        });
    }
});


module.exports = app;
