/*
  
  NodeGame: Shooter
  Copyright (c) 2010 Ivo Wetzel.
  
  All rights reserved.
  
  NodeGame: Shooter is free software: you can redistribute it and/or
  modify it under the terms of the GNU General Public License as published by
  the Free Software Foundation, either version 3 of the License, or
  (at your option) any later version.

  NodeGame: Shooter is distributed in the hope that it will be useful,
  but WITHOUT ANY WARRANTY; without even the implied warranty of
  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
  GNU General Public License for more details.

  You should have received a copy of the GNU General Public License along with
  NodeGame: Shooter. If not, see <http://www.gnu.org/licenses/>.
  
*/


// Game ------------------------------------------------------------------------
// -----------------------------------------------------------------------------
var Client = new NodeGame();
var Shooter = Client.Game(30);

Shooter.onCreate = function() {
    // Force FF to show up the cookie dialog, because if cookies aren't allowed
    // localStorage will fail
    if (document.cookie !== 'SET') {
        document.cookie = 'SET';
    }
    
    // Canvas
    this.particles = [];
    this.canvas = $('bg');
    
    // Sounds
    this.sound = new SoundPlayer(7, 'sounds', [
        'explosionBig',
        'explosionMedium',
        'explosionShip',
        'explosionSmall',
        
        'fadeIn',
        'fadeOut',
        'launchBig',
        'launchMedium',
        'launchSmall',
        'powerOff',
        'powerOn',
        'powerSound'
    ]);
    this.onSound(this.getItem('sound', false));
    
    // Tutorial
    this.tutorialTimers = [null, null];
    this.onTutorial(this.getItem('tutorial', true));
    
    // General
    this.roundTime = 0;
    this.roundStart = 0;
    this.roundID = 0;
    this.roundStats = {};
    this.roundGO = null;
    this.playing = false;
    this.playerNames = {};
    this.playerScores = {};
    this.playerColors = {};
    
    // Colors
    this.powerUpColors = {
        'shield':  '#0060c0', // blue
        'armor':   '#00c9ff', // teal
        'missile': '#d00000', // red
        'life':    '#00b000', // green
        'boost':   '#f0c000', // yellow
        'defense': '#9c008c', // purple
        'bomb':    '#d0d0d0', // light gray
        'camu':    '#808080'  // camu
    };  
    
    this.colorCodes      = ['#f00000', '#0080ff', '#f0f000',
                            '#00f000', '#9000ff'];
    
    this.colorCodesFaded = ['#700000', '#004080', '#707000',
                            '#007000', '#500080'];
    
    this.colorSelected = this.getItemInt('color');
    
    // Firefox race condition with the colors div...
    var that = this;
    window.setTimeout(function(){that.createColors();}, 0);
};

Shooter.onConnect = function(success) {
    // Input
    var that = this;
    this.keys = {};
    window.onkeydown = window.onkeyup = function(e) {
        var key = e.keyCode;
        if (key !== 116 && !e.shiftKey && !e.altKey && !e.ctrlKey) {
            if (e.type === "keydown") {
                that.keys[key] = 1;
            
            } else {
                that.keys[key] = 2;
            }
            if (that.playing) {
                e.preventDefault();
                return false;
            }
        }
    };
    
    window.onblur = function(e) {
        that.keys = {};
    };
    
    $('login').onkeypress = function(e) {
        that.onLogin(e);
    };
    
    this.watch = !success;
    if (this.watch) {
        hide('loginBox');
        show('offlineBox');
        this.$.playRecording(RECORD);
        this.checkServer(HOST, PORT);
    
    } else {
        show('loginBox');
    }
};

Shooter.onInit = function(data) {
    this.width = data.s[0];
    this.height = data.s[1];
    this.maxPlayers = data.m;
    this.playerNames = data.p;
    this.playerScores = data.c;
    this.playerColors = data.o;
    this.checkRound(data);
    this.checkPlayers(data);
    this.initCanvas();
    show('sub'); 
    show(this.canvas);
};

Shooter.onUpdate = function(data) {
    this.playerNames = data.p;
    this.playerScores = data.c;
    this.playerColors = data.o;
    this.checkRound(data);
    this.checkPlayers(data);
    
    // Start tutorial
    if (this.playing && !this.tutorialStarted && this.roundGO) {
        this.tutorial(this.tutorialNext);
        this.tutorialStarted = true;
    
    } else if (!this.roundGO && $('tutorial').style.display !== 'none') {
        this.tutorialFadeOut();
    }
};

Shooter.onMessage = function(msg) {
    if (msg.playing === true) {
        this.playing = true;
        hide('loginOverlay');
    }
    if (msg.rt !== undefined) {
        this.roundStart = this.getTime();
        this.roundTime = msg.rt;
    }
};

Shooter.onInput = function() {
    var keys = {'keys': [
        this.keys[87] || this.keys[38] || 0,
        this.keys[68] || this.keys[39] || 0,
        this.keys[13] || this.keys[77] || 0,
        this.keys[65] || this.keys[37] || 0,
        this.keys[32] || 0]
    };
    
    for(var i in this.keys) {
        if (this.keys[i] === 2) {
            this.keys[i] = 0;
        }
    }
    return keys;
};

Shooter.onFlashSocket = function() {
    show('warning');
};

Shooter.onServerOnline = function() {
    $('serverStatus').innerHTML = 'SERVER ONLINE!';
    hide('watching');
    show('goplaying');
};

Shooter.onServerOffline = function() {
    $('serverStatus').innerHTML = 'SERVER OFFLINE';
    show('watching');
    hide('goplaying');
};

Shooter.onClose = function() {
    var that = this;
    window.setTimeout(function() {
        that.reloadPage();
    
    }, 50);
};

