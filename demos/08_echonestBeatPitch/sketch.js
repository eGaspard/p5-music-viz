/*
  Pre-analyze a song using the Spotify Audio Analysis endpoint (formerly part of the
  Echo Nest API).

  Step 1. Find your song's Spotify track URI / ID. You can use this API endpoint:
  https://developer.spotify.com/web-api/search-item/
  
  Step 2: Get the track's audio analysis:
  https://developer.spotify.com/web-api/get-audio-analysis/

  If an audio analysis exists for the track, you'll get a JSON response
  with every beat, segment, section and more.

  Each segment contains a start time, an end time, and an array of pitches. The pitches represent pitch classes
  (i.e. C, C#, D, D#, E, F, G, G#, A, A#, B, C).
  Each item in the pitches array gets a value between 0 and 1.0 indicating
  how much of that pitch class is present in the section.

  In this example, each slice of the pie represents one `pitch class`.
  The size of the slices increases for every `beat`.
  The rotation changes at each new `section`.
 */

var echonestAnalysis;
var cnv;
var notes = new Array(12);

var audioEl;

var maxDiameter;
var rotation = 0;
var rotationInc;
var rotations;

function setup() {
  cnv = createCanvas(windowWidth, windowHeight);
  background(0);
  noStroke();
  colorMode(HSB, 255);

  maxDiameter = width;
  translate(width/2, height/2);

  rotations = [0, PI/4, PI/3, -PI/3, PI/2, -PI/2, -PI/3, PI/5, -PI/5, -PI/4];
  rotationInc = rotations[0];

  // draw keys
  for (var i = 0; i < notes.length; i++) {
    var diameter = width/8;
    var angle = TWO_PI/notes.length;
    var hue = round( map(i, 0, notes.length, 0, 255) );
    var c = color(hue, 250, 200, 255);
    notes[i] = new Arc(i, diameter, angle, c);
    notes[i].draw();
  }

  loadJSON('../../music/Alaclair_Ensemble_-_Twit_JournalisT.json', gotData);
  audioEl = createAudio('../../music/Alaclair_Ensemble_-_14_-_Twit_JournalisT.mp3');
}

function draw() {
  background(0, 0, 0, 20);
  translate(width/2, height/2);

  rotate(rotation += rotationInc);

  for (var i = 0; i < notes.length; i++) {
    notes[i].draw(); 
  }

}

// callback from loadJSON
function gotData(data) {
  echonestAnalysis = data;

  scheduleSegments(data.segments);

  scheduleBeats(data.beats);

  scheduleSections(data.bars);

  audioEl.play();
}


/////////// schedule stuff based on json data
function scheduleSegments(segments) {

  for (var i = 0; i < segments.length; i++) {
    var seg = segments[i];
    if (seg.confidence > 0.01) {
      var startTime = seg.start;
      var endTime = seg.start + seg.duration;
      var pitches = seg.pitches;

      audioEl.addCue(startTime, triggerNote, pitches);
      audioEl.addCue(endTime, releaseNote);

    }
  }
}

function scheduleBeats(beats) {
  for (var i = 0; i < beats.length; i++) {
    var beat = beats[i];
    var startTime = beat.start;

    audioEl.addCue(startTime, triggerBeat);
  }
}

function scheduleSections(sections) {
  for (var i = 0; i < sections.length; i++) {
    var section = sections[i];
    var startTime = section.start;
    audioEl.addCue(startTime, changeRotation, i);
  }
}


///////// callbacks from timeline events
function triggerNote(pitches) {
  var pitchThreshold = 0.8;
  for (var i = 0; i < notes.length; i++) {
    if (pitches[i] > pitchThreshold) {
      notes[i].triggerNote(pitches[i]);
    }
  }
}

function releaseNote() {
  for (var i = 0; i < notes.length; i++) {
    notes[i].releaseNote();
  }
}

function triggerBeat() {
  for (var i = 0; i < notes.length; i++) {
    notes[i].triggerBeat();
  }
}

function changeRotation(index) {
  rotationInc = rotations[index % rotations.length];
}



var Arc = function(index, diameter, angle, c) {
  this.index = index;
  this.diameter = diameter;
  this.extraRad = 1;

  this.angle = angle;
  this.color = c;
  this.alpha = this.color.levels[3];
  this.decayRate = 0.95;
}

Arc.prototype.triggerNote = function(val) {
  this.alpha = 255 * val;
  this.decayRate = 1 + val/25;
  this.color.levels[3] = this.alpha;
}

Arc.prototype.releaseNote = function() {
  this.decayRate = 0.9;
}

Arc.prototype.triggerBeat = function() {
  this.extraRad = 100;
  this.radRate = 1.3;
}

Arc.prototype.draw = function() {
  this.alpha *= this.decayRate;
  this.extraRad *= this.radRate * this.decayRate;
  this.extraRad = constrain(this.extraRad, 0.01, maxDiameter);

  this.radRate *= 0.98;
  this.radRate = constrain(this.radRate, 0.9, 1.5);

  this.color.levels[3] = this.alpha;
  fill(this.color);

  var d = this.diameter + this.extraRad;

  arc(0, 0, d, d, this.index*this.angle, (this.index*this.angle) + this.angle);
}