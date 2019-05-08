const Functions = require('./public/javascripts/functions');
var createError = require('http-errors');
const md5sum = (str) => require('crypto').createHash('md5').update(str).digest('hex');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var admin = require('firebase-admin');
var serviceAccount = require('./firebase/maps-ext-47253069-firebase-adminsdk-8yu6h-44d3c3b03c.json');
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

function subscribeToTopic(token, topicName) {
    return admin.messaging().subscribeToTopic(token, topicName);
}

function unsubscribeToTopic(token, topicName) {
    return admin.messaging().unsubscribeFromTopic(token, topicName);
}

function sendTopic(token, topicName, data) {
    if(md5sum(data.password) !== "e4fc9b9b8cf1eaf0ddb823b787040ee0") {
        throw new Error('Failed');
    }

    const payload = {
        topic: topicName,
        notification: {
            title: data.title,
            body: data.body
        }
    };

    return admin.messaging().send(payload);
}

var points = new Set();
var aircrafts;
var functions = new Functions();
const GENERAL_TOPIC = "users";

function sendNotification(title, body, topic) {
    var message = {
        webpush: {
            notification: {
                title: title,
                body: body,
                dir: 'rtl',
                lang: 'he',
                vibrate: [300, 100, 400],
                data: {url: 'https://matas-iaf.com'},
                icon: '../icons/logo192x192.png',
            }
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
}

function loadData() {
    functions.loadAircrafts((pAircrafts) => {
        aircrafts = pAircrafts;
        functions.loadRoutes((routes) => {
            this.routes = routes;
            functions.loadCategories(function () {
                functions.updateLocationsMap(aircrafts);
                scheduleAllNotifications();
            });
        }, this);
    }, this);
}

function scheduleAllNotifications() {
    var timeToFlightStart = functions.realActualStartTime - new Date() - 5 * 60 * 1000;
    if (timeToFlightStart > 0) {
        setTimeout(() => {
            sendNotification("בוקר כחול לבן!", "המטס מתחיל עוד חמש דקות, בואו לחגוג איתנו!", GENERAL_TOPIC);
        }, timeToFlightStart);
    }

    aircrafts.forEach(aircraft => {
        aircraft.path.forEach(location => {
            var fullLocation = functions.locations[location.pointId];
            fullLocation.aircrafts.forEach(item => {
                if (item.aerobatic || item.parachutist || item.specialInPath === "מופעים אוויריים" || item.specialInAircraft === "מופעים אוויריים") {
                    var timeToNotify = functions.convertTime(item.date, item.time) - new Date() + functions.actualStartTime - functions.plannedStartTime - 5 * 60 * 1000;
                    var isAerobatic = (item.aerobatic || item.specialInAircraft === "מופעים אוויריים" || item.specialInPath === "מופעים אוויריים");
                    var notificationBody =
                        `${functions.getEventName(isAerobatic)}
                         ${functions.getEventDescription(isAerobatic, fullLocation.pointName, 5)}`;
                    if (timeToNotify > 0) {
                        setTimeout(() => {
                            sendNotification(functions.getEventName(item.aerobatic), notificationBody, `point-${fullLocation.pointId}`);
                        }, timeToNotify)
                    }
                }
            });
        });
    });
}

loadData();
console.log("Data loaded");

//
// // Just to test, notifying all of the cities
// points.forEach(pointId => {
//     // The topic name can be optionally prefixed with "/topics/".
//     var topic = `point-${pointId}`;
//
// });
//

module.exports.app = app;
module.exports.subscribeToTopic = subscribeToTopic;
module.exports.unsubscribeToTopic = unsubscribeToTopic;
module.exports.sendTopic = sendTopic;
