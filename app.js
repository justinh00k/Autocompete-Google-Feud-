var restify = require('restify');
var builder = require('botbuilder');
var botbuilder_azure = require("botbuilder-azure");
var http = require('http');

var Culture, People, Names, Questions, all_questions, all_answers;
var request = require("request");

request.get('https://autocomplete.games/js/questions.js', function(error, response, body) {
    if (!error && response.statusCode == 200) {
        eval(body);
        Culture = culture;
        People = people;
        Names = names;
        Questions = questions;
        all_answers = allanswers;
        all_questions = Culture.concat(People, Names, Questions);

    }
});



// Setup Restify Server
var server = restify.createServer();
server.listen(process.env.port || process.env.PORT || 3978, function() {
    console.log('%s listening to %s', server.name, server.url);
});

// Create chat connector for communicating with the Bot Framework Service
var connector = new builder.ChatConnector({
    appId: process.env.MicrosoftAppId,
    appPassword: process.env.MicrosoftAppPassword,
    openIdMetadata: process.env.BotOpenIdMetadata
});


// Listen for messages from users 
server.post('/api/messages', connector.listen());

/* Bot Storage */

var tableName = 'botdata';
var azureTableClient = new botbuilder_azure.AzureTableClient(tableName, process.env['AzureWebJobsStorage']);
var tableStorage = new botbuilder_azure.AzureBotStorage({ gzipData: false }, azureTableClient);

// Create your bot with a function to receive messages from the user

var bot = new builder.UniversalBot(connector, {

    autoBatchDelay: 500,
    persistConversationData: true,
    storage: tableStorage

});

// only include tokens for the platforms that you support
var dashbotApiMap = {
    facebook: process.env.DASHBOT_API_KEY_FACEBOOK,
    slack: process.env.DASHBOT_API_KEY_SLACK,
    kik: process.env.DASHBOT_API_KEY_KIK,
    telegram: process.env.DASHBOT_API_KEY_TELEGRAM,
    groupme: process.env.DASHBOT_API_KEY_GROUPME,
    skype: process.env.DASHBOT_API_KEY_SKYPE
};

var dashbot = require('dashbot')(dashbotApiMap).microsoft;

dashbot.setFacebookToken(process.env.FACEBOOK_PAGE_TOKEN);


bot.use({
    dashbot,
    botbuilder: function(session, next) {
        var message = session.message;
        var botMri = message.address.bot.id.toLowerCase();
        var botAtMentions = message.entities && message.entities.filter(
            (entity) => (entity.type === "mention") && (entity.mentioned.id.toLowerCase() === botMri));

        if (botAtMentions && botAtMentions.length || !session.conversationData.groupmode) {
            next();
        }
    },
    send: function(event, next) {
        next();
    }
});



var a_send_string = "";
var send_string = "";

function findLongestWord(str) {
    var words = str.split(/\s+/);
    var longest = '';

    for (var i = 0; i < words.length; i++) {
        if (words[i].length > longest.length) {
            longest = words[i];
        }
    }
    return longest;
}


// THEN

var i = 0;

var welcome = "Welcome to Google Feud Bot (AutoCompete)! ";
var instructions = " You have 4 guesses to guess the top 10 ways Google autocompletes popular searches. Each game lasts 3 rounds. ";

var logo = {

    "attachments": [{
        "contentType": "image/png",
        "contentUrl": "https://autocomplete.games/icons/google_feud.png"
    }]

};

var exits = ["exit", "quit", "exit game", "quit game", "g2g", "end game", "stop the game", "i quit"];
var newgame = ["new game", "start over", "restart", "reset", "start new game", "start a new game"];
var skipq = ["new round", "next round", "skip question", "new question", "next question", "i don't know", "i dont know", "i give up", "don't know", "give up", "idk"];
var yeses = ["yes", "yay", "yeah", "oh yeah", "1", "y", "ok", "okay", "of course", "yep", "sure", "lol", "start", "begin"];
var noes = ["damn it", "what", "come on", "fuck this", "u suck", "you suck", "hey", "i hate you", "wtf", "no", "2", "n", "nah", "quit", "fuck you", "fuck u", "fuck"];

