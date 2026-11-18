(function () {
    const SALAMANDER_BASE_URL = 'https://tonejs.github.io/audio/salamander/';
    const SALAMANDER_URLS = {
        A0: 'A0.mp3', C1: 'C1.mp3', 'D#1': 'Ds1.mp3', 'F#1': 'Fs1.mp3',
        A1: 'A1.mp3', C2: 'C2.mp3', 'D#2': 'Ds2.mp3', 'F#2': 'Fs2.mp3',
        A2: 'A2.mp3', C3: 'C3.mp3', 'D#3': 'Ds3.mp3', 'F#3': 'Fs3.mp3',
        A3: 'A3.mp3', C4: 'C4.mp3', 'D#4': 'Ds4.mp3', 'F#4': 'Fs4.mp3',
        A4: 'A4.mp3', C5: 'C5.mp3', 'D#5': 'Ds5.mp3', 'F#5': 'Fs5.mp3',
        A5: 'A5.mp3', C6: 'C6.mp3', 'D#6': 'Ds6.mp3', 'F#6': 'Fs6.mp3',
        A6: 'A6.mp3', C7: 'C7.mp3', 'D#7': 'Ds7.mp3', 'F#7': 'Fs7.mp3',
        A7: 'A7.mp3', C8: 'C8.mp3'
    };

    const voiceProfiles = {
        default: {
            volume: 0,
            reverbWet: 0.14,
            decay: 2.1
        },
        bright: {
            volume: 2,
            reverbWet: 0.1,
            decay: 1.85
        },
        soft: {
            volume: -4,
            reverbWet: 0.18,
            decay: 2.8
        },
        concertGrand: {
            volume: 1,
            reverbWet: 0.13,
            decay: 2.55
        }
    };

    class PianoAudioManager {
        constructor() {
            this.isInitialized = false;
            this.readyPromise = null;
            this.activeVoice = 'default';
            this.sampleProvider = null;
            this.toneLoaderPromise = null;
            this.samplesLoadedPromise = null;
        }

        async loadToneLibrary() {
            if (window.Tone) {
                return window.Tone;
            }

            if (!this.toneLoaderPromise) {
                this.toneLoaderPromise = new Promise((resolve, reject) => {
                    const script = document.createElement('script');
                    script.src = 'https://cdn.jsdelivr.net/npm/tone@15.0.4/build/Tone.js';
                    script.async = true;
                    script.onload = () => resolve(window.Tone);
                    script.onerror = () => reject(new Error('Failed to load Tone.js.'));
                    document.head.appendChild(script);
                });
            }

            return this.toneLoaderPromise;
        }

        async ensureReady() {
            if (this.readyPromise) {
                return this.readyPromise;
            }

            this.readyPromise = this.initialize();
            return this.readyPromise;
        }

        async initialize() {
            if (this.isInitialized) {
                return;
            }

            await this.loadToneLibrary();

            if (!window.Tone) {
                throw new Error('Tone.js is required for the audio system.');
            }

            await Tone.start();

            this.compressor = new Tone.Compressor({
                threshold: -12,
                ratio: 3,
                attack: 0.003,
                release: 0.18
            });

            this.reverb = new Tone.Reverb({
                decay: voiceProfiles.default.decay,
                wet: voiceProfiles.default.reverbWet,
                preDelay: 0.02
            });

            this.limiter = new Tone.Limiter({
                threshold: -3,
                release: 0.05
            });

            this.masterVolume = new Tone.Volume({ volume: voiceProfiles.default.volume });
            this.output = new Tone.Gain(0.85);

            this.compressor.connect(this.reverb);
            this.reverb.connect(this.limiter);
            this.limiter.connect(this.masterVolume);
            this.masterVolume.connect(this.output);
            this.output.toDestination();

            // Real recorded piano samples (Salamander Grand Piano) for an authentic sound.
            this.samplesLoadedPromise = new Promise((resolve) => {
                this.sampler = new Tone.Sampler({
                    urls: SALAMANDER_URLS,
                    baseUrl: SALAMANDER_BASE_URL,
                    release: 1,
                    onload: resolve
                });
            });

            this.sampler.connect(this.compressor);

            this.isInitialized = true;
            this.setVoice(this.activeVoice);

            // Don't block first-note playback forever if samples take a while;
            // playNote() will still await this before triggering the sound.
            await this.samplesLoadedPromise;
        }

        setVoice(voiceName) {
            this.activeVoice = voiceProfiles[voiceName] ? voiceName : 'default';
            const preset = voiceProfiles[this.activeVoice];

            if (!this.isInitialized) {
                return;
            }

            this.reverb.decay = preset.decay;
            this.reverb.wet.value = preset.reverbWet;
            this.masterVolume.volume.value = preset.volume;
        }

        setSampleLibrary(options) {
            this.sampleProvider = options || null;
            return this;
        }

        noteToFrequency(noteName) {
            const semitones = {
                C2: 36, 'C#2': 37, D2: 38, 'D#2': 39,
                E2: 40, F2: 41, 'F#2': 42, G2: 43,
                'G#2': 44, A2: 45, 'A#2': 46, B2: 47,
                C3: 48, 'C#3': 49, D3: 50, 'D#3': 51,
                E3: 52, F3: 53, 'F#3': 54, G3: 55,
                'G#3': 56, A3: 57, 'A#3': 58, B3: 59,
                C4: 60, 'C#4': 61, D4: 62, 'D#4': 63,
                E4: 64, F4: 65, 'F#4': 66, G4: 67,
                'G#4': 68, A4: 69, 'A#4': 70, B4: 71,
                C5: 72, 'C#5': 73, D5: 74, 'D#5': 75,
                E5: 76, F5: 77, 'F#5': 78, G5: 79,
                'G#5': 80, A5: 81, 'A#5': 82, B5: 83, C6: 84
            };

            const midi = semitones[noteName];
            return midi ? 440 * Math.pow(2, (midi - 69) / 12) : 440;
        }

        async playNote(noteName, velocity = 0.72, duration = '8n') {
            await this.ensureReady();
            if (this.samplesLoadedPromise) {
                await this.samplesLoadedPromise;
            }

            const normalizedVelocity = Math.min(Math.max(Number(velocity) || 0.72, 0.1), 1);
            const time = Tone.now();
            const adjustedDuration = Math.max(0.15, typeof duration === 'number' ? duration : Tone.Time(duration).toSeconds());

            if (this.sampleProvider && this.sampleProvider.player) {
                this.sampleProvider.player.triggerAttackRelease(noteName, adjustedDuration, time, normalizedVelocity);
                return { time, velocity: normalizedVelocity, provider: 'sample' };
            }

            this.sampler.triggerAttackRelease(noteName, adjustedDuration, time, normalizedVelocity);

            return { time, velocity: normalizedVelocity, provider: 'sampler' };
        }
    }

    window.TrilloAudioManager = new PianoAudioManager();
})();
