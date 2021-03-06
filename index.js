#!/usr/bin/env node

var irc = require("irc");
var shell = require("shelljs");
var config = require("./config.json");
var exec = require('child_process').exec;
config.customParams.channels = config.channels;

var bot = new irc.Client(config.server, config.name, config.customParams);

console.log("Connecting " + config.name + " to " + config.server + "...");

if (config.meme)
  for (i in config.meme)
    config.meme[i].current = 1;

bot.sayAll = function(msg) {
  for (i in config.channels)
    bot.say(config.channels[i], msg);
}

bot.response = function(channel, message) {
  var timeout = config.responseTime instanceof Array ? Math.random() * (config.responseTime[1] - config.responseTime[0]) + config.responseTime[0] : config.responseTime || 0;
  setTimeout(function() {
    bot.say(channel, message)
  }, timeout * 1000);
}

bot.addListener("join", function(channel, who) {
  if (config.welcomeMessage != false && who !== config.name)
    bot.say(channel, config.welcomeMessage.replace("%s", who));
  if (who === config.name && config["42"] == true) {
    initSay42(channel);
    config["42"] = false;
  }
});

bot.addListener("quit", function(who, reason, channels) {
  if (config.goodbyeMessage != false)
    bot.say(channels[0], config.goodbyeMessage.replace("%s", who));
});

bot.addListener('message', function (from, to, message) {
  var responses = config.maxResponses || -1;
  if (config.history)
    console.log(from + ' => ' + to + ': ' + message);
  if (config.searchEngine && message[0] == '!')
    for (i in config.searchEngine)
      if (message.match("^!" + i + " ")) {
	bot.say(to, encodeURI(config.searchEngine[i].replace('%s', message.split(new RegExp("^\\!" + i + " "))[1])));
	return;
      }

  if (message.indexOf(config.name) >= 0)
    for (i in config.talkAboutMe) {
      if (responses == 0)
	break ;
      if (message.indexOf(i) >= 0) {
	--responses;
	bot.response(to, config.talkAboutMe[i]);
      }
    }
  for (i in config.react) {
    if (responses == 0)
      break ;
    if (message.indexOf(i) >= 0) {
      --responses;
      bot.response(to, config.react[i]);
    }
  }

  if (config.meme && shell.exec('which meme').code == 0) {
    for (i in config.meme) {
      if (config.meme[i].user === from) {
	if (config.meme[i].current == config.meme[i].interval) {
	  config.meme[i].current = 1;
	  bot.response(to, shell.exec("meme --text " + config.meme[i].meme + " '" + message.replace(/'/g, "\\'") + "'" + " ' '").output);
	}
	else
	  ++config.meme[i].current;
      }
    }
  }

  if (message.match(/^!config /) && config.master[from]) {
    var variable = message.split('!config ')[1].split(' ')[0];
    var value = message.substr(9 + variable.length);
    console.log(variable);
    console.log(value);
    function parseConfig(split, data) {
      if (split.length == 1) { // It's a simple way to parse to int, bool, array...
	try {
	  data[split[0]] = JSON.parse(value);
	} catch(e) {
	  data[split[0]] = value;
	}
      }
      else {
	if (!data[split[0]])
	  data[split[0]] = {};
	var name = split.shift();
	parseConfig(split, data[name]);
      }
    }
    parseConfig(variable.split('.'), config);
  }
});

bot.addListener('pm', function (from, message) {
  if (config.master[from])
    bot.say(config.primaryChan, message);
});

bot.addListener('error', function(message) {
  console.error('error: ', message);
});

function initSay42(channel) {
  var now = new Date();
  var minutesLeft;
  var secondsLeft;

  minutesLeft = (42 - now.getMinutes() + 59) % 60;
  secondsLeft = (60 - now.getSeconds()) % 61;
  setTimeout(function() {
    initSay42(channel);
    console.log('42');
    bot.say(channel, "42 !");
  }, minutesLeft * 60000 + secondsLeft * 1000);
  console.log('Next call in ' + minutesLeft + ' minutes and ' + secondsLeft + ' seconds');
}