function numberWithCommas(x) {
    return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function capitalizeFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}


bot.dialog('/', function(session) {

    var goodtogo = false;


    if (session.message.source === "kik") { session.userData.kik = true; }

    session.conversationData.groupmode = false;
    session.conversationData.startup = true;

    if (session.message.address.conversation.isGroup) {
        session.conversationData.groupmode = true;

        if (session.message.entities.length > 0) {

            for (i = 0; i < session.message.entities.length; i += 1) {
                if (session.message.entities[i].mentioned.id === session.message.address.bot.id) {
                    goodtogo = true;

                }
            }

        }

        if (!goodtogo) {
            return;
        }

    }
    session.sendTyping();

    session.replaceDialog('/chooseCat');

});

bot.dialog('/prompt', [
    function(session) {

        var yes_no = "";
        if (session.conversationData.yes_no_prompt)
            yes_no = ' Say "Yes" or "No".';

        if ((session.userData.kik) && (!session.conversationData.yes_no_prompt))
            builder.Prompts.text(session, session.conversationData.send_string + " Play again?");
        else
            builder.Prompts.text(session, "Play again?" + yes_no);
        // }
    },
    function(session, results) {

        var regex = new RegExp("@" + session.message.address.bot.name, "g");
        var answerSlot = results.response.toLowerCase().replace(regex, "").replace(/[^0-9a-z-\s]/g, "");

        regex = new RegExp("  ", "g");
        answerSlot = answerSlot.replace(regex, "");
        answerSlot = answerSlot.trim();

        if (noes.indexOf(answerSlot) > -1) {
            session.conversationData.yes_no_prompt = false;
            // session.clearDialogStack();
            session.endDialog();
            session.replaceDialog("/quit");
            session.clearDialogStack();

        } else if (yeses.indexOf(answerSlot) > -1) {
            session.conversationData.yes_no_prompt = false;
            //  session.clearDialogStack();
            session.endDialog();
            session.replaceDialog("/chooseCat");
            session.clearDialogStack();

        } else {
            session.conversationData.yes_no_prompt = true;
            session.replaceDialog("/prompt");
        }

    }
]);

bot.dialog('/quit', function(session) {

    var sesh = session.conversationData;

    var bye = "";
    if (sesh.iquit) {
        if (sesh.gameScore > session.userData.highscore) {
            session.userData.highscore = sesh.gameScore;
            bye = 'You set a new high score of ' + numberWithCommas(sesh.gameScore) + ' points!';

        } else {

            bye = 'Your score was ' + numberWithCommas(sesh.gameScore) + ' points. Your high score is ' + numberWithCommas(session.userData.highscore) + ' points.';
        }
    }

    if (!session.userData.kik) {

        session.send(bye);
        session.send('Thanks for playing Google Feud!');
        session.endConversation('http://www.googlefeud.com');
    } else {


        session.endConversation(bye + " Thanks for playing Google Feud!\n\nhttp://www.googlefeud.com");


    }


});