Shooter.onError = function(e) {
    var that = this;
    window.setTimeout(function() {
        that.reloadPage();
    
    }, 50);
};

Shooter.onSound = function(data) {
    if (data !== undefined) {
        this.sound.enabled = data;
    
    } else {
        this.sound.enabled = !this.sound.enabled;
    }
    this.setItem('sound', this.sound.enabled);
    $('sound').innerHTML = (this.sound.enabled ? 'DEACTIVATE' : 'ACTIVATE')
                                                  + ' SOUND';
};

Shooter.onTutorial = function(data) {
    if (data !== undefined) {
        this.tutorialEnabled = data;
    
    } else {
        this.tutorialEnabled = !this.tutorialEnabled;
    }
    this.tutorialStarted = !this.tutorialEnabled;
    this.tutorialNext = 'start';
    window.clearTimeout(this.tutorialTimers[0]);
    window.clearTimeout(this.tutorialTimers[1]);
    if (!this.tutorialStarted && this.playing) {
        this.tutorial(this.tutorialNext);
        this.tutorialStarted = true;
    }
    
    this.setItem('tutorial', this.tutorialEnabled);
    $('tut').innerHTML = (this.tutorialEnabled ? 'DISABLE' : 'RE-ENABLE')
                                                  + ' TUTORIAL';
                                                  
    if (!this.tutorialEnabled && $('tutorial').style.display !== 'none') {
        this.tutorialFadeOut();
    }
};

Shooter.onLogin = function(e) {
    e = e || window.event;
    if (e.keyCode === 13) {
        var playerName = $('login').value;
        playerName = playerName.replace(/^\s+|\s+$/g, '').replace(/\s+/g, '_');
        if (playerName.length >= 2 && playerName.length <= 12) {
            e.preventDefault();
            this.send({'player': playerName, 'color': this.colorSelected});
        }
        return false;
    }
};

Shooter.onDraw = function() {
    
    // Clear
    this.fill('#000000');
    this.bg.globalCompositeOperation = 'source-over';
    this.bg.fillRect(0, 0, this.width, this.height);
    this.bg.globalCompositeOperation = 'lighter';
    
    // Effects
    this.renderParticles();
    
    // Info
    this.renderRound();
};


// Checks ----------------------------------------------------------------------
Shooter.checkServer = function(host, port) {
    var that = this;
    var conn = new WebSocket('ws://' + host + ':' + port);
    var online = false;
    conn.onopen = function() {
        online = true;
        conn.close();
        that.onServerOnline();
    };
    
    conn.onclose = function() {
        if (!online) {
            that.onServerOffline();
        }
        window.setTimeout(function(){that.checkServer(host, port);}, 15000);
    };
};

Shooter.checkRound = function(data) {
    if (this.roundGO !== !!data.rg) {
        this.roundID = data.ri;
        this.roundStats = data.rs;
        this.roundStart = this.getTime();
        this.roundTime = data.rt; 
    }
    this.roundGO = !!data.rg;
};

Shooter.checkPlayers = function(data) {
    var count = 0;
    for(var i in data.p) {
        count++;
    }
    
    var login = $('loginOverlay');
    if (!this.playing) {
        if (count < data.m) {
            if (login.style.display !== 'block') {
                show(login);
                $('login').focus();
            }
        
        } else {
            hide(login);
        }
    }
};


// Tutorial --------------------------------------------------------------------
Shooter.tutorials = {
    'start': ['Welcome to NodeGame: Shooter!\nUse WASD or the Arrow Keys to control your ship.', 'asteroids'],
    'asteroids': ['Watch out for the asteroids!\nBigger ones will destroy you in one hit...', 'shoot'],
    'shoot': ['Press SPACE to shoot.\nTry shooting other players to score points!', 'powerups'],
    'powerups': ['See these colored orbs?\nThose are PowerUPs, try collecting some of them.', 'powerups1'],
    'powerups1': ['BLUE gives you a SHIELD, RED some HOMING MISSILES while GREEN replenishes your HEALTH.', 'powerups2'],
    'powerups2': ['The WHITE item is a BOMB. To shoot it press RETURN, hit RETURN again to make it EXPLODE!!!', 'powerups3'],
    'powerups3': ['There are even more PowerUPs...\nBOOST and INVISIBILITY are two of them.', 'finish'],
    'finish': ['But enough talk, enjoy the game!', 'done']
};

Shooter.tutorial = function(id) {
    var that = this;
    if (this.tutorialEnabled && id in Shooter.tutorials) {
        show('tutorial');
        $('tutorial').innerHTML = Shooter.tutorials[id][0].replace(/\n/g, '<br/>');
        this.tutorialFadeIn();
        
        this.tutorialNext = this.tutorials[id][1];
        this.tutorialTimers[0] = window.setTimeout(function() {that.tutorialFadeOut();}, 7500); 
        
        var showNext = function() {
            if (that.tutorialEnabled) {
                if (that.roundGO) {
                    that.tutorial(that.tutorialNext);
                
                } else {
                    that.tutorialTimers[1] = window.setTimeout(showNext, 500); 
                }
            }
        };
        this.tutorialTimers[1] = window.setTimeout(showNext, 9000); 
    
    } else if (id === 'done') {
        this.onTutorial(false);
        hide('tutorial');
    }
};


// Utility ---------------------------------------------------------------------
function initGame() {
    var path = document.location.href.split('?')[1];
    if (path && path.substr(0, 5) === 'watch') {
        Shooter.onCreate();
        Shooter.onConnect(false);
    
    } else {
        Client.connect(HOST, PORT);
    }
}

function show(id) {
    $(id).style.display = 'block';
}

function hide(id) {
    $(id).style.display = 'none';
}

function $(id) {
    return typeof id === 'string' ? document.getElementById(id) : id;
}

