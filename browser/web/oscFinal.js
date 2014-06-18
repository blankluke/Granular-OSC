var example = example || {};

(function () {
    "use strict";

    var freqTransform = function (value) {
        return (value * 6000) + 60;
    };

    var identityTransform = function (value) {
        return value;
    };

   var carrierSpec = {
        freq: {
            inputPath: "Main.source.freq.freq",
            transform: freqTransform
        },
        mul: {
            inputPath: "Main.source.freq.mul",
            transform: freqTransform
        }
    };

    var modulatorSpec = {
        freq: {
            inputPath: "modulator.freq.value",
            transform: freqTransform
        },
        mul: {
            inputPath: "modulator.mul",
            transform: freqTransform
        }
    };

    example.SocketSynth = function () {
        this.oscPort = new osc.WebSocketPort({
            url: "ws://localhost:8081"
        });

        this.listen();
        this.oscPort.open();

        this.oscPort.socket.onmessage = function (e) {
            console.log("message", e);
        };
        
        this.valueMap = {
            "/1/rotaryA": carrierSpec.freq,
            "/fader1/out": carrierSpec.freq,

            "/1/rotaryB": carrierSpec.mul,
            "/fader2/out": carrierSpec.mul,

            "/knobs/2": modulatorSpec.freq,
            "/fader3/out": modulatorSpec.freq,

            "/knobs/3": modulatorSpec.mul,
            "/fader4/out": modulatorSpec.mul
        };


       this.synth = flock.synth({
           synthDef: {
               id: "Main",
               ugen: "flock.ugen.granulator",
               numGrains: {
                   ugen: "flock.ugen.line",
                   start: 40,
                   end: 40,
                   duration: 1
               },
               grainDur: {
                   ugen: "flock.ugen.line",
                   start: 0.1,
                   end: 0.005,
                   duration: 10000
               },
               delayDur: 8,
               mul: 0.5,
               source: {
                       ugen: "flock.ugen.triOsc",
                       freq: {
                           ugen: "flock.ugen.sin",
                           freq: 0.01,
                           mul: 1000,
                       },
                       mul: 4
                   }
               }
        }); 

    };

    example.SocketSynth.prototype.listen = function () {
        this.oscPort.on("open", this.play.bind(this));
        this.oscPort.on("message", this.mapMessage.bind(this));
        this.oscPort.on("message", function (msg) {
            console.log("message", msg);
        });
        this.oscPort.on("close", this.pause.bind(this));
    };

    example.SocketSynth.prototype.play = function () {
        if (!flock.enviro.shared) {
            flock.init();
        }

        this.synth.play();
    };

    example.SocketSynth.prototype.pause = function () {
        this.synth.pause();
    };

    example.SocketSynth.prototype.mapMessage = function (oscMessage) {
        $("#message").text(fluid.prettyPrintJSON(oscMessage));

        var address = oscMessage.address;
        var value = oscMessage.args[0];
        var transformSpec = this.valueMap[address];

        if (transformSpec) {
            var transformed = transformSpec.transform(value);
            this.synth.set(transformSpec.inputPath, transformed);
        }
    };

}());