bot.dialog('/chooseCat', [
    function(session) {

        if (session.conversationData.startup) {
            session.conversationData.startup = false;

            var hs = "";
            if (session.userData.highscore) {
                var hs = 'Your high score is ' + numberWithCommas(session.userData.highscore) + '! ';
            } else {
                session.userData.highscore = 0;
            }

            var gm = "";
            if (session.conversationData.groupmode) {
                gm = 'You are in group mode, so please address all answers to @' + session.message.address.bot.name + '. ';

                if (session.userData.kik) {
                    gm = 'You are in group mode, so please address all answers to @autocompete . ';
                }

            }

            if (session.userData.kik) {

                builder.Prompts.text(session, welcome + instructions + gm + hs + "Choose a category:\n1. Culture\n2. People\n3. Names\n4. Questions");
            } else {
                session.send(logo);
                session.send(welcome);
                session.send(instructions);
                if (session.conversationData.groupmode) { session.send(gm); }
                if (session.userData.highscore > 0) { session.send(hs); }
                builder.Prompts.text(session, "Choose a category:\n1. Culture\n2. People\n3. Names\n4. Questions");
            }


        } else {

            builder.Prompts.text(session, "Choose a category:\n1. Culture\n2. People\n3. Names\n4. Questions");
        }



    },
    function(session, results) {

        var answerSlot = results.response.toLowerCase();
        var true_count = 0;

        if (exits.indexOf(answerSlot) > -1) {

            session.conversationData.iquit = true;
            session.replaceDialog("/quit");
            session.clearDialogStack();
            return;

        }

        var the_answerSlot;

        if (answerSlot.includes("cult") || answerSlot.includes("1") || answerSlot === "c") {
            the_answerSlot = "Culture";
            true_count++;
        }
        if (answerSlot.includes("peopl") || answerSlot.includes("2") || answerSlot.includes("ppl") || answerSlot === "p") {
            the_answerSlot = "People";
            true_count++;
        }
        if (answerSlot.includes("name") || answerSlot.includes("3") || answerSlot === "n") {
            the_answerSlot = "Names";
            true_count++;
        }
        if (answerSlot.includes("quest") || answerSlot.includes("4") || answerSlot.includes("qs") || answerSlot === "q") {
            the_answerSlot = "Questions";
            true_count++;
        }

        if (true_count != 1) {

            session.replaceDialog("/chooseCat");
            return;

        }

        answerSlot = the_answerSlot;



        var sesh = {

            gameRound: 0,
            gameScore: 0,
            qnum: 0,
            catName: answerSlot,
            gameGuesses: 4,
            playedqs_culture: [],
            playedqs_people: [],
            playedqs_names: [],
            playedqs_questions: [],
            guessed: [],
            groupmode: session.conversationData.groupmode,
            gameActive: false,
            iquit: false,
            wasright: false,
            non_guess: false,
            doubleyes: false,
            giveup: false,
            guessing: false,
            tworight: false,
            help: false,
            send_string: "",
            positive: false,
            yes_no_prompt: false,

            question: ""

        };

        switch (answerSlot) {
            case "Culture":
                sesh.questionset = Culture;
                break;
            case "Questions":
                sesh.questionset = Questions;
                break;
            case "People":
                sesh.questionset = People;
                break;
            case "Names":
                sesh.questionset = Names;
                break;

        }

        session.conversationData = sesh;

        session.replaceDialog("/round");

    }
]);

