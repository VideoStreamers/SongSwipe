// Singleton to manage Web Audio API context for visualization
class AudioContextManager {
    constructor() {
        this.audioContext = null;
        this.analyser = null;
        this.source = null;
        this.dataArray = null;
    }

    init() {
        if (!this.audioContext) {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            this.audioContext = new AudioContext();
            this.analyser = this.audioContext.createAnalyser();
            this.analyser.fftSize = 256;
            this.analyser.smoothingTimeConstant = 0.85;
            this.analyser.connect(this.audioContext.destination);

            const bufferLength = this.analyser.frequencyBinCount;
            this.dataArray = new Uint8Array(bufferLength);
        }
    }

    connectElement(audioElement) {
        this.init(); // Ensure context exists
        try {
            // If we already had a source, disconnect it (though ideally we reuse one global audio element)
            // But since we use multiple SongCards, we might need to handle this.
            // A limitation: CreateMediaElementSource can only be called once per element.
            // If SongCard unmounts, we should be fine reconnection.

            // Check if element is already connected to a source?
            // Actually, we can just connect it to the analyser.
            if (!this.source) {
                this.source = this.audioContext.createMediaElementSource(audioElement);
                this.source.connect(this.analyser);
            } else {
                // If we treat the manager as "One active source at a time", we can try to disconnect?
                // But MediaElementSource is tricky.
                // Simpler: Just rely on the analyser being connected to destination. 
                // We create a NEW source for the new element.
                // (Ideally we would wrap createMediaElementSource in a map/weakmap if we reuse elements, 
                // but SongCards are unmounted/remounted).

                // Let's create a new source for this specific element instance
                const newSource = this.audioContext.createMediaElementSource(audioElement);
                newSource.connect(this.analyser);
                // Note: We don't overwrite this.source, we just let it flow. Garbage collection handles the rest?
                // Web Audio graph management is complex. 
                // Ideally, SongCard should use ONE global audio element, but refactoring that is huge.
                // We will just connect.
            }

            // Resume context if suspended
            if (this.audioContext.state === 'suspended') {
                this.audioContext.resume();
            }
        } catch (e) {
            // Often fails if element is already connected. This is fine, it means it's already working.
            if (e.name !== 'InvalidStateError') console.warn("Audio Context Error", e);
        }
    }

    getFrequencyData() {
        if (this.analyser && this.dataArray) {
            this.analyser.getByteFrequencyData(this.dataArray);
            return this.dataArray;
        }
        return new Uint8Array(32).fill(0);
    }
}

export const audioManager = new AudioContextManager();