bot.dialog('/round', [
    function(session, args, next) {

        if (session.conversationData.help === true) {
            session.conversationData.help = false;
            if (!session.userData.kik) {
                session.send("The object of Google Feud is to try to guess how Google autocompletes popular searches. For example, if you type 'barack,' Google will autocomplete with 'obama.'");
                session.send("If you want to try a new category, just type 'new game' or 'quit.'");
                session.send("How does Google autocomplete this query?");

                builder.Prompts.text(session, session.conversationData.question + "...");
            } else {
                builder.Prompts.text(session, "The object of Google Feud is to try to guess how Google autocompletes popular searches. For example, if you type 'barack,' Google will autocomplete with 'obama.' If you want to try a new category, just type 'new game' or 'quit.'\n\nHow does Google autocomplete this query? " + session.conversationData.question + "...");
            }
        } else if (session.conversationData.non_guess) {
            session.conversationData.non_guess = false;
            var non_guess_array = [""];

            if (session.conversationData.wasright) {

                if (session.conversationData.positive)
                    non_guess_array = ["Yeah!", "You got it right!", "Amazing.", "Nice.", "You're terrific."];

            } else {

                non_guess_array = ["You'll get it.", "Keep trying.", "This is a hard one.", "Type 'skip question' to, you know, skip the question.", "Blerg!", "It's tough!"];
            }
            var nnum = Math.floor(Math.random() * (non_guess_array.length));
            var plural = "";
            if (session.conversationData.gameGuesses != 1) { plural = "es"; }

            if (session.userData.kik) {

                builder.Prompts.text(session, non_guess_array[nnum] + "\n" + "You have " + session.conversationData.gameGuesses + " guess" + plural + " remaining: " + session.conversationData.question + "...");
            } else {
                session.send(non_guess_array[nnum]);

                builder.Prompts.text(session, "You have " + session.conversationData.gameGuesses + " guess" + plural + " remaining: " + session.conversationData.question + "...");
            }
        } else {



            var sesh = session.conversationData;

            if (sesh.gameActive === false) {
                sesh.gameActive = true;

                sesh.guessed = [];
                sesh.gameRound += 1;
                sesh.gameGuesses = 4;

                var qnum = Math.floor(Math.random() * (sesh.questionset.length));

                switch (sesh.catName) {

                    case "Culture":

                        while (sesh.playedqs_culture.indexOf(qnum) > -1) {
                            qnum = Math.floor(Math.random() * (sesh.questionset.length));
                        }
                        sesh.playedqs_culture.push(qnum);
                        if (sesh.playedqs_culture.length === sesh.questionset.length) {
                            sesh.playedqs_culture = [];
                        }

                        break;

                    case "Names":
                        while (sesh.playedqs_names.indexOf(qnum) > -1) {
                            qnum = Math.floor(Math.random() * (sesh.questionset.length));
                        }
                        sesh.playedqs_names.push(qnum);
                        if (sesh.playedqs_names.length === sesh.questionset.length) {
                            sesh.playedqs_names = [];
                        }
                        break;

                    case "Questions":
                        while (sesh.playedqs_questions.indexOf(qnum) > -1) {
                            qnum = Math.floor(Math.random() * (sesh.questionset.length));
                        }
                        sesh.playedqs_questions.push(qnum);
                        if (sesh.playedqs_questions.length === sesh.questionset.length) {
                            sesh.playedqs_questions = [];
                        }
                        break;

                    case "People":

                        while (sesh.playedqs_people.indexOf(qnum) > -1) {
                            qnum = Math.floor(Math.random() * (sesh.questionset.length));
                        }
                        sesh.playedqs_people.push(qnum);
                        if (sesh.playedqs_people.length === sesh.questionset.length) {
                            sesh.playedqs_people = [];
                        }
                        break;

                }

                sesh.question = sesh.questionset[qnum].toLowerCase();
                sesh.qnum = qnum;
                session.conversationData = sesh;

                var round_string = sesh.gameRound;

                if (!session.userData.kik) {
                    session.send("ROUND " + round_string + ": How does Google autocomplete this query?");

                    builder.Prompts.text(session, sesh.question + "...");
                } else {
                    builder.Prompts.text(session, session.conversationData.send_string + "\n\nROUND " + round_string + ": How does Google autocomplete this query?\n\n" + sesh.question + "...");
                }

            } else if ((sesh.wasright) && (sesh.guessing === false)) {

                var reprompt_array = ["Guess again!", "Keep guessing!", "Got another guess?", "Keep going!"];
                var rnum = Math.floor(Math.random() * (reprompt_array.length));

                var your_score = "";
                if (session.conversationData.tworight) { var your_score = " Your point total is " + numberWithCommas(sesh.gameScore) + ". "; }


                if (session.userData.kik)
                    builder.Prompts.text(session, session.conversationData.send_string + your_score + " " + reprompt_array[rnum]);
                else {
                    session.send(your_score);

                    builder.Prompts.text(session, reprompt_array[rnum]);


                }

            } else if (sesh.guessing === false) {

                if (sesh.gameGuesses === 1) {
                    if (session.userData.kik)
                        builder.Prompts.text(session, session.conversationData.send_string + " You have " + sesh.gameGuesses + " guess remaining.");
                    else
                        builder.Prompts.text(session, "You have " + sesh.gameGuesses + " guess remaining.");
                } else {
                    if (session.userData.kik)
                        builder.Prompts.text(session, session.conversationData.send_string + " You have " + sesh.gameGuesses + " guesses remaining.");
                    else
                        builder.Prompts.text(session, "You have " + sesh.gameGuesses + " guesses remaining.");
                }
            } else {
                if (session.userData.kik)
                    builder.Prompts.text(session, session.conversationData.send_string);
                else {

                    builder.Prompts.text(session, "");
                }

            }

            session.conversationData.send_string = "";

        } //not help
    },

    function(session, results) {

        var sesh = session.conversationData;

        var regex = new RegExp("@" + session.message.address.bot.name, "g");
        var answerSlot = results.response.toLowerCase().replace(regex, "").replace(/[^0-9a-z-\s]/g, "");

        regex = new RegExp("  ", "g");
        answerSlot = answerSlot.replace(regex, "");
        answerSlot = answerSlot.trim();

        if (exits.indexOf(answerSlot) > -1) {

            session.conversationData.iquit = true;

            session.replaceDialog("/quit");
            session.clearDialogStack();
            return;

        }

        if (newgame.indexOf(answerSlot) > -1) {

            session.replaceDialog("/chooseCat");

            session.clearDialogStack();
            return;
        }

        if (skipq.indexOf(answerSlot) > -1) {

            sesh.giveup = true;
            sesh.gameGuesses = 1;

            if (sesh.groupmode) {
                answerSlot = "skip question";
            }

        }

        if (answerSlot === "help") {

            session.conversationData.help = true;

            session.replaceDialog("/round");
            session.clearDialogStack();
            return;

        }

        var yes_and_no = yeses.concat(noes);
        if ((yes_and_no.indexOf(answerSlot) > -1) && (!session.conversationData.doubleyes)) {

            if (yeses.indexOf(answerSlot) > -1) {
                session.conversationData.positive = true;
            } else {
                session.conversationData.positive = false;
            }

            session.conversationData.doubleyes = true;
            session.conversationData.non_guess = true;

            session.replaceDialog("/round");
            session.clearDialogStack();
            return;

        }

        session.conversationData.doubleyes = false;

        sesh.wasright = false;
        var indexValue = all_answers[sesh.questionset[sesh.qnum]].indexOf(answerSlot);




        if (indexValue === -1) {
            indexValue = all_answers[sesh.questionset[sesh.qnum]].indexOf(answerSlot + "s");
        }
        if (indexValue === -1) {
            indexValue = all_answers[sesh.questionset[sesh.qnum]].indexOf(answerSlot + "es");
        }
        if (indexValue === -1) {
            indexValue = all_answers[sesh.questionset[sesh.qnum]].indexOf("the " + answerSlot);
        }
        if (indexValue === -1) {
            indexValue = all_answers[sesh.questionset[sesh.qnum]].indexOf("a " + answerSlot);
        }

        if (indexValue === -1) {
            indexValue = all_answers[sesh.questionset[sesh.qnum]].indexOf("an " + answerSlot);
        }

        if (indexValue === -1) {
            var long_word = findLongestWord(answerSlot);
            var multiple_answers = 0;
            if (long_word.length > 5) {
                for (i = 0; i < all_answers[sesh.questionset[sesh.qnum]].length; i++) {
                    if (all_answers[sesh.questionset[sesh.qnum]][i].indexOf(long_word) > -1) {
                        indexValue = i;
                        multiple_answers++;

                    }
                }

            }



        }

        if (sesh.guessed.indexOf(indexValue) > -1) {
            indexValue = -1;
        }

        if (indexValue > -1) {

            var pointValue = ((10 - indexValue) * 1000);
            sesh.guessed.push(indexValue);
            sesh.wasright = true;
            sesh.gameScore = sesh.gameScore + pointValue;
            if (sesh.gameScore > pointValue) { sesh.tworight = true; }
            if (multiple_answers > 0) { a_send_string = capitalizeFirstLetter(all_answers[sesh.questionset[sesh.qnum]][indexValue]) + "! "; } else { a_send_string = ""; }
            a_send_string += "Correct! " + numberWithCommas(pointValue) + " points!";
            if (!session.userData.kik)
                session.send(a_send_string);
            send_string = a_send_string;


            if (sesh.guessed.length > 9) {

                if (sesh.gameRound > 2) {

                    a_send_string = " Somehow you got ten out of ten correct.";
                    if (!session.userData.kik)
                        session.send(a_send_string);
                    send_string += a_send_string;

                    if (sesh.gameScore === 165000) {
                        a_send_string = " Wow! You definitely cheated, but you got a perfect game! Still cool!";
                        if (!session.userData.kik)
                            session.send(a_send_string);
                        send_string += a_send_string;
                    }

                    if (sesh.gameScore > session.userData.highscore) {
                        session.userData.highscore = sesh.gameScore;
                        a_send_string = ' You set a new high score of ' + numberWithCommas(sesh.gameScore) + ' points!';
                        if (!session.userData.kik)
                            session.send(a_send_string);
                        send_string += a_send_string;
                    } else {

                        a_send_string = ' Your score was ' + numberWithCommas(sesh.gameScore) + ' points. Your high score is ' + numberWithCommas(session.userData.highscore) + ' points.';
                        if (!session.userData.kik)
                            session.send(a_send_string);
                        send_string += a_send_string;
                    }
                    session.conversationData.send_string = send_string;

                    session.replaceDialog("/prompt");

                    // END GAME
                } else {

                    a_send_string = ' Somehow you got 10/10 correct!';
                    if (!session.userData.kik)
                        session.send(a_send_string);
                    send_string += a_send_string;
                    sesh.gameActive = false;

                }

            }

        } else { //wrong

            sesh.gameGuesses = sesh.gameGuesses - 1;
            if (sesh.gameGuesses < 1) {
                var rightanswers = sesh.guessed.length;
                var missed = [];

                if (rightanswers < 7) {
                    for (i = 0; i < 10; i += 1) {
                        if (sesh.guessed.indexOf(i) === -1) {
                            missed.push(i);
                        }
                    }

                    var reveal = Math.floor(Math.random() * (missed.length - 2));

                    var sorry_dialog = "";
                    if (!sesh.giveup) {
                        sorry_dialog += 'Sorry, that was your last guess. ';
                    } else {
                        sesh.giveup = false;
                    }

                    sorry_dialog += 'Answers you missed include "' + all_answers[sesh.questionset[sesh.qnum]][missed[reveal]] + '," "' + all_answers[sesh.questionset[sesh.qnum]][missed[reveal + 1]] + '," and "' + all_answers[sesh.questionset[sesh.qnum]][missed[reveal + 2]] + '."';

                    a_send_string = " " + sorry_dialog;

                } else {
                    a_send_string = " Sorry, that was your last guess.";

                }
                if (!session.userData.kik)
                    session.send(a_send_string);
                send_string = a_send_string;

                if (sesh.gameRound === 3) {

                    if (sesh.gameScore > session.userData.highscore) {
                        session.userData.highscore = sesh.gameScore;
                        a_send_string = ' You set a new high score of ' + numberWithCommas(sesh.gameScore) + ' points!';
                        if (!session.userData.kik)
                            session.send(a_send_string);
                        send_string += a_send_string;
                    } else {

                        a_send_string = ' Your score was ' + numberWithCommas(sesh.gameScore) + ' points. Your high score is ' + numberWithCommas(session.userData.highscore) + ' points.';
                        if (!session.userData.kik)
                            session.send(a_send_string);
                        send_string += a_send_string;
                    }
                    session.conversationData.send_string = send_string;

                    session.replaceDialog("/prompt");



                } else {

                    sesh.gameActive = false;
                }

            } else {

                var no_num = Math.floor(Math.random() * 5);

                if (no_num === 0) {
                    a_send_string = "Incorrect.";
                } else if (no_num === 1) {
                    a_send_string = "Nope.";
                } else if (no_num === 2) {
                    a_send_string = "No...";
                } else if (no_num === 3) {
                    a_send_string = "Wrong.";
                } else {
                    a_send_string = "Try again.";
                }
                if (!session.userData.kik)
                    session.send(a_send_string);
                send_string = a_send_string;

            }

        }
        session.conversationData.send_string = send_string;
        session.conversationData = sesh;

        session.replaceDialog('/round');


    }

]